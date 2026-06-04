import { isNumber } from '@pruvious/utils'
import { selectFrom, update } from '#pruvious/server'
import { existsSync } from 'node:fs'
import { join } from 'pathe'
import { writeDeployLog } from '../deployLog'
import { getDecryptedSecret } from '../getDecryptedSecret'
import { readGitCommit } from '../git'
import { connect, shellQuote, type SshSession } from '../sshClient'
import { runStreamed } from './streamedExec'
import {
  buildPaths,
  ensureCert,
  ensureNginxSite,
  ensurePm2App,
  provisionAppLayout,
  provisionBaseSystem,
  provisionPostgres,
  type ProvisionPaths,
} from './vps-provision'

const HEALTH_CHECK_MAX_ATTEMPTS = 30
const HEALTH_CHECK_INTERVAL_MS = 1000
const RELEASES_TO_KEEP = 5
const PORT_ALLOCATION_START = 3000

export interface VpsConfig {
  domain: string
  host: string
  sshUser: string
  port: number
  nodeVersion?: string | null
  dbDriver: 'sqlite' | 'postgres'
  sshKey: number | { id: number }
  allocatedPort?: number
}

export interface VpsDeployInput {
  deploymentId: number
  projectPath: string
  vpsConfig: VpsConfig
  envVars: { key: string; value: string; isSecret: boolean }[]
  buildCommand: { cmd: string; args: string[] }
  targetId: number
  targetName: string
  hooks?: {
    postBuild?: () => Promise<void>
  }
}

export interface VpsDeployResult {
  commit: string | null
  success: boolean
  error?: string
}

/**
 * Builds the Pruvious project for the Nitro `node-server` preset and ships it to an
 * Ubuntu VPS over SSH. Publishes atomic releases under `/var/www/pruvious/<slug>/`,
 * swaps the `current` symlink, reloads PM2, and health-checks the app before declaring
 * success. On health-check failure the symlink is rolled back to the previous release.
 */
