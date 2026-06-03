import { defineJob, selectFrom, update } from '#pruvious/server'
import { backupCloudflare, type BackupType } from '../utils/backupers/cloudflare'
import { dirSizeBytes, relativeArtifactDir, resolveArtifactDir } from '../utils/backupArtifact'
import { appendBackupLogChunk, relativeBackupLogPath, writeBackupLog } from '../utils/backupLog'

interface Payload {
  backupId: number
}

export default defineJob({
  handler: async (payload: Payload) => {
    const { backupId } = payload

    const backupQuery = await selectFrom('Backups').where('id', '=', backupId).first()

    if (!backupQuery.success || !backupQuery.data) {
      throw new Error(`Backup ${backupId} not found`)
    }

    const backup = backupQuery.data
    const targetQuery = await selectFrom('DeploymentTargets')
      .where('id', '=', backup.target as number)
      .first()

    if (!targetQuery.success || !targetQuery.data) {
      await markFailed(backupId, `Target ${backup.target} not found`)
      throw new Error(`Target ${backup.target} not found`)
    }

    const target = targetQuery.data
    const artifactDir = resolveArtifactDir(backupId)
    const startedAt = Date.now()

    await update('Backups')
      .set({ status: 'running', startedAt, logPath: relativeBackupLogPath(backupId) })
      .where('id', '=', backupId)
      .run()

    await writeBackupLog(
      backupId,
      `[hub] starting backup of "${target.name}" (${target.type}) type=${backup.type as string}`,
    )

    try {
      let result: { success: boolean; error?: string }

      if (target.type === 'cloudflare') {
        result = await backupCloudflare({
          type: backup.type as BackupType,
          artifactDir,
          cloudflareConfig: target.cloudflareConfig as any,
          writeLog: (line) => writeBackupLog(backupId, line),
          appendLogChunk: (chunk) => appendBackupLogChunk(backupId, chunk),
        })
      } else {
        const message = `Backups for target type "${target.type}" are not implemented yet`
        await writeBackupLog(backupId, `[hub] ${message}`)
        result = { success: false, error: message }
      }

      const finishedAt = Date.now()
      const sizeBytes = result.success ? dirSizeBytes(artifactDir) : 0

      await update('Backups')
        .set({
          status: result.success ? 'success' : 'failed',
          finishedAt,
          sizeBytes,
          storagePath: result.success ? relativeArtifactDir(backupId) : undefined,
          error: result.error ?? undefined,
        })
        .where('id', '=', backupId)
        .run()

      return { backupId, success: result.success, error: result.error }
    } catch (error: any) {
      const message = error?.message ?? String(error)
      await writeBackupLog(backupId, `[hub] unexpected error: ${message}`)
      await markFailed(backupId, message)
      throw error
    }
  },
  defaultPriority: 10,
  logs: { exposePayload: true },
})

async function markFailed(backupId: number, error: string): Promise<void> {
  await update('Backups').set({ status: 'failed', finishedAt: Date.now(), error }).where('id', '=', backupId).run()
}
