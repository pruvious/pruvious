import { isNumber } from '@pruvious/utils'
import { execa, type ResultPromise } from 'execa'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import { pipeline } from 'node:stream/promises'
import { createGzip, createGunzip } from 'node:zlib'
import { dirname, join, relative } from 'pathe'
import { getDecryptedSecret } from '../getDecryptedSecret'

interface CloudflareApiToken {
  id: number
}

interface CloudflareBackupConfig {
  accountId: string
  workerName: string
  apiToken: number | CloudflareApiToken
  d1Database?: { name: string; id: string } | null
  r2Bucket?: string | null
}

export type BackupType = 'db' | 'uploads' | 'full'

export interface CloudflareBackupInput {
  type: BackupType
  artifactDir: string
  cloudflareConfig: CloudflareBackupConfig
  writeLog: (line: string) => Promise<void>
  appendLogChunk: (chunk: string) => Promise<void>
}

export interface CloudflareBackupResult {
  success: boolean
  error?: string
}

interface R2Object {
  key: string
  size: number
  etag: string
}

interface BackupManifest {
  type: BackupType
  createdAt: number
  d1?: { databaseName: string; databaseId: string; file: string }
  uploads?: { bucket: string; objects: R2Object[]; directory: string }
}

export async function backupCloudflare(input: CloudflareBackupInput): Promise<CloudflareBackupResult> {
  const { type, artifactDir, cloudflareConfig, writeLog, appendLogChunk } = input

  await writeLog(`[hub] backup target: cloudflare worker "${cloudflareConfig.workerName}"`)
  await writeLog(`[hub] backup account: ${cloudflareConfig.accountId}`)
  await writeLog(`[hub] backup type: ${type}`)

  try {
    const apiTokenId = isNumber(cloudflareConfig.apiToken) ? cloudflareConfig.apiToken : cloudflareConfig.apiToken.id
    const apiToken = await getDecryptedSecret(apiTokenId)

    const manifest: BackupManifest = { type, createdAt: Date.now() }

    if (type === 'db' || type === 'full') {
      if (!cloudflareConfig.d1Database) {
        return { success: false, error: 'No D1 database configured on this target' }
      }
      const file = await dumpD1(cloudflareConfig, apiToken, artifactDir, appendLogChunk, writeLog)
      manifest.d1 = {
        databaseName: cloudflareConfig.d1Database.name,
        databaseId: cloudflareConfig.d1Database.id,
        file: relative(artifactDir, file),
      }
    }

    if (type === 'uploads' || type === 'full') {
      if (!cloudflareConfig.r2Bucket) {
        return { success: false, error: 'No R2 UPLOADS bucket configured on this target' }
      }
      const objects = await mirrorR2(cloudflareConfig, apiToken, artifactDir, writeLog)
      manifest.uploads = { bucket: cloudflareConfig.r2Bucket, objects, directory: 'uploads' }
    }

    await writeFile(join(artifactDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
    await writeLog('[hub] backup succeeded')
    return { success: true }
  } catch (error: any) {
    const message = error?.shortMessage ?? error?.message ?? String(error)
    await writeLog(`[hub] backup failed: ${message}`)
    return { success: false, error: message }
  }
}

export interface CloudflareRestoreInput {
  artifactDir: string
  cloudflareConfig: CloudflareBackupConfig
  wipeMissingObjects: boolean
  writeLog: (line: string) => Promise<void>
  appendLogChunk: (chunk: string) => Promise<void>
}

export interface CloudflareRestoreResult {
  success: boolean
  error?: string
}

export async function restoreCloudflare(input: CloudflareRestoreInput): Promise<CloudflareRestoreResult> {
  const { artifactDir, cloudflareConfig, wipeMissingObjects, writeLog, appendLogChunk } = input

  await writeLog(`[hub] restore target: cloudflare worker "${cloudflareConfig.workerName}"`)

  try {
    const apiTokenId = isNumber(cloudflareConfig.apiToken) ? cloudflareConfig.apiToken : cloudflareConfig.apiToken.id
    const apiToken = await getDecryptedSecret(apiTokenId)

    const manifestText = await readFile(join(artifactDir, 'manifest.json'), 'utf8').catch(() => null)
    if (!manifestText) {
      return { success: false, error: 'Backup manifest not found - artifact may have been deleted' }
    }
    const manifest = JSON.parse(manifestText) as BackupManifest

    if (manifest.d1) {
      if (!cloudflareConfig.d1Database) {
        return { success: false, error: 'No D1 database configured on this target' }
      }
      await restoreD1(manifest.d1.file, cloudflareConfig, apiToken, artifactDir, appendLogChunk, writeLog)
    }

    if (manifest.uploads) {
      if (!cloudflareConfig.r2Bucket) {
        return { success: false, error: 'No R2 UPLOADS bucket configured on this target' }
      }
      await restoreR2(cloudflareConfig, apiToken, artifactDir, manifest.uploads, wipeMissingObjects, writeLog)
    }

    await writeLog('[hub] restore succeeded')
    return { success: true }
  } catch (error: any) {
    const message = error?.shortMessage ?? error?.message ?? String(error)
    await writeLog(`[hub] restore failed: ${message}`)
    return { success: false, error: message }
  }
}

async function dumpD1(
  cf: CloudflareBackupConfig,
  apiToken: string,
  artifactDir: string,
  appendLogChunk: (chunk: string) => Promise<void>,
  writeLog: (line: string) => Promise<void>,
): Promise<string> {
  const sqlPath = join(artifactDir, 'd1.sql')
  const gzPath = `${sqlPath}.gz`
  await writeLog(`[hub] exporting D1 database "${cf.d1Database!.name}"`)

  await runStreamed(
    appendLogChunk,
    'npx',
    ['--yes', 'wrangler@latest', 'd1', 'export', cf.d1Database!.name, '--remote', '--output', sqlPath],
    { env: cfEnv(cf, apiToken) },
  )

  await pipeline(createReadStream(sqlPath), createGzip(), createWriteStream(gzPath))
  await execa('rm', ['-f', sqlPath])
  await writeLog(`[hub] wrote ${relative(artifactDir, gzPath)}`)
  return gzPath
}

async function restoreD1(
  relativeFile: string,
  cf: CloudflareBackupConfig,
  apiToken: string,
  artifactDir: string,
  appendLogChunk: (chunk: string) => Promise<void>,
  writeLog: (line: string) => Promise<void>,
): Promise<void> {
  const gzPath = join(artifactDir, relativeFile)
  const sqlPath = gzPath.replace(/\.gz$/, '')
  await writeLog(`[hub] decompressing ${relativeFile}`)
  await pipeline(createReadStream(gzPath), createGunzip(), createWriteStream(sqlPath))

  // `wrangler d1 export` emits CREATE TABLE IF NOT EXISTS + INSERTs against an empty DB.
  // Applied on top of existing data the inserts hit UNIQUE/CHECK violations. The fix is
  // to drop the soon-to-be-recreated tables first. We cannot prepend the DROPs to the
  // dump file because `d1 execute --file` routes through D1's import endpoint which only
  // accepts dump-shaped SQL; arbitrary DDL gets silently rejected ("no such table"). So
  // run the DROPs as a separate `--command` against the regular query endpoint, then
  // apply the unmodified dump via the import endpoint.
  const dumpContents = await readFile(sqlPath, 'utf8')
  const tableNames: string[] = []
  for (const match of dumpContents.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?([A-Za-z_][\w]*)["']?/gi)) {
    if (match[1]) {
      tableNames.push(match[1])
    }
  }

  if (tableNames.length > 0) {
    await writeLog(`[hub] dropping ${tableNames.length} existing table(s) before restore`)
    // Reverse creation order so child tables (with FKs) drop before their parents.
    const dropSql = [...tableNames]
      .reverse()
      .map((t) => `DROP TABLE IF EXISTS "${t}";`)
      .join(' ')
    await runStreamed(
      appendLogChunk,
      'npx',
      ['--yes', 'wrangler@latest', 'd1', 'execute', cf.d1Database!.name, '--remote', '--command', dropSql, '--yes'],
      { env: cfEnv(cf, apiToken) },
    )
  }

  await writeLog(`[hub] applying D1 dump to "${cf.d1Database!.name}"`)
  await runStreamed(
    appendLogChunk,
    'npx',
    ['--yes', 'wrangler@latest', 'd1', 'execute', cf.d1Database!.name, '--remote', `--file=${sqlPath}`, '--yes'],
    { env: cfEnv(cf, apiToken) },
  )
  await execa('rm', ['-f', sqlPath])
}

async function mirrorR2(
  cf: CloudflareBackupConfig,
  apiToken: string,
  artifactDir: string,
  writeLog: (line: string) => Promise<void>,
): Promise<R2Object[]> {
  const uploadsDir = join(artifactDir, 'uploads')
  await mkdir(uploadsDir, { recursive: true })

  const objects: R2Object[] = []
  let cursor: string | undefined

  while (true) {
    const params = new URLSearchParams()
    if (cursor) {
      params.set('cursor', cursor)
    }
    const url = `https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/r2/buckets/${cf.r2Bucket}/objects${
      params.size > 0 ? `?${params.toString()}` : ''
    }`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } })
    if (!res.ok) {
      throw new Error(`R2 list ${res.status} ${res.statusText}`)
    }
    const json = (await res.json()) as { result?: any[]; result_info?: { cursor?: string } }
    const batch = json.result ?? []
    for (const entry of batch) {
      const key = String(entry.key ?? entry.Key ?? '')
      if (!key) {
        continue
      }
      const dest = join(uploadsDir, key)
      await mkdir(dirname(dest), { recursive: true })
      const getRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/r2/buckets/${cf.r2Bucket}/objects/${encodeURI(key)}`,
        { headers: { Authorization: `Bearer ${apiToken}` } },
      )
      if (!getRes.ok || !getRes.body) {
        throw new Error(`R2 get "${key}" ${getRes.status} ${getRes.statusText}`)
      }
      const buf = Buffer.from(await getRes.arrayBuffer())
      await writeFile(dest, buf)
      objects.push({
        key,
        size: Number(entry.size ?? entry.Size ?? buf.byteLength),
        etag: String(entry.etag ?? entry.ETag ?? ''),
      })
    }
    cursor = json.result_info?.cursor
    if (!cursor) {
      break
    }
  }

  await writeLog(`[hub] mirrored ${objects.length} R2 object(s) from "${cf.r2Bucket}"`)
  return objects
}

async function restoreR2(
  cf: CloudflareBackupConfig,
  apiToken: string,
  artifactDir: string,
  uploads: NonNullable<BackupManifest['uploads']>,
  wipeMissingObjects: boolean,
  writeLog: (line: string) => Promise<void>,
): Promise<void> {
  const uploadsDir = join(artifactDir, uploads.directory)
  const manifestKeys = new Set(uploads.objects.map((o) => o.key))

  for (const obj of uploads.objects) {
    const file = join(uploadsDir, obj.key)
    const data = await readFile(file)
    const putRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/r2/buckets/${cf.r2Bucket}/objects/${encodeURI(obj.key)}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${apiToken}` }, body: data },
    )
    if (!putRes.ok) {
      throw new Error(`R2 put "${obj.key}" ${putRes.status} ${putRes.statusText}`)
    }
  }
  await writeLog(`[hub] uploaded ${uploads.objects.length} R2 object(s) to "${cf.r2Bucket}"`)

  if (!wipeMissingObjects) {
    return
  }

  let cursor: string | undefined
  let deleted = 0
  while (true) {
    const params = new URLSearchParams()
    if (cursor) {
      params.set('cursor', cursor)
    }
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/r2/buckets/${cf.r2Bucket}/objects${
        params.size > 0 ? `?${params.toString()}` : ''
      }`,
      { headers: { Authorization: `Bearer ${apiToken}` } },
    )
    if (!res.ok) {
      throw new Error(`R2 list ${res.status} ${res.statusText}`)
    }
    const json = (await res.json()) as { result?: any[]; result_info?: { cursor?: string } }
    for (const entry of json.result ?? []) {
      const key = String(entry.key ?? entry.Key ?? '')
      if (!key || manifestKeys.has(key)) {
        continue
      }
      const delRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/r2/buckets/${cf.r2Bucket}/objects/${encodeURI(key)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${apiToken}` } },
      )
      if (!delRes.ok && delRes.status !== 404) {
        throw new Error(`R2 delete "${key}" ${delRes.status} ${delRes.statusText}`)
      }
      deleted++
    }
    cursor = json.result_info?.cursor
    if (!cursor) {
      break
    }
  }
  if (deleted > 0) {
    await writeLog(`[hub] removed ${deleted} object(s) not in the backup manifest`)
  }
}

function cfEnv(cf: CloudflareBackupConfig, apiToken: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    CLOUDFLARE_API_TOKEN: apiToken,
    CLOUDFLARE_ACCOUNT_ID: cf.accountId,
  }
}

async function runStreamed(
  appendLogChunk: (chunk: string) => Promise<void>,
  command: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv },
): Promise<void> {
  const child: ResultPromise = execa(command, args, {
    env: options.env,
    stdout: 'pipe',
    stderr: 'pipe',
    reject: false,
  })

  child.stdout?.on('data', (data) => void appendLogChunk(data.toString('utf8')))
  child.stderr?.on('data', (data) => void appendLogChunk(data.toString('utf8')))

  const result = await child

  if (result.failed || result.exitCode !== 0) {
    throw new Error(`\`${command} ${args.join(' ')}\` exited with code ${result.exitCode}`)
  }
}
