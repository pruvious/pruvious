import { createLogStore } from './logStore'

const store = createLogStore('.hub-restores')

export function resolveRestoreLogPath(restoreId: number): string {
  return store.resolvePath(restoreId)
}

export function relativeRestoreLogPath(restoreId: number): string {
  return store.relativePath(restoreId)
}

export async function writeRestoreLog(restoreId: number, line: string): Promise<void> {
  await store.writeLine(restoreId, line)
}

export async function appendRestoreLogChunk(restoreId: number, chunk: string): Promise<void> {
  await store.appendChunk(restoreId, chunk)
}
