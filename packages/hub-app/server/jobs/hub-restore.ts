import { defineJob, selectFrom, update } from '#pruvious/server'
import { restoreCloudflare } from '../utils/backupers/cloudflare'
import { resolveArtifactDir } from '../utils/backupArtifact'
import { appendRestoreLogChunk, relativeRestoreLogPath, writeRestoreLog } from '../utils/restoreLog'

interface Payload {
  restoreId: number
  wipeMissingObjects: boolean
}

export default defineJob({
  handler: async (payload: Payload) => {
    const { restoreId, wipeMissingObjects } = payload

    const restoreQuery = await selectFrom('Restores').where('id', '=', restoreId).first()

    if (!restoreQuery.success || !restoreQuery.data) {
      throw new Error(`Restore ${restoreId} not found`)
    }

    const restore = restoreQuery.data
    const backupQuery = await selectFrom('Backups')
      .where('id', '=', restore.backup as number)
      .first()

    if (!backupQuery.success || !backupQuery.data) {
      await markFailed(restoreId, `Backup ${restore.backup} not found`)
      throw new Error(`Backup ${restore.backup} not found`)
    }

    const backup = backupQuery.data
    const targetQuery = await selectFrom('DeploymentTargets')
      .where('id', '=', restore.target as number)
      .first()

    if (!targetQuery.success || !targetQuery.data) {
      await markFailed(restoreId, `Target ${restore.target} not found`)
      throw new Error(`Target ${restore.target} not found`)
    }

    const target = targetQuery.data
    const artifactDir = resolveArtifactDir(backup.id as number)
    const startedAt = Date.now()

    await update('Restores')
      .set({ status: 'running', startedAt, logPath: relativeRestoreLogPath(restoreId) })
      .where('id', '=', restoreId)
      .run()

    await writeRestoreLog(
      restoreId,
      `[hub] starting restore of backup #${backup.id as number} to "${target.name}" (${target.type})`,
    )

    try {
      let result: { success: boolean; error?: string }

      if (target.type === 'cloudflare') {
        result = await restoreCloudflare({
          artifactDir,
          cloudflareConfig: target.cloudflareConfig as any,
          wipeMissingObjects,
          writeLog: (line) => writeRestoreLog(restoreId, line),
          appendLogChunk: (chunk) => appendRestoreLogChunk(restoreId, chunk),
        })
      } else {
        const message = `Restores for target type "${target.type}" are not implemented yet`
        await writeRestoreLog(restoreId, `[hub] ${message}`)
        result = { success: false, error: message }
      }

      await update('Restores')
        .set({
          status: result.success ? 'success' : 'failed',
          finishedAt: Date.now(),
          error: result.error ?? undefined,
        })
        .where('id', '=', restoreId)
        .run()

      return { restoreId, success: result.success, error: result.error }
    } catch (error: any) {
      const message = error?.message ?? String(error)
      await writeRestoreLog(restoreId, `[hub] unexpected error: ${message}`)
      await markFailed(restoreId, message)
      throw error
    }
  },
  defaultPriority: 10,
  logs: { exposePayload: true },
})

async function markFailed(restoreId: number, error: string): Promise<void> {
  await update('Restores').set({ status: 'failed', finishedAt: Date.now(), error }).where('id', '=', restoreId).run()
}
