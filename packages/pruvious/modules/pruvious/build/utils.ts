import { validatorsMeta } from '@pruvious/orm'
import { isArray, isDefined, isEmpty, sanitizeSvg } from '@pruvious/utils'
import fs from 'node:fs'
import { createResolver, useNuxt } from 'nuxt/kit'
import { basename, extname, join, normalize, resolve } from 'pathe'
import { warnWithContext } from '../debug/console'
import { ICON_NAME_PATTERN } from '../icons/utils.server'

export interface SimpleValidatorMeta {
  name: string
  comment: string[]
  exampleField: string
}

/**
 * Resolves a file path relative to the Pruvious module directory (`packages/pruvious/modules/pruvious/`).
 */
export function resolvePruviousFile(path: string) {
  const { resolve } = createResolver(import.meta.url)
  return resolve(join('..', path))
}

/**
 * Resolves a file path relative to the Pruvious client utils directory (`packages/pruvious/app/utils/pruvious/`).
 */
export function resolvePruviousUtilsFile(path: string) {
  const { resolve } = createResolver(import.meta.url)
  return resolve(join('../../../app/utils/pruvious', path))
}

/**
 * Retrieves metadata for all basic validation rules.
 * Also includes a field type suggestion for documentation purposes.
 */
export function getSimpleValidatorsMeta(): SimpleValidatorMeta[] {
  return validatorsMeta
    .filter(({ name }) => !['unique'].includes(name))
    .map(({ name, comment }) => ({
      name,
      comment,
      exampleField: ['timestamp'].includes(name) ? 'numberField' : 'textField',
    }))
}

/**
 * Parses export statements from a generated index file content string
 * and builds a map of export names to their source file paths.
 */
export function resolveExportSources(content: string): Record<string, string> {
  const map: Record<string, string> = {}

  for (const match of content.matchAll(/export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const names = match[1]!
    const source = match[2]!

    for (const name of names.split(',')) {
      const trimmed = name.replace(/\b(type|as)\s+\w+/g, '').trim()

      if (trimmed) {
        map[trimmed] = source
      }
    }
  }

  return map
}

/**
 * Retrieves the names of all custom icon collections defined across Nuxt layers.
 */
export function getIconNames() {
  const nuxt = useNuxt()
  const iconNames: string[] = []

  for (const layer of nuxt.options._layers) {
    if (isArray(layer.config.icon?.customCollections)) {
      for (const { dir, prefix } of layer.config.icon.customCollections) {
        try {
          const files = fs.readdirSync(resolve(layer.config.rootDir, dir))
          iconNames.push(...files.map((file) => `${prefix}:${basename(file, extname(file))}`))
        } catch {}
      }
    }
  }

  return iconNames
}

export interface ResolvedIcon {
  name: string
  absolutePath: string
  svg: string
}

const iconCache = new Map<string, ResolvedIcon[]>()

/**
 * Resolves SVG icon files from the given absolute directories (one per layer that
 * contributes to a prefix, root-first), deduped by basename so the closer layer
 * wins. Sanitizes each SVG and caches results until the watcher calls
 * `resetIconsResolver()`.
 */
export function resolveIconFiles(absDirs: string[]): ResolvedIcon[] {
  const cacheKey = absDirs.map((d) => normalize(d)).join('\0')
  const cached = iconCache.get(cacheKey)
  if (isDefined(cached)) {
    return cached
  }

  const icons: ResolvedIcon[] = []
  const seen = new Set<string>()
  const skippedNames: string[] = []
  const skippedSanitization: string[] = []

  for (const absDir of absDirs) {
    let entries: string[]
    try {
      entries = fs.readdirSync(absDir)
    } catch {
      continue
    }

    for (const entry of entries) {
      if (extname(entry).toLowerCase() !== '.svg') {
        continue
      }

      const name = basename(entry, extname(entry))
      if (!ICON_NAME_PATTERN.test(name)) {
        skippedNames.push(join(absDir, entry))
        continue
      }
      if (seen.has(name)) {
        continue
      }

      const absolutePath = join(absDir, entry)
      let raw: string
      try {
        raw = fs.readFileSync(absolutePath, 'utf-8')
      } catch {
        continue
      }

      const { svg } = sanitizeSvg(raw)
      if (isEmpty(svg)) {
        skippedSanitization.push(absolutePath)
        continue
      }

      seen.add(name)
      icons.push({ name, absolutePath, svg })
    }
  }

  if (useNuxt().options.runtimeConfig.pruvious.debug.warnings === 'all') {
    if (skippedNames.length) {
      warnWithContext('Skipped icon files with unsupported names. Use only letters, digits, `_` and `-`.', skippedNames)
    }
    if (skippedSanitization.length) {
      warnWithContext('Skipped icon files that produced empty output after SVG sanitization.', skippedSanitization)
    }
  }

  icons.sort((a, b) => a.name.localeCompare(b.name))
  iconCache.set(cacheKey, icons)
  return icons
}

/**
 * Drops the `resolveIconFiles` cache.
 */
export function resetIconsResolver() {
  iconCache.clear()
}