export async function deployToVps(input: VpsDeployInput): Promise<VpsDeployResult> {
  const { deploymentId, projectPath, vpsConfig, envVars, buildCommand, targetId, targetName, hooks } = input

  if (!existsSync(projectPath)) {
    return { commit: null, success: false, error: `Project path does not exist: ${projectPath}` }
  }
  if (!existsSync(join(projectPath, 'package.json'))) {
    return { commit: null, success: false, error: `No package.json at ${projectPath}` }
  }

  await writeDeployLog(deploymentId, `[vps] target: ${vpsConfig.host} (${vpsConfig.domain})`)

  const commit = await readGitCommit(projectPath)
  if (commit) {
    await writeDeployLog(deploymentId, `[vps] commit: ${commit}`)
  }

  let session: SshSession | null = null
  try {
    const sshKeyId = isNumber(vpsConfig.sshKey) ? vpsConfig.sshKey : vpsConfig.sshKey.id
    const privateKey = await getDecryptedSecret(sshKeyId)

    const allocatedPort = await ensureAllocatedPort(targetId, vpsConfig)
    await writeDeployLog(deploymentId, `[vps] internal port: ${allocatedPort}`)

    // Build locally before SSH so a failing build never touches the remote host.
    const buildEnv: NodeJS.ProcessEnv = {
      ...process.env,
      NITRO_PRESET: 'node-server',
    }
    for (const { key, value } of envVars) {
      buildEnv[key] = value
    }
    await writeDeployLog(deploymentId, `[vps] running build: ${buildCommand.cmd} ${buildCommand.args.join(' ')}`)
    await runStreamed(deploymentId, buildCommand.cmd, buildCommand.args, { cwd: projectPath, env: buildEnv })

    const outputDir = join(projectPath, '.output')
    if (!existsSync(outputDir)) {
      throw new Error(`Build did not produce a .output directory at ${outputDir}`)
    }

    if (hooks?.postBuild) {
      await hooks.postBuild()
    }

    session = await connect({
      host: vpsConfig.host,
      port: vpsConfig.port || 22,
      username: vpsConfig.sshUser,
      privateKey,
      deploymentId,
    })

    const slug = slugify(targetName)
    const paths = buildPaths(slug)

    await provisionBaseSystem(session, deploymentId, {
      nodeVersion: vpsConfig.nodeVersion,
      installPostgres: vpsConfig.dbDriver === 'postgres',
      sshUser: vpsConfig.sshUser,
    })
    await provisionAppLayout(session, deploymentId, paths, vpsConfig.sshUser)

    let databaseUrl: string | null = null
    if (vpsConfig.dbDriver === 'postgres' && !envVars.some((v) => v.key === 'NUXT_PRUVIOUS_DATABASE_DRIVER')) {
      const creds = await provisionPostgres(session, deploymentId, slug, paths)
      databaseUrl = creds.databaseUrl
    }

    const releaseDir = `${paths.releasesDir}/${deploymentId}`
    await session.exec(`mkdir -p ${shellQuote(releaseDir)}`)
    await session.tarUpload(outputDir, `${releaseDir}/.output`)

    await writeRemoteEnvFile(session, paths.sharedDir, {
      envVars,
      allocatedPort,
      dbDriver: vpsConfig.dbDriver,
      autoDatabaseUrl: databaseUrl,
    })

    // Each release reads the shared `.env` via a symlink so a rollback to an older
    // release keeps using the current env. App-side relative paths resolve from PM2's
    // cwd (appRoot), so the database file and uploads dir need no per-release symlinks.
    await session.exec(`ln -sfn ${shellQuote(paths.sharedDir + '/.env')} ${shellQuote(releaseDir + '/.env')}`)
    if (vpsConfig.dbDriver === 'sqlite') {
      await session.exec(`touch ${shellQuote(paths.sharedDir + '/database.sqlite')}`)
    }

    const previousRelease = await readCurrentRelease(session, paths)
    await swapCurrentSymlink(session, paths, releaseDir)

    await ensureNginxSite(session, deploymentId, slug, vpsConfig.domain, allocatedPort)
    const certEmail = process.env.PRUVIOUS_HUB_LETSENCRYPT_EMAIL?.trim() || `noreply@${vpsConfig.domain}`
    try {
      await ensureCert(session, deploymentId, vpsConfig.domain, certEmail)
    } catch (error: any) {
      // Soft-fail: cert issuance failures (DNS not yet pointing at the host, Let's
      // Encrypt rate limit, etc.) shouldn't kill a deploy whose app is otherwise fine.
      await writeDeployLog(
        deploymentId,
        `[vps] warning: certbot failed (${error?.message ?? error}). Continuing on HTTP - re-deploy after DNS is in place to issue the cert.`,
      )
    }
    await ensurePm2App(session, deploymentId, slug, paths, vpsConfig.sshUser)

    const healthy = await healthCheck(session, deploymentId, allocatedPort)
    if (!healthy) {
      if (previousRelease) {
        await writeDeployLog(deploymentId, `[vps] health check failed - rolling back to ${previousRelease}`)
        await swapCurrentSymlink(session, paths, previousRelease)
        await session.exec(`pm2 reload pruvious-${shellQuote(slug).slice(1, -1)} --update-env`, { allowFail: true })
      } else {
        await writeDeployLog(deploymentId, '[vps] health check failed - no previous release to roll back to')
      }
      return { commit, success: false, error: 'Health check failed: app did not respond on the internal port' }
    }

    await cleanupOldReleases(session, paths, RELEASES_TO_KEEP)

    await writeDeployLog(deploymentId, '[vps] deploy succeeded')
    return { commit, success: true }
  } catch (error: any) {
    const message = error?.shortMessage ?? error?.message ?? String(error)
    await writeDeployLog(deploymentId, `[vps] deploy failed: ${message}`)
    return { commit, success: false, error: message }
  } finally {
    if (session) {
      session.close()
    }
  }
}

async function ensureAllocatedPort(targetId: number, vpsConfig: VpsConfig): Promise<number> {
  if (vpsConfig.allocatedPort && vpsConfig.allocatedPort > 0) {
    return vpsConfig.allocatedPort
  }

  const otherTargets = await selectFrom('DeploymentTargets').select(['id', 'vpsConfig']).where('type', '=', 'vps').all()

  const used = new Set<number>()
  if (otherTargets.success) {
    for (const row of otherTargets.data) {
      const cfg = row.vpsConfig as VpsConfig | null
      if (!cfg || cfg.host !== vpsConfig.host) {
        continue
      }
      if (cfg.allocatedPort && cfg.allocatedPort > 0 && row.id !== targetId) {
        used.add(cfg.allocatedPort)
      }
    }
  }

  let port = PORT_ALLOCATION_START
  while (used.has(port)) {
    port += 1
  }

  await update('DeploymentTargets')
    .set({ vpsConfig: { ...vpsConfig, allocatedPort: port } as any })
    .where('id', '=', targetId)
    .run()

  return port
}

