import type { CollectionHooks } from '@pruvious/orm'
import { rm } from 'node:fs/promises'
import { isAbsolute, join } from 'pathe'
import { relativeArtifactDir } from './backupArtifact'
import { relativeBackupLogPath } from './backupLog'
import { relativeDeployLogPath } from './deployLog'
import { relativeRestoreLogPath } from './restoreLog'

type BeforeQueryExecutionHook = Required<CollectionHooks>['beforeQueryExecution'][number]
type AfterQueryExecutionHook = Required<CollectionHooks>['afterQueryExecution'][number]

const KEY = '_cleanupTargetCascadePaths'

/**
 * Captures the on-disk artifacts owned by Deployments/Backups/Restores tied to the
 * DeploymentTargets being deleted, then removes them after the cascade delete has run.
 * The database-level `ON DELETE CASCADE` clears the child rows, but their log files and
 * backup artifact directories live on the filesystem and would otherwise be orphaned.
 */
export function cleanupTargetCascade(): {
  before: BeforeQueryExecutionHook
  after: AfterQueryExecutionHook
} {
  return {
    before: async (context) => {
      if (context.operation !== 'delete') {
        return
      }

      const targets = await context.database
        .queryBuilder()
        .selectFrom('DeploymentTargets' as never)
        .select(['id'] as never)
        .setWhereCondition(context.whereCondition)
        .all()

      if (!targets.success || targets.data.length === 0) {
        context.customData[KEY] = []
        return
      }

      const targetIds = targets.data.map((r) => (r as { id: number }).id)
      const paths: string[] = []

      const deployments = await context.database
        .queryBuilder()
        .selectFrom('Deployments' as never)
        .select(['id'] as never)
        .where('target' as any, 'in', targetIds)
        .all()
      if (deployments.success) {
        for (const row of deployments.data) {
          paths.push(relativeDeployLogPath((row as { id: number }).id))
        }
      }

      const backups = await context.database
        .queryBuilder()
        .selectFrom('Backups' as never)
        .select(['id'] as never)
        .where('target' as any, 'in', targetIds)
        .all()
      if (backups.success) {
        for (const row of backups.data) {
          const id = (row as { id: number }).id
          paths.push(relativeBackupLogPath(id))
          paths.push(relativeArtifactDir(id))
        }
      }

      const restores = await context.database
        .queryBuilder()
        .selectFrom('Restores' as never)
        .select(['id'] as never)
        .where('target' as any, 'in', targetIds)
        .all()
      if (restores.success) {
        for (const row of restores.data) {
          paths.push(relativeRestoreLogPath((row as { id: number }).id))
        }
      }

      context.customData[KEY] = paths
    },
    after: async (context) => {
      if (context.operation !== 'delete') {
        return
      }
      const paths = context.customData[KEY] as string[] | undefined
      if (!paths?.length) {
        return
      }
      for (const raw of paths) {
        const path = isAbsolute(raw) ? raw : join(process.cwd(), raw)
        try {
          await rm(path, { recursive: true, force: true })
        } catch {
          // best-effort cleanup
        }
      }
    },
  }
}
