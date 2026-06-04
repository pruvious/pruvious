import { createLogStore } from './logStore'

const store = createLogStore('.hub-scaffolds')

export function resolveScaffoldLogPath(scaffoldId: number): string {
  return store.resolvePath(scaffoldId)
}

export function relativeScaffoldLogPath(scaffoldId: number): string {
  return store.relativePath(scaffoldId)
}

export async function writeScaffoldLog(scaffoldId: number, line: string): Promise<void> {
  await store.writeLine(scaffoldId, line)
}

export async function appendScaffoldLogChunk(scaffoldId: number, chunk: string): Promise<void> {
  await store.appendChunk(scaffoldId, chunk)
}
