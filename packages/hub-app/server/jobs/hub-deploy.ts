import { defineJob, insertInto, selectFrom, update } from '#pruvious/server'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { basename, join } from 'pathe'
import { resolveArtifactDir } from '../utils/backupArtifact'
import { deployToCloudflare } from '../utils/deployers/cloudflare'
import { deployToVps } from '../utils/deployers/vps'
import { decryptSecret } from '../utils/vault'
import { relativeDeployLogPath, writeDeployLog } from '../utils/deployLog'
import { checkoutBranch } from '../utils/git'
import { resolveBuildCommand } from '../utils/resolveBuildCommand'
import { runShellCommand } from '../utils/runShellCommand'
import { acquireSyncLock, releaseSyncLock } from '../utils/syncLock'

const SYNC_LOCK_TTL_MS = 15 * 60_000

interface Payload {
  deploymentId: number
}

export default defineJob({
  handler: async (payload: Payload) => {
    const { deploymentId } = payload

    const deploymentQuery = await selectFrom('Deployments').where('id', '=', deploymentId).first()

    if (!deploymentQuery.success || !deploymentQuery.data) {
      throw new Error(`Deployment ${deploymentId} not found`)
    }

    const deployment = deploymentQuery.data
    const targetQuery = await selectFrom('DeploymentTargets')
      .where('id', '=', deployment.target as number)
      .first()

    if (!targetQuery.success || !targetQuery.data) {
      await markFailed(deploymentId, `Target ${deployment.target} not found`)
      throw new Error(`Target ${deployment.target} not found`)
    }

    const target = targetQuery.data

    const projectQuery = await selectFrom('Projects')
      .where('id', '=', target.project as number)
      .first()

    if (!projectQuery.success || !projectQuery.data) {
      await markFailed(deploymentId, `Project ${target.project} not found`)
      throw new Error(`Project ${target.project} not found`)
    }

    const project = projectQuery.data

    const envVarsQuery = await selectFrom('EnvironmentVariables')
      .where('targets', 'includes', target.id)
      .withCustomContextData({ _ignoreMaskFieldsHook: true })
      .all()

    const envVars: { key: string; value: string; isSecret: boolean }[] = []

    if (envVarsQuery.success) {
      for (const row of envVarsQuery.data) {
        try {
          envVars.push({
            key: row.key as string,
            value: decryptSecret(row.value as string),
            isSecret: Boolean(row.isSecret),
          })
        } catch (error: any) {
          await writeDeployLog(deploymentId, `[hub] skipping env var "${row.key}" (decrypt failed: ${error?.message})`)
        }
      }
    }

    await update('Deployments')
      .set({
        status: 'running',
        startedAt: Date.now(),
        logPath: relativeDeployLogPath(deploymentId),
      })
      .where('id', '=', deploymentId)
      .run()

    await update('DeploymentTargets').set({ lastDeploymentStatus: 'running' }).where('id', '=', target.id).run()

    await writeDeployLog(
      deploymentId,
      `[hub] starting deploy for "${project.name}" -> "${target.name}" (${target.type})`,
    )

    const projectPath = project.path as string
    const branch = (deployment.branch as string | null) ?? (target.branch as string | null)
    const hookEnv = buildHookEnv({
      base: process.env,
      envVars,
      deploymentId,
      branch,
      project,
      target,
    })

    const cloudflareConfig = (target.cloudflareConfig as { syncMode?: 'in-worker' | 'hub-side' } | null) ?? null
    const syncMode = cloudflareConfig?.syncMode ?? 'in-worker'
    let lockAcquired = false

    try {
      if (target.type === 'cloudflare' && syncMode === 'hub-side') {
        const lock = await acquireSyncLock(target.id as number, deploymentId, SYNC_LOCK_TTL_MS)
        if (!lock.acquired) {
          const heldBy = lock.heldBy
            ? `deployment #${lock.heldBy.deploymentId} (expires ${new Date(lock.heldBy.expiresAt).toISOString()})`
            : 'another deployment'
          const message = `Sync lock for this target is held by ${heldBy}`
          await writeDeployLog(deploymentId, `[hub] ${message}`)
          // Lock contention is not a "real" deploy failure: don't fire user
          // post-deploy hooks (would send false alarms) and don't overwrite
          // the holding deployment's target.lastDeploymentStatus.
          await markFailed(deploymentId, message)
          return { deploymentId, success: false, error: message }
        }
        lockAcquired = true
      }

      if (branch) {
        await checkoutBranch(deploymentId, projectPath, branch)
      }

      await runShellCommand(deploymentId, '[hub] pre-build (project)', project.preBuildCommand as string | null, {
        cwd: projectPath,
        env: hookEnv,
      })
      await runShellCommand(deploymentId, '[hub] pre-build (target)', target.preBuildCommand as string | null, {
        cwd: projectPath,
        env: hookEnv,
      })

      let result: { commit: string | null; success: boolean; error?: string }

      if (target.type === 'cloudflare') {
        result = await deployToCloudflare({
          deploymentId,
          projectPath,
          cloudflareConfig: target.cloudflareConfig as any,
          envVars,
          buildCommand: resolveBuildCommand(projectPath, project.buildCommand as string | null),
          syncMode,
          targetId: target.id as number,
          syncLockTtlMs: SYNC_LOCK_TTL_MS,
          onSyncSnapshot: (snapshot) =>
            recordSyncSnapshot({
              deploymentId,
              targetId: target.id as number,
              triggeredBy: deployment.triggeredBy as number | null,
              snapshot,
            }),
          hooks: {
            postBuild: async () => {
              await runShellCommand(
                deploymentId,
                '[hub] post-build (project)',
                project.postBuildCommand as string | null,
                { cwd: projectPath, env: hookEnv },
              )
              await runShellCommand(
                deploymentId,
                '[hub] post-build (target)',
                target.postBuildCommand as string | null,
                { cwd: projectPath, env: hookEnv },
              )
            },
          },
        })
      } else if (target.type === 'vps') {
        result = await deployToVps({
          deploymentId,
          projectPath,
          vpsConfig: target.vpsConfig as any,
          envVars,
          buildCommand: resolveBuildCommand(projectPath, project.buildCommand as string | null),
          targetId: target.id as number,
          targetName: target.name as string,
          hooks: {
            postBuild: async () => {
              await runShellCommand(
                deploymentId,
                '[hub] post-build (project)',
                project.postBuildCommand as string | null,
                { cwd: projectPath, env: hookEnv },
              )
              await runShellCommand(
                deploymentId,
                '[hub] post-build (target)',
                target.postBuildCommand as string | null,
                { cwd: projectPath, env: hookEnv },
              )
            },
          },
        })
      } else {
        const message = `Target type "${target.type}" is not implemented yet`
        await writeDeployLog(deploymentId, `[hub] ${message}`)
        result = { commit: null, success: false, error: message }
      }

      const finishedAt = Date.now()

      await update('Deployments')
        .set({
          status: result.success ? 'success' : 'failed',
          finishedAt,
          commit: result.commit ?? undefined,
          error: result.error ?? undefined,
        })
        .where('id', '=', deploymentId)
        .run()

      await update('DeploymentTargets')
        .set({
          lastDeploymentStatus: result.success ? 'success' : 'failed',
          ...(result.success ? { lastDeployedAt: finishedAt } : {}),
        })
        .where('id', '=', target.id)
        .run()

      await runPostDeployHooks(deploymentId, projectPath, hookEnv, project, target, result)

      return { deploymentId, success: result.success, error: result.error }
    } catch (error: any) {
      const message = error?.message ?? String(error)
      await writeDeployLog(deploymentId, `[hub] unexpected error: ${message}`)
      await markFailed(deploymentId, message)
      await update('DeploymentTargets').set({ lastDeploymentStatus: 'failed' }).where('id', '=', target.id).run()
      await runPostDeployHooks(deploymentId, projectPath, hookEnv, project, target, {
        success: false,
        error: message,
      })
      throw error
    } finally {
      if (lockAcquired) {
        await releaseSyncLock(target.id as number, deploymentId).catch(() => {})
      }
    }
  },
  defaultPriority: 10,
  logs: { exposePayload: true },
})

