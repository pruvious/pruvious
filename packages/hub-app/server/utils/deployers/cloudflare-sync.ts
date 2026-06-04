import { execa, type ResultPromise } from 'execa'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { appendDeployLogChunk, writeDeployLog } from '../deployLog'
import { extendSyncLock } from '../syncLock'
import { runProjectSync } from './runProjectSync'

export interface CloudflareSyncInput {
  deploymentId: number
  targetId: number
  projectPath: string
  cloudflareConfig: {
    accountId: string
    workerName: string
    d1Database?: { name: string; id: string } | null
  }
  apiToken: string
  envVars: { key: string; value: string }[]
  buildCommand: { cmd: string; args: string[] }
  syncLockTtlMs: number
  onSnapshot?: (snapshot: SyncSnapshot) => Promise<{ backupId?: number } | void>
}

export interface CloudflareSyncResult {
  preSyncSqlPath: string
  postSyncSqlPath: string
}

export interface SyncSnapshot {
  kind: 'pre-sync' | 'post-sync'
  sqlPath: string
  sizeBytes: number
}

export async function runHubSideSync(input: CloudflareSyncInput): Promise<CloudflareSyncResult> {
  const {
    deploymentId,
    targetId,
    projectPath,
    cloudflareConfig,
    apiToken,
    envVars,
    buildCommand,
    syncLockTtlMs,
    onSnapshot,
  } = input

  if (!cloudflareConfig.d1Database) {
    throw new Error('Hub-side sync requires a D1 database to be configured on the target')
  }

  const dbName = cloudflareConfig.d1Database.name
  const cfEnv: NodeJS.ProcessEnv = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: apiToken,
    CLOUDFLARE_ACCOUNT_ID: cloudflareConfig.accountId,
  }

  const tmp = await mkdtemp(join(tmpdir(), 'pruvious-hub-sync-'))
  const liveSqlPath = join(tmp, 'live.sql')
  const workSqlitePath = join(tmp, 'work.sqlite')
  const syncedSqlPath = join(tmp, 'synced.sql')

  let preSyncBackupId: number | undefined

  const heartbeat = setInterval(
    () => {
      void extendSyncLock(targetId, deploymentId, syncLockTtlMs).catch(() => {})
    },
    Math.max(60_000, Math.floor(syncLockTtlMs / 2)),
  )

  try {
    await writeDeployLog(deploymentId, `[hub] exporting D1 "${dbName}" to local SQL dump`)
    await runStreamed(
      deploymentId,
      'npx',
      ['--yes', 'wrangler@latest', 'd1', 'export', dbName, '--remote', '--output', liveSqlPath],
      { cwd: projectPath, env: cfEnv },
    )

    const preSnapshotSize = await fileSize(liveSqlPath)
    const preResult = await onSnapshot?.({ kind: 'pre-sync', sqlPath: liveSqlPath, sizeBytes: preSnapshotSize })
    preSyncBackupId = preResult?.backupId

    await writeDeployLog(deploymentId, '[hub] applying D1 dump to local SQLite working copy')
    await applySqlToSqliteFile(liveSqlPath, workSqlitePath)

    await runProjectSync({
      deploymentId,
      projectPath,
      sqlitePath: workSqlitePath,
      buildCommand,
      envVars,
      timeoutMs: syncLockTtlMs,
    })

    await writeDeployLog(deploymentId, '[hub] dumping synced SQLite working copy to SQL')
    await dumpSqliteFileToSql(workSqlitePath, syncedSqlPath)

    const postSnapshotSize = await fileSize(syncedSqlPath)
    await onSnapshot?.({ kind: 'post-sync', sqlPath: syncedSqlPath, sizeBytes: postSnapshotSize })

    // Destructive window: from here until the synced apply succeeds, D1 may be
    // partially wiped. Any failure triggers a rollback that restores live.sql.
    try {
      const liveTableNames = await parseTableNamesFromDump(liveSqlPath)
      if (liveTableNames.length > 0) {
        await writeDeployLog(
          deploymentId,
          `[hub] dropping ${liveTableNames.length} existing D1 table(s) before applying synced schema`,
        )
        const dropSql = [...liveTableNames]
          .reverse()
          .map((t) => `DROP TABLE IF EXISTS "${t}";`)
          .join(' ')
        await runStreamed(
          deploymentId,
          'npx',
          ['--yes', 'wrangler@latest', 'd1', 'execute', dbName, '--remote', '--command', dropSql, '--yes'],
          { cwd: projectPath, env: cfEnv },
        )
      } else {
        await writeDeployLog(deploymentId, '[hub] D1 is empty, skipping pre-import table drops')
      }

      await writeDeployLog(deploymentId, `[hub] applying synced dump to D1 "${dbName}"`)
      await runStreamed(
        deploymentId,
        'npx',
        ['--yes', 'wrangler@latest', 'd1', 'execute', dbName, '--remote', `--file=${syncedSqlPath}`, '--yes'],
        { cwd: projectPath, env: cfEnv },
      )
    } catch (syncApplyError: any) {
      const originalMessage = syncApplyError?.shortMessage ?? syncApplyError?.message ?? String(syncApplyError)
      await writeDeployLog(
        deploymentId,
        `[hub] sync apply failed - rolling back D1 to pre-sync snapshot: ${originalMessage}`,
      )
      try {
        await rollbackD1ToLiveSnapshot({ deploymentId, projectPath, dbName, cfEnv, liveSqlPath })
        await writeDeployLog(deploymentId, '[hub] rollback succeeded - D1 restored to pre-sync state')
      } catch (rollbackError: any) {
        const rollbackMessage = rollbackError?.shortMessage ?? rollbackError?.message ?? String(rollbackError)
        const restoreHint = preSyncBackupId
          ? `Use the pre-sync Backup row (id=${preSyncBackupId}) from the dashboard to restore.`
          : `Pre-sync snapshot is at ${liveSqlPath} (volatile, may be reaped on reboot). To restore manually: npx wrangler d1 execute ${dbName} --remote --file=${liveSqlPath}.`
        await writeDeployLog(
          deploymentId,
          `[hub] CRITICAL: rollback failed; D1 may be in an inconsistent state. ${restoreHint} Rollback error: ${rollbackMessage}`,
        )
        throw new Error(
          `Sync apply failed and rollback failed. Original: ${originalMessage}. Rollback: ${rollbackMessage}.${preSyncBackupId ? ` Pre-sync backup id: ${preSyncBackupId}.` : ` Manual restore file: ${liveSqlPath}.`}`,
        )
      }
      throw new Error(`Sync apply failed and D1 was rolled back to the pre-sync state: ${originalMessage}`)
    }

    return { preSyncSqlPath: liveSqlPath, postSyncSqlPath: syncedSqlPath }
  } finally {
    clearInterval(heartbeat)
  }
}

