import { camelCase, isDefined } from '@pruvious/utils'
import { useNuxt } from 'nuxt/kit'
import type { NuxtConfigLayer } from 'nuxt/schema'
import { relative } from 'pathe'
import { debug, warnWithContext } from '../debug/console'
import {
  normalizeSegments,
  reduceFileNameSegments,
  resolveFromLayers,
  type ResolveFromLayersResult,
} from '../utils/resolve'

type FieldComponents = Record<string, { regular?: ResolveFromLayersResult; table?: ResolveFromLayersResult }>

/**
 * Key-value object containing field names and their definition file locations.
 */
let fieldDefinitions: Record<string, ResolveFromLayersResult> | undefined

/**
 * Key-value object containing field names and their component file locations for both regular and table views.
 */
let fieldComponents: FieldComponents | undefined

/**
 * Retrieves a key-value object containing field names and their definition file locations.
 * It scans the `<serverDir>/<pruvious.dir.fields.definitions>` directories across all Nuxt layers.
 */
export function resolveFieldDefinitionFiles(): Record<string, ResolveFromLayersResult> {
  if (!fieldDefinitions) {
    fieldDefinitions = {}

    const nuxt = useNuxt()
    const duplicates: Record<string, { layer: NuxtConfigLayer; relativePath: string }> = {}

    for (const location of resolveFromLayers({
      nuxtDir: 'serverDir',
      pruviousDir: (options) => options.dir?.fields?.definitions ?? 'fields',
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(`Resolving field definitions in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`),
    })) {
      const { layer, file, base, pruviousDirNames } = location
      const fieldName = camelCase(normalizeSegments(reduceFileNameSegments(pruviousDirNames, base)))

      if (isDefined(duplicates[fieldName]) && duplicates[fieldName].layer === layer) {
        warnWithContext(`Two field definition files resolving to the same name \`${fieldName}\`:`, [
          file.relative,
          duplicates[fieldName].relativePath,
        ])
        continue
      }

      if (isDefined(fieldDefinitions[fieldName])) {
        debug(`Skipping field definition <${fieldName}> as it was previously resolved in a parent layer`)
        continue
      }

      fieldDefinitions[fieldName] = location
      duplicates[fieldName] = { layer, relativePath: file.relative }
      debug(`Resolved field definition \`${fieldName}\` in <${file.relative}>`)
    }
  }

  return fieldDefinitions
}

/**
 * Retrieves a key-value object containing field names and their component file locations for both regular and table views.
 * It scans the `<srcDir>/<pruvious.dir.fields.components>` directories across all Nuxt layers.
 */
export function resolveFieldComponentFiles(): FieldComponents {
  if (!fieldComponents) {
    fieldComponents = {}

    const nuxt = useNuxt()
    const duplicates: Record<string, { layer: NuxtConfigLayer; relativePath: string }> = {}

    for (const location of resolveFromLayers({
      nuxtDir: 'srcDir',
      pruviousDir: (options) => options.dir?.fields?.components ?? 'fields',
      extensions: ['vue'],
      beforeResolve: (layer) =>
        debug(`Resolving field components in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`),
    })) {
      const { layer, file, base, pruviousDirNames } = location
      const type: 'regular' | 'table' = base.endsWith('.table') ? 'table' : 'regular'
      const slug = normalizeSegments(reduceFileNameSegments(pruviousDirNames, base.replace(/\.(?:regular|table)$/, '')))
      const fieldName =
        pruviousDirNames[0] && ['collections', 'singletons'].includes(pruviousDirNames[0])
          ? slug.replaceAll('-', '/')
          : camelCase(slug)
      const duplicate = duplicates[`${fieldName}.${type}`]

      if (isDefined(duplicate) && duplicate.layer === layer) {
        warnWithContext(`Two field component files resolving to the same name \`${fieldName}\`:`, [
          file.relative,
          duplicate.relativePath,
        ])
        continue
      }

      if (isDefined(fieldComponents[fieldName]?.[type])) {
        debug(`Skipping field component <${fieldName}> as it was previously resolved in a parent layer`)
        continue
      }

      fieldComponents[fieldName] ??= {}
      fieldComponents[fieldName][type] = location
      duplicates[`${fieldName}.${type}`] = { layer, relativePath: file.relative }
      debug(`Resolved field component \`${fieldName}\` in <${file.relative}>`)
    }
  }

  return fieldComponents as any
}

export function resetFieldsResolver() {
  fieldDefinitions = undefined
  fieldComponents = undefined
}
