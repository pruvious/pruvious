import { existsSync, mkdirSync } from 'node:fs'
import { appendFile } from 'node:fs/promises'
import { join } from 'pathe'

export interface LogStore {
  resolvePath: (id: number) => string
  relativePath: (id: number) => string
  writeLine: (id: number, line: string) => Promise<void>
  appendChunk: (id: number, chunk: string) => Promise<void>
}

/**
 * Returns helpers that write per-id log files into `<cwd>/<dir>/<id>.log`. The relative
 * form is what callers persist on records - storing the absolute path would leak the
 * host's filesystem layout into the database.
 */
export function createLogStore(dir: string): LogStore {
  const resolvePath = (id: number): string => {
    const abs = join(process.cwd(), dir)
    if (!existsSync(abs)) {
      mkdirSync(abs, { recursive: true })
    }
    return join(abs, `${id}.log`)
  }

  return {
    resolvePath,
    relativePath: (id) => join(dir, `${id}.log`),
    writeLine: async (id, line) => {
      await appendFile(resolvePath(id), `${new Date().toISOString()} ${line}\n`, 'utf8')
    },
    appendChunk: async (id, chunk) => {
      await appendFile(resolvePath(id), chunk, 'utf8')
    },
  }
}
