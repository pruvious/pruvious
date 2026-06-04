import { isNumber } from '@pruvious/utils'
import { execa, type ResultPromise } from 'execa'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { appendDeployLogChunk, writeDeployLog } from '../deployLog'
import { getDecryptedSecret } from '../getDecryptedSecret'
import { readGitCommit } from '../git'
import { runHubSideSync } from './cloudflare-sync'

export type CloudflareSyncMode = 'in-worker' | 'hub-side'

export interface CloudflareDeployInput {
  deploymentId: number
  projectPath: string
  cloudflareConfig: {
    accountId: string
    workerName: string
    apiToken: number | { id: number }
    d1Database?: { name: string; id: string } | null
    d1Cache?: { name: string; id: string } | null
    d1Queue?: { name: string; id: string } | null
    d1Logs?: { name: string; id: string } | null
    r2Bucket?: string | null
    kvNamespace?: string | null
  }
  envVars: { key: string; value: string; isSecret: boolean }[]
  buildCommand: { cmd: string; args: string[] }
  syncMode?: CloudflareSyncMode
  /** Required when `syncMode === 'hub-side'`. */
  targetId?: number
  syncLockTtlMs?: number
  onSyncSnapshot?: (snapshot: {
    kind: 'pre-sync' | 'post-sync'
    sqlPath: string
    sizeBytes: number
  }) => Promise<{ backupId?: number } | void>
  hooks?: {
    postBuild?: () => Promise<void>
  }
}

export interface CloudflareDeployResult {
  commit: string | null
  success: boolean
  error?: string
}

/**
 * Builds the Pruvious project for the Cloudflare Workers preset and runs `wrangler deploy`
 * with a hub-managed `wrangler.hub.toml` config (so the project's own `wrangler.toml`, if any,
 * is left alone).
 */
export async function deployToCloudflare(input: CloudflareDeployInput): Promise<CloudflareDeployResult> {
  const {
    deploymentId,
    projectPath,
    cloudflareConfig,
    envVars,
    buildCommand,
    hooks,
    syncMode = 'in-worker',
    targetId,
    syncLockTtlMs = 15 * 60_000,
    onSyncSnapshot,
  } = input

  if (!existsSync(projectPath)) {
    return { commit: null, success: false, error: `Project path does not exist: ${projectPath}` }
  }

  if (!existsSync(join(projectPath, 'package.json'))) {
    return { commit: null, success: false, error: `No package.json at ${projectPath}` }
  }

  await writeDeployLog(deploymentId, `[hub] target: cloudflare worker "${cloudflareConfig.workerName}"`)
  await writeDeployLog(deploymentId, `[hub] account: ${cloudflareConfig.accountId}`)

  const commit = await readGitCommit(projectPath)
  if (commit) {
    await writeDeployLog(deploymentId, `[hub] commit: ${commit}`)
  }

  const plainVars = envVars.filter((v) => !v.isSecret)
  const secretVars = envVars.filter((v) => v.isSecret)

  try {
    const apiTokenId = isNumber(cloudflareConfig.apiToken) ? cloudflareConfig.apiToken : cloudflareConfig.apiToken.id
    const apiToken = await getDecryptedSecret(apiTokenId)

    const buildEnv: NodeJS.ProcessEnv = {
      ...process.env,
      NITRO_PRESET: 'cloudflare-module',
      CLOUDFLARE_API_TOKEN: apiToken,
      CLOUDFLARE_ACCOUNT_ID: cloudflareConfig.accountId,
    }

    for (const { key, value } of envVars) {
      buildEnv[key] = value
    }

    if (syncMode === 'hub-side') {
      if (targetId === undefined) {
        throw new Error('Hub-side sync requires a `targetId` so the deploy lock can be heartbeat-extended.')
      }
      await writeDeployLog(deploymentId, '[hub] running hub-side schema sync (syncMode=hub-side)')
      await runHubSideSync({
        deploymentId,
        targetId,
        projectPath,
        cloudflareConfig,
        apiToken,
        envVars: envVars.map(({ key, value }) => ({ key, value })),
        buildCommand,
        syncLockTtlMs,
        onSnapshot: onSyncSnapshot,
      })
    }

    await writeDeployLog(deploymentId, `[hub] running build: ${buildCommand.cmd} ${buildCommand.args.join(' ')}`)
    await runStreamed(deploymentId, buildCommand.cmd, buildCommand.args, { cwd: projectPath, env: buildEnv })

    if (hooks?.postBuild) {
      await hooks.postBuild()
    }

    const configPath = join(projectPath, '.output', 'wrangler.hub.toml')
    await writeHubWranglerConfig(configPath, cloudflareConfig, plainVars, syncMode === 'hub-side')
    await writeDeployLog(deploymentId, '[hub] wrote .output/wrangler.hub.toml')

    await writeDeployLog(deploymentId, '[hub] running wrangler deploy')
    await runStreamed(
      deploymentId,
      'npx',
      ['--yes', 'wrangler@latest', 'deploy', '--config', '.output/wrangler.hub.toml'],
      { cwd: projectPath, env: buildEnv },
    )

    if (envVars.length > 0) {
      try {
        const existing = await listWorkerSecrets(cloudflareConfig.accountId, cloudflareConfig.workerName, apiToken)
        const desired = new Set(secretVars.map((v) => v.key))
        const stale = existing.filter((name) => !desired.has(name))

        if (stale.length > 0) {
          await writeDeployLog(
            deploymentId,
            `[hub] removing ${stale.length} stale worker secret(s): ${stale.join(', ')}`,
          )
          for (const name of stale) {
            await deleteWorkerSecret(cloudflareConfig.accountId, cloudflareConfig.workerName, apiToken, name)
          }
        }
      } catch (error: any) {
        await writeDeployLog(
          deploymentId,
          `[hub] warning: failed to reconcile worker secrets: ${error?.message ?? error}`,
        )
      }
    } else {
      await writeDeployLog(
        deploymentId,
        '[hub] skipping worker-secret reconciliation: no environment variables defined for this target',
      )
    }

    if (secretVars.length > 0) {
      await writeDeployLog(deploymentId, `[hub] syncing ${secretVars.length} worker secret(s)`)
      for (const { key, value } of secretVars) {
        await runStreamed(
          deploymentId,
          'npx',
          [
            '--yes',
            'wrangler@latest',
            'secret',
            'put',
            key,
            '--config',
            '.output/wrangler.hub.toml',
            '--name',
            cloudflareConfig.workerName,
          ],
          { cwd: projectPath, env: buildEnv, input: value },
        )
      }
    }

    await writeDeployLog(deploymentId, '[hub] deploy succeeded')
    return { commit, success: true }
  } catch (error: any) {
    const message = error?.shortMessage ?? error?.message ?? String(error)
    await writeDeployLog(deploymentId, `[hub] deploy failed: ${message}`)
    return { commit, success: false, error: message }
  }
}