async function rollbackD1ToLiveSnapshot(args: {
  deploymentId: number
  projectPath: string
  dbName: string
  cfEnv: NodeJS.ProcessEnv
  liveSqlPath: string
}): Promise<void> {
  const { deploymentId, projectPath, dbName, cfEnv, liveSqlPath } = args

  const currentTables = await listD1Tables(projectPath, dbName, cfEnv)
  if (currentTables.length > 0) {
    await writeDeployLog(deploymentId, `[hub] rollback: dropping ${currentTables.length} table(s) currently on D1`)
    const dropSql = currentTables.map((t) => `DROP TABLE IF EXISTS "${t}";`).join(' ')
    await runStreamed(
      deploymentId,
      'npx',
      ['--yes', 'wrangler@latest', 'd1', 'execute', dbName, '--remote', '--command', dropSql, '--yes'],
      { cwd: projectPath, env: cfEnv },
    )
  }

  await writeDeployLog(deploymentId, '[hub] rollback: re-applying live snapshot')
  await runStreamed(
    deploymentId,
    'npx',
    ['--yes', 'wrangler@latest', 'd1', 'execute', dbName, '--remote', `--file=${liveSqlPath}`, '--yes'],
    { cwd: projectPath, env: cfEnv },
  )
}

async function listD1Tables(projectPath: string, dbName: string, cfEnv: NodeJS.ProcessEnv): Promise<string[]> {
  const result = await execa(
    'npx',
    [
      '--yes',
      'wrangler@latest',
      'd1',
      'execute',
      dbName,
      '--remote',
      '--command',
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      '--json',
      '--yes',
    ],
    { cwd: projectPath, env: cfEnv, reject: false },
  )

  if (result.failed || result.exitCode !== 0) {
    throw new Error(
      `Failed to list D1 tables for rollback: ${result.stderr ?? result.stdout ?? `exit ${result.exitCode}`}`,
    )
  }

  try {
    const parsed = JSON.parse(String(result.stdout)) as Array<{ results?: Array<{ name: string }> }>
    const rows = parsed?.[0]?.results ?? []
    return rows.map((r) => r.name).filter(Boolean)
  } catch (err: any) {
    throw new Error(`Could not parse D1 table list JSON: ${err?.message ?? err}`)
  }
}

// Dynamic so the bundler doesn't try to inline the native module.
async function loadBetterSqlite3(): Promise<any> {
  const mod = await import('better-sqlite3' as any)
  return mod.default ?? mod
}

async function applySqlToSqliteFile(sqlPath: string, sqlitePath: string): Promise<void> {
  const BetterSqlite3 = await loadBetterSqlite3()
  await rm(sqlitePath, { force: true })
  const sql = await readFile(sqlPath, 'utf8')
  const db = new BetterSqlite3(sqlitePath)
  try {
    // Force `sqlite_sequence` to exist so the dump's `DELETE FROM sqlite_sequence` doesn't fail.
    db.exec(
      'CREATE TABLE IF NOT EXISTS _pruvious_force_sequence (id INTEGER PRIMARY KEY AUTOINCREMENT); DROP TABLE _pruvious_force_sequence;',
    )

    if (sql.trim()) {
      db.exec(sql)
    }
  } finally {
    db.close()
  }
}

