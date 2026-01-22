import os from 'node:os'
import { join, parse, resolve } from 'pathe'

let cwd = ''

export function setCurrentWorkingDirectory(path: string) {
  cwd = path
}

export function resolvePath(path: string) {
  let resolvedPath = path

  if (path === '~') {
    resolvedPath = os.homedir()
  } else if (path.startsWith('~/')) {
    resolvedPath = join(os.homedir(), path.slice(2))
  } else {
    resolvedPath = resolve(cwd, path)
  }

  return resolvedPath.replace(/[\\\/]+$/, '')
}

export function isValidPath(path: string) {
  try {
    const parsed = parse(path)
    return path.length > 0 && (!!parsed.root || !!parsed.dir || !!parsed.base)
  } catch {
    return false
  }
}
