import { validatorsMeta } from '@pruvious/orm'
import { isArray } from '@pruvious/utils'
import fs from 'node:fs'
import { createResolver, useNuxt } from 'nuxt/kit'
import { basename, extname, join, resolve } from 'pathe'

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
