import { isDefined, pascalCase, slugify } from '@pruvious/utils'
import { useNuxt } from 'nuxt/kit'
import type { NuxtConfigLayer } from 'nuxt/schema'
import { relative } from 'pathe'
import { debug, warnWithContext } from '../debug/console'
import { resolveFromLayers, type ResolveFromLayersResult } from '../utils/resolve'

/**
 * Key-value object containing singleton names and their definition file locations.
 */
let singletons: Record<string, ResolveFromLayersResult> | undefined

/**
 * Retrieves a key-value object containing singleton names and their definition file locations.
 * It scans the `<serverDir>/<pruvious.dir.singletons>` directories across all Nuxt layers.
 */
export function resolveSingletonFiles(): Record<string, ResolveFromLayersResult> {
  if (!singletons) {
    singletons = {}

    const nuxt = useNuxt()
    const duplicates: Record<string, { slug: string; layer: NuxtConfigLayer; relativePath: string }> = {}

    for (const location of resolveFromLayers({
      nuxtDir: 'serverDir',
      pruviousDir: (options) => options.dir?.singletons ?? 'singletons',
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(`Resolving singletons in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`),
    })) {
      const { layer, file, base, pruviousDirNames } = location
      const singletonName = pascalCase(pruviousDirNames.join('-') + '-' + base)
      const slug = slugify(singletonName)

      if (isDefined(duplicates[singletonName]) && duplicates[singletonName].layer === layer) {
        warnWithContext(`Two singleton files resolving to the same name \`${singletonName}\`:`, [
          file.relative,
          duplicates[singletonName].relativePath,
        ])
        continue
      }

      const duplicateSlug = Object.values(duplicates).find((duplicate) => duplicate.slug === slug)
      if (duplicateSlug && duplicateSlug.layer === layer) {
        warnWithContext(`Two singleton files resolving to the same slug \`${slug}\`:`, [
          file.relative,
          duplicateSlug.relativePath,
        ])
        continue
      }

      if (isDefined(singletons[singletonName])) {
        debug(`Skipping singleton <${singletonName}> as it was previously resolved in a parent layer`)
        continue
      }

      singletons[singletonName] = location
      duplicates[singletonName] = { slug, layer, relativePath: file.relative }
      debug(`Resolved singleton \`${singletonName}\` in <${file.relative}>`)
    }
  }

  return singletons
}

export function resetSingletonsResolver() {
  singletons = undefined
}
