import { createHash } from 'crypto'
import fs from 'node:fs'
import { basename, join } from 'pathe'

/**
 * Generates a unified hash for an array of `sources` (files or folders).
 */
export function hashSources(sources: string[]): string {
  const hash = createHash('sha256')

  function addToHash(relativePath: string, stat: fs.Stats) {
    hash.update(`${relativePath}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`)
  }

  function walk(current: string, base: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of entries) {
      const fullPath = join(current, entry.name)
      const relativePath = join(base, entry.name)
      const stat = fs.statSync(fullPath)

      addToHash(relativePath, stat)

      if (entry.isDirectory()) {
        walk(fullPath, relativePath)
      }
    }
  }

  const sortedSources = [...sources].sort((a, b) => a.localeCompare(b))

  for (const source of sortedSources) {
    const stat = fs.statSync(source)

    if (stat.isDirectory()) {
      walk(source, '')
    } else {
      addToHash(basename(source), stat)
    }
  }

  return hash.digest('hex')
}
