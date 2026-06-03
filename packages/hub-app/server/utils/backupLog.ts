import { createLogStore } from './logStore'

const store = createLogStore('.hub-backups')

export function resolveBackupLogPath(backupId: number): string {
  return store.resolvePath(backupId)
}

export function relativeBackupLogPath(backupId: number): string {
  return store.relativePath(backupId)
}

export async function writeBackupLog(backupId: number, line: string): Promise<void> {
  await store.writeLine(backupId, line)
}

export async function appendBackupLogChunk(backupId: number, chunk: string): Promise<void> {
  await store.appendChunk(backupId, chunk)
}