async function markFailed(deploymentId: number, error: string): Promise<void> {
  await update('Deployments')
    .set({ status: 'failed', finishedAt: Date.now(), error })
    .where('id', '=', deploymentId)
    .run()
}

async function recordSyncSnapshot(args: {
  deploymentId: number
  targetId: number
  triggeredBy: number | null
  snapshot: { kind: 'pre-sync' | 'post-sync'; sqlPath: string; sizeBytes: number }
}): Promise<{ backupId?: number }> {
  // Insert as `running` first so we never expose a `success` row whose file
  // didn't make it to disk. Promote to `success` after the copy, or mark
  // `failed` if the copy throws.
  const startedAt = Date.now()
  const insertResult = await insertInto('Backups')
    .values({
      target: args.targetId,
      type: 'db',
      triggeredBy: args.triggeredBy ?? undefined,
      status: 'running',
      startedAt,
      sizeBytes: args.snapshot.sizeBytes,
    })
    .returning(['id'])
    .run()

  if (!insertResult.success || !insertResult.data?.[0]?.id) {
    await writeDeployLog(
      args.deploymentId,
      `[hub] warning: could not record ${args.snapshot.kind} backup row: ${insertResult.runtimeError ?? 'unknown error'}`,
    )
    return {}
  }

  const backupId = insertResult.data[0].id as number
  const artifactDir = resolveArtifactDir(backupId)
  const filename = args.snapshot.kind === 'pre-sync' ? 'pre-sync.sql' : 'post-sync.sql'
  const dest = join(artifactDir, filename)

  try {
    await mkdir(artifactDir, { recursive: true })
    await copyFile(args.snapshot.sqlPath, dest)
    const sizeBytes = (await stat(dest).catch(() => null))?.size ?? args.snapshot.sizeBytes
    await update('Backups')
      .set({
        status: 'success',
        storagePath: join(basename(artifactDir), filename),
        sizeBytes,
        finishedAt: Date.now(),
      })
      .where('id', '=', backupId)
      .run()
    return { backupId }
  } catch (error: any) {
    await writeDeployLog(
      args.deploymentId,
      `[hub] warning: could not copy ${args.snapshot.kind} snapshot to backups: ${error?.message ?? error}`,
    )
    await update('Backups')
      .set({ status: 'failed', error: String(error?.message ?? error), finishedAt: Date.now() })
      .where('id', '=', backupId)
      .run()
    return {}
  }
}