async function writeHubWranglerConfig(
  configPath: string,
  cf: CloudflareDeployInput['cloudflareConfig'],
  plainVars: { key: string; value: string }[],
  skipBootSync: boolean,
): Promise<void> {
  const lines: string[] = [
    `name = "${cf.workerName}"`,
    `main = "server/index.mjs"`,
    `assets = { directory = "public" }`,
    `workers_dev = true`,
    `preview_urls = true`,
    `compatibility_flags = [ "nodejs_compat" ]`,
    `compatibility_date = "${new Date().toISOString().slice(0, 10)}"`,
    ``,
  ]

  const d1Bindings: { binding: 'DB' | 'CACHE' | 'QUEUE' | 'LOGS'; db?: { name: string; id: string } | null }[] = [
    { binding: 'DB', db: cf.d1Database },
    { binding: 'CACHE', db: cf.d1Cache },
    { binding: 'QUEUE', db: cf.d1Queue },
    { binding: 'LOGS', db: cf.d1Logs },
  ]

  for (const { binding, db } of d1Bindings) {
    if (db) {
      lines.push(
        `[[d1_databases]]`,
        `binding = "${binding}"`,
        `database_name = "${db.name}"`,
        `database_id = "${db.id}"`,
        ``,
      )
    }
  }

  if (cf.r2Bucket) {
    lines.push(`[[r2_buckets]]`, `binding = "UPLOADS"`, `bucket_name = "${cf.r2Bucket}"`, ``)
  }

  if (cf.kvNamespace) {
    lines.push(`[[kv_namespaces]]`, `binding = "KV"`, `id = "${cf.kvNamespace}"`, ``)
  }

  if (plainVars.length > 0 || skipBootSync) {
    lines.push(`[vars]`)
    for (const { key, value } of plainVars) {
      lines.push(`${key} = ${tomlString(value)}`)
    }
    if (skipBootSync) {
      lines.push(`PRUVIOUS_SKIP_BOOT_SYNC = ${tomlString('1')}`)
    }
    lines.push(``)
  }

  lines.push(`[observability]`, `enabled = true`, ``)

  await writeFile(configPath, lines.join('\n'), 'utf8')
}

/**
 * Lists the Worker's currently bound secret names via the Cloudflare API.
 * Returns an empty array if the Worker doesn't exist yet (404).
 */
async function listWorkerSecrets(accountId: string, workerName: string, apiToken: string): Promise<string[]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/secrets`,
    { headers: { Authorization: `Bearer ${apiToken}` } },
  )

  if (response.status === 404) {
    return []
  }

  if (!response.ok) {
    throw new Error(`Cloudflare API ${response.status} ${response.statusText}`)
  }

  const json = (await response.json()) as { result?: { name: string }[] }
  return (json.result ?? []).map((r) => r.name)
}

async function deleteWorkerSecret(
  accountId: string,
  workerName: string,
  apiToken: string,
  secretName: string,
): Promise<void> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/secrets/${encodeURIComponent(secretName)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${apiToken}` } },
  )

  if (!response.ok && response.status !== 404) {
    throw new Error(`Cloudflare API ${response.status} ${response.statusText}`)
  }
}

/**
 * Encodes a string as a TOML basic-string literal. Escapes backslash, double quote,
 * and the control characters required by the TOML spec.
 */
function tomlString(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\x08/g, '\\b')
    .replace(/\f/g, '\\f')
  return `"${escaped}"`
}

interface RunOptions {
  cwd: string
  env?: NodeJS.ProcessEnv
  input?: string
}

async function runStreamed(deploymentId: number, command: string, args: string[], options: RunOptions): Promise<void> {
  const child: ResultPromise = execa(command, args, {
    cwd: options.cwd,
    env: options.env,
    input: options.input,
    stdout: 'pipe',
    stderr: 'pipe',
    reject: false,
  })

  child.stdout?.on('data', (data) => {
    void appendDeployLogChunk(deploymentId, data.toString('utf8'))
  })
  child.stderr?.on('data', (data) => {
    void appendDeployLogChunk(deploymentId, data.toString('utf8'))
  })

  const result = await child

  if (result.failed || result.exitCode !== 0) {
    throw new Error(`Command \`${command} ${args.join(' ')}\` exited with code ${result.exitCode}`)
  }
}
