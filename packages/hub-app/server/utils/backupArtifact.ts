import { existsSync, mkdirSync, statSync, readdirSync } from 'node:fs'
import { join } from 'pathe'

const ARTIFACT_ROOT = '.hub-backup-artifacts'

/**
 * Resolves the per-backup artifact directory under `<cwd>/.hub-backup-artifacts/<id>/`,
 * creating it on first use. Local FS for now; off-host destinations will plug in here.
 */
export function resolveArtifactDir(backupId: number): string {
  const dir = join(process.cwd(), ARTIFACT_ROOT, String(backupId))
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * Relative form persisted on `Backups.storagePath`.
 */
export function relativeArtifactDir(backupId: number): string {
  return join(ARTIFACT_ROOT, String(backupId))
}

/**
 * Recursively sums the byte size of every regular file under `dir`. Returns 0 if the
 * directory does not exist.
 */
export function dirSizeBytes(dir: string): number {
  if (!existsSync(dir)) {
    return 0
  }

  let total = 0
  const walk = (cur: string) => {
    for (const name of readdirSync(cur)) {
      const child = join(cur, name)
      const stat = statSync(child)
      if (stat.isDirectory()) {
        walk(child)
      } else if (stat.isFile()) {
        total += stat.size
      }
    }
  }
  walk(dir)
  return total
}