async function dumpSqliteFileToSql(sqlitePath: string, sqlPath: string): Promise<void> {
  const BetterSqlite3 = await loadBetterSqlite3()
  const db = new BetterSqlite3(sqlitePath, { readonly: true })
  try {
    const tables = db
      .prepare(`select name, sql from sqlite_master where type = 'table' and name not like 'sqlite_%'`)
      .all() as { name: string; sql: string }[]

    // D1's import endpoint does not actually defer FK checks across statements
    // despite the PRAGMA at the top - wrangler's own `d1 export` sorts tables
    // so referenced tables come first. Match that behaviour.
    const ordered = topoSortTables(tables)

    const lines: string[] = ['PRAGMA defer_foreign_keys=TRUE;']

    for (const { name, sql: ddl } of ordered) {
      if (ddl) {
        const withIfNotExists = ddl.replace(/^CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS\b)/i, 'CREATE TABLE IF NOT EXISTS ')
        lines.push(`${withIfNotExists};`)
      }

      const rows = db.prepare(`select * from "${name}"`).all() as Record<string, unknown>[]
      for (const row of rows) {
        const cols = Object.keys(row)
        const values = cols.map((c) => sqliteLiteral(row[c]))
        lines.push(`INSERT INTO "${name}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES(${values.join(',')});`)
      }
    }

    const sequenceRows = db
      .prepare(`select name from sqlite_master where type = 'table' and name = 'sqlite_sequence'`)
      .all() as { name: string }[]
    if (sequenceRows.length > 0) {
      const seqEntries = db.prepare(`select name, seq from sqlite_sequence`).all() as { name: string; seq: number }[]
      if (seqEntries.length > 0) {
        lines.push('DELETE FROM sqlite_sequence;')
        for (const { name, seq } of seqEntries) {
          lines.push(`INSERT INTO "sqlite_sequence" ("name","seq") VALUES('${name.replace(/'/g, "''")}',${seq});`)
        }
      }
    }

    const indexes = db
      .prepare(
        `select sql from sqlite_master where type = 'index' and name not like 'sqlite_%' and sql is not null order by name`,
      )
      .all() as { sql: string }[]

    for (const { sql: ddl } of indexes) {
      lines.push(`${ddl};`)
    }

    const { writeFile } = await import('node:fs/promises')
    await writeFile(sqlPath, lines.join('\n'), 'utf8')
  } finally {
    db.close()
  }
}

function topoSortTables(tables: { name: string; sql: string }[]): { name: string; sql: string }[] {
  const nameSet = new Set(tables.map((t) => t.name))
  const deps = new Map<string, Set<string>>()

  for (const t of tables) {
    const refs = new Set<string>()
    for (const match of (t.sql ?? '').matchAll(
      /foreign\s+key\s*\([^)]+\)\s*references\s*["'`]?([A-Za-z_][\w]*)["'`]?/gi,
    )) {
      const ref = match[1]
      if (ref && ref !== t.name && nameSet.has(ref)) {
        refs.add(ref)
      }
    }
    deps.set(t.name, refs)
  }

  const visited = new Set<string>()
  const onStack = new Set<string>()
  const ordered: { name: string; sql: string }[] = []
  const byName = new Map(tables.map((t) => [t.name, t] as const))
  const startOrder = [...tables].map((t) => t.name).sort()

  const visit = (name: string) => {
    if (visited.has(name)) {
      return
    }
    if (onStack.has(name)) {
      // FK cycle - emit the remaining nodes as-is; defer_foreign_keys covers it.
      return
    }
    onStack.add(name)
    const refs = [...(deps.get(name) ?? [])].sort()
    for (const ref of refs) {
      visit(ref)
    }
    onStack.delete(name)
    visited.add(name)
    const node = byName.get(name)
    if (node) {
      ordered.push(node)
    }
  }

  for (const name of startOrder) {
    visit(name)
  }

  return ordered
}

async function parseTableNamesFromDump(sqlPath: string): Promise<string[]> {
  let contents: string
  try {
    contents = await readFile(sqlPath, 'utf8')
  } catch {
    return []
  }

  const names: string[] = []
  for (const match of contents.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?([A-Za-z_][\w]*)["']?/gi)) {
    if (match[1]) {
      names.push(match[1])
    }
  }
  return names
}

function sqliteLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL'
  }
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0'
  }
  if (value instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(value))) {
    const buf = value instanceof Uint8Array ? Buffer.from(value) : (value as Buffer)
    return `X'${buf.toString('hex')}'`
  }
  return `'${String(value).replace(/'/g, "''")}'`
}

async function fileSize(path: string): Promise<number> {
  try {
    const s = await stat(path)
    return s.size
  } catch {
    return 0
  }
}

async function runStreamed(
  deploymentId: number,
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv },
): Promise<void> {
  const child: ResultPromise = execa(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdout: 'pipe',
    stderr: 'pipe',
    reject: false,
  })

  child.stdout?.on('data', (data) => void appendDeployLogChunk(deploymentId, data.toString('utf8')))
  child.stderr?.on('data', (data) => void appendDeployLogChunk(deploymentId, data.toString('utf8')))

  const result = await child

  if (result.failed || result.exitCode !== 0) {
    throw new Error(`\`${command} ${args.join(' ')}\` exited with code ${result.exitCode}`)
  }
}
