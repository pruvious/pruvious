import os from 'node:os'
import { join, parse, resolve } from 'pathe'

let cwd = ''

/**
 * Sets the current working directory for path resolution.
 * The `path` must be resolved beforehand.
 */
export function setCurrentWorkingDirectory(path: string): void {
  cwd = path
}

/**
 * Resolves a given `path` to a normalized absolute path.
 * Supports `~` for the user's home directory.
 */
export function resolvePath(path: string): string {
  let resolvedPath = path

  if (path === '~') {
    resolvedPath = os.homedir()
  } else if (path.startsWith('~/')) {
    resolvedPath = join(os.homedir(), path.slice(2))
  } else {
    resolvedPath = resolve(cwd, path)
  }

  return resolvedPath === '/' ? resolvedPath : resolvedPath.replace(/[\\\/]+$/, '')
}

/**
 * Checks if a given `path` is valid.
 */
export function isValidPath(path: string): boolean {
  try {
    const parsed = parse(path)
    return path.length > 0 && (!!parsed.root || !!parsed.dir || !!parsed.base)
  } catch {
    return false
  }
}
