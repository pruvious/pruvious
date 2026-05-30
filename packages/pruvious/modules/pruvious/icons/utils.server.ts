import { isArray, isEmpty, isString, withoutTrailingSlash } from '@pruvious/utils'
import type { Nuxt } from 'nuxt/schema'
import { basename, isAbsolute, join, normalize } from 'pathe'
import type { PruviousModuleOptions } from '../PruviousModuleOptions'

type IconDirsOption = NonNullable<NonNullable<PruviousModuleOptions['dir']>['icons']>

export const ICON_NAME_PATTERN = /^[A-Za-z0-9_-]+$/

export interface ResolvedIconDirEntry {
  prefix: string
  dirs: string[]
}

/**
 * Resolves the `pruvious.dir.icons` option across all Nuxt layers into one entry per
 * prefix. `dirs` lists every contributing layer's absolute path, ordered root-first
 * so the closer layer overrides icons of the same basename from deeper layers.
 * Within a single layer, duplicate prefixes throw; across layers they merge.
 */
export function resolveIconDirsAcrossLayers(nuxt: Nuxt): ResolvedIconDirEntry[] {
  const byPrefix = new Map<string, string[]>()
  const orderedPrefixes: string[] = []

  for (const layer of nuxt.options._layers) {
    const layerInput = (layer.config.pruvious || undefined)?.dir?.icons
    const entries = parseLayerIconEntries(layerInput)
    const seenInLayer = new Set<string>()

    for (const { relDir, prefix } of entries) {
      if (seenInLayer.has(prefix)) {
        throw new Error(
          `[pruvious] Duplicate icon directory prefix '${prefix}' in layer '${layer.cwd}'. Use the object form '{ dir, prefix }' to disambiguate.`,
        )
      }
      seenInLayer.add(prefix)

      const absDir = withoutTrailingSlash(join(layer.config.srcDir ?? layer.cwd, relDir))
      const existing = byPrefix.get(prefix)
      if (existing) {
        existing.push(absDir)
      } else {
        byPrefix.set(prefix, [absDir])
        orderedPrefixes.push(prefix)
      }
    }
  }

  return orderedPrefixes.map((prefix) => ({ prefix, dirs: byPrefix.get(prefix)! }))
}

function parseLayerIconEntries(input: IconDirsOption | undefined): { relDir: string; prefix: string }[] {
  const raw = isString(input) ? [input] : isArray(input) ? input : ['icons']
  const out: { relDir: string; prefix: string }[] = []

  for (const entry of raw) {
    const obj = isString(entry) ? { dir: entry } : entry
    const prefix = (obj.prefix ?? basename(obj.dir)).trim()
    if (!prefix) {
      throw new Error(
        `[pruvious] Icon directory '${obj.dir}' resolves to an empty prefix. Provide an explicit \`prefix\`.`,
      )
    }
    if (!ICON_NAME_PATTERN.test(prefix)) {
      throw new Error(
        `[pruvious] Icon directory prefix '${prefix}' contains unsupported characters. Use only letters, digits, '_' and '-'.`,
      )
    }
    out.push({ relDir: obj.dir, prefix })
  }

  return out
}

export type ResolvedIconDir =
  | { kind: 'malformed' }
  | { kind: 'unknown'; prefix: string }
  | { kind: 'resolved'; abs: string[]; prefix: string }

/**
 * Resolves an icon `dir` (the prefix of a configured icons directory).
 *
 * - `'malformed'` - empty configuration or path-traversal attempt.
 * - `'unknown'` - well-formed prefix but not in `pruvious.dir.icons`.
 * - `'resolved'` - matched a configured prefix. `abs` is the ordered list of
 *   absolute paths across layers (root first).
 */
export function resolveIconDir(dir: string | undefined | null): ResolvedIconDir {
  const dirs = useRuntimeConfig().pruvious.dir.icons

  if (!isString(dir) || isEmpty(dir.trim())) {
    const first = dirs[0]
    if (!first) {
      return { kind: 'malformed' }
    }
    return { kind: 'resolved', abs: first.dirs, prefix: first.prefix }
  }

  let decoded: string
  try {
    decoded = decodeURIComponent(dir.trim())
  } catch {
    return { kind: 'malformed' }
  }

  const normalized = normalize(decoded)

  if (
    isAbsolute(normalized) ||
    normalized.includes('/') ||
    normalized.includes('\\') ||
    normalized === '.' ||
    normalized === '..'
  ) {
    return { kind: 'malformed' }
  }

  const match = dirs.find((entry) => entry.prefix === normalized)
  if (!match) {
    return { kind: 'unknown', prefix: normalized }
  }

  return { kind: 'resolved', abs: match.dirs, prefix: match.prefix }
}

