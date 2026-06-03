import { createLogStore } from './logStore'

const store = createLogStore('.hub-deploys')

export function resolveDeployLogPath(deploymentId: number): string {
  return store.resolvePath(deploymentId)
}

export function relativeDeployLogPath(deploymentId: number): string {
  return store.relativePath(deploymentId)
}

export async function writeDeployLog(deploymentId: number, line: string): Promise<void> {
  await store.writeLine(deploymentId, line)
}

export async function appendDeployLogChunk(deploymentId: number, chunk: string): Promise<void> {
  await store.appendChunk(deploymentId, chunk)
}
