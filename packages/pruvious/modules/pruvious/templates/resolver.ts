import { isDefined, pascalCase } from '@pruvious/utils'
import { useNuxt } from 'nuxt/kit'
import type { NuxtConfigLayer } from 'nuxt/schema'
import { relative } from 'pathe'
import { debug, warnWithContext } from '../debug/console'
import { resolveFromLayers, type ResolveFromLayersResult } from '../utils/resolve'

/**
 * Key-value object containing template names and their definition file locations.
 */
let templates: Record<string, ResolveFromLayersResult> | undefined

/**
 * Retrieves a key-value object containing collection template names and their definition locations.
 * It scans the `<serverDir>/<pruvious.dir.templates>` directories across all Nuxt layers.
 */
export function resolveTemplateFiles(): Record<string, ResolveFromLayersResult> {
  if (!templates) {
    templates = {}

    const nuxt = useNuxt()
    const duplicates: Record<string, { layer: NuxtConfigLayer; relativePath: string }> = {}

    for (const location of resolveFromLayers({
      nuxtDir: 'serverDir',
      pruviousDir: (options) => options.dir?.templates ?? 'templates',
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(`Resolving templates in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`),
    })) {
      const { layer, file, base, pruviousDirNames } = location
      const templateName = pascalCase(pruviousDirNames.join('-') + '-' + base)

      if (isDefined(duplicates[templateName]) && duplicates[templateName].layer === layer) {
        warnWithContext(`Two template files resolving to the same name \`${templateName}\`:`, [
          file.relative,
          duplicates[templateName].relativePath,
        ])
        continue
      }

      if (isDefined(templates[templateName])) {
        debug(`Skipping template <${templateName}> as it was previously resolved in a parent layer`)
        continue
      }

      templates[templateName] = location
      duplicates[templateName] = { layer, relativePath: file.relative }
      debug(`Resolved template \`${templateName}\` in <${file.relative}>`)
    }
  }

  return templates
}

export function resetTemplatesResolver() {
  templates = undefined
}