async function writeRemoteEnvFile(
  session: SshSession,
  sharedDir: string,
  opts: {
    envVars: { key: string; value: string }[]
    allocatedPort: number
    dbDriver: 'sqlite' | 'postgres'
    autoDatabaseUrl: string | null
  },
): Promise<void> {
  const lines: string[] = []
  const explicit = new Set(opts.envVars.map((v) => v.key))

  for (const { key, value } of opts.envVars) {
    lines.push(`${key}=${envFileEscape(value)}`)
  }

  if (!explicit.has('NUXT_PRUVIOUS_DATABASE_DRIVER')) {
    const url = opts.dbDriver === 'postgres' ? (opts.autoDatabaseUrl ?? '') : 'sqlite://./shared/database.sqlite'
    if (url) {
      lines.push(`NUXT_PRUVIOUS_DATABASE_DRIVER=${envFileEscape(url)}`)
    }
  }
  if (!explicit.has('NUXT_PRUVIOUS_UPLOADS_DRIVER')) {
    lines.push(`NUXT_PRUVIOUS_UPLOADS_DRIVER=${envFileEscape('fs://./shared/.uploads')}`)
  }
  if (!explicit.has('PORT')) {
    lines.push(`PORT=${opts.allocatedPort}`)
  }
  if (!explicit.has('HOST')) {
    lines.push('HOST=127.0.0.1')
  }
  if (!explicit.has('NODE_ENV')) {
    lines.push('NODE_ENV=production')
  }

  const content = lines.join('\n') + '\n'
  // Write to a tmp file and rename so PM2 never sees a half-written .env on startup.
  await session.writeFile(`${sharedDir}/.env.tmp`, content, { mode: '600' })
  await session.exec(`mv -f ${shellQuote(sharedDir + '/.env.tmp')} ${shellQuote(sharedDir + '/.env')}`)
}

/**
 * Escapes a value for a POSIX dotenv-style file. PM2's env_file reader handles
 * double-quoted strings with backslash escapes.
 */
function envFileEscape(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\$/g, '\\$')}"`
}

async function readCurrentRelease(session: SshSession, paths: ProvisionPaths): Promise<string | null> {
  const result = await session.exec(`readlink -f ${shellQuote(paths.appRoot + '/current')} 2>/dev/null || true`, {
    allowFail: true,
    stream: false,
  })
  const target = result.stdout.trim()
  if (!target || target === paths.appRoot + '/current') {
    return null
  }
  return target
}

async function swapCurrentSymlink(session: SshSession, paths: ProvisionPaths, target: string): Promise<void> {
  // ln -sfn followed by mv -Tf is the standard atomic-symlink-swap recipe.
  const tmp = `${paths.appRoot}/current.new`
  await session.exec(
    `ln -sfn ${shellQuote(target)} ${shellQuote(tmp)} && mv -Tf ${shellQuote(tmp)} ${shellQuote(paths.appRoot + '/current')}`,
  )
}

async function healthCheck(session: SshSession, deploymentId: number, port: number): Promise<boolean> {
  await writeDeployLog(deploymentId, `[vps] waiting for app on 127.0.0.1:${port}`)
  for (let attempt = 1; attempt <= HEALTH_CHECK_MAX_ATTEMPTS; attempt += 1) {
    const probe = await session.exec(`curl -fsS -m 5 -o /dev/null http://127.0.0.1:${port}/`, {
      allowFail: true,
      stream: false,
    })
    if (probe.exitCode === 0) {
      await writeDeployLog(deploymentId, `[vps] app responded after ${attempt} attempt(s)`)
      return true
    }
    await sleep(HEALTH_CHECK_INTERVAL_MS)
  }
  return false
}

async function cleanupOldReleases(session: SshSession, paths: ProvisionPaths, keep: number): Promise<void> {
  // Best-effort: a failure here doesn't roll back an otherwise successful deploy.
  const script =
    `ls -1 ${shellQuote(paths.releasesDir)} 2>/dev/null | grep -E '^[0-9]+$' | sort -nr | tail -n +${keep + 1} | ` +
    `xargs -I{} rm -rf ${shellQuote(paths.releasesDir)}/{}`
  await session.exec(script, { allowFail: true, stream: false })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'target'
  )
}