function buildHookEnv(args: {
  base: NodeJS.ProcessEnv
  envVars: { key: string; value: string }[]
  deploymentId: number
  branch: string | null
  project: Record<string, unknown>
  target: Record<string, unknown>
}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...args.base,
    DEPLOY_ID: String(args.deploymentId),
    DEPLOY_BRANCH: args.branch ?? '',
    DEPLOY_PROJECT_NAME: String(args.project.name ?? ''),
    DEPLOY_PROJECT_PATH: String(args.project.path ?? ''),
    DEPLOY_TARGET_NAME: String(args.target.name ?? ''),
    DEPLOY_TARGET_TYPE: String(args.target.type ?? ''),
    DEPLOY_TARGET_ID: String(args.target.id ?? ''),
  }

  for (const { key, value } of args.envVars) {
    env[key] = value
  }

  return env
}

async function runPostDeployHooks(
  deploymentId: number,
  cwd: string,
  baseEnv: NodeJS.ProcessEnv,
  project: Record<string, unknown>,
  target: Record<string, unknown>,
  result: { success: boolean; error?: string },
): Promise<void> {
  const projectCmd = project.postDeployCommand as string | null
  const targetCmd = target.postDeployCommand as string | null

  if (!projectCmd?.trim() && !targetCmd?.trim()) {
    return
  }

  const env: NodeJS.ProcessEnv = {
    ...baseEnv,
    DEPLOY_STATUS: result.success ? 'success' : 'failed',
    DEPLOY_ERROR: result.error ?? '',
  }

  for (const [label, cmd] of [
    ['[hub] post-deploy (project)', projectCmd],
    ['[hub] post-deploy (target)', targetCmd],
  ] as const) {
    try {
      await runShellCommand(deploymentId, label, cmd, { cwd, env })
    } catch (error: any) {
      await writeDeployLog(deploymentId, `${label} warning: ${error?.message ?? error}`)
    }
  }
}
