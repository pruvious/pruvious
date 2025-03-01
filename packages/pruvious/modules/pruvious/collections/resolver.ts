import { isDefined, pascalCase, slugify } from '@pruvious/utils'
import { colorize } from 'consola/utils'
import { useNuxt } from 'nuxt/kit'
import type { NuxtConfigLayer } from 'nuxt/schema'
import { relative } from 'pathe'
import { debug, warnWithContext } from '../debug/console'
import { resolveFromLayers, type ResolveFromLayersResult } from '../utils/resolve'

/**
 * Key-value object containing collection names and their definition file locations.
 */
let collections: Record<string, ResolveFromLayersResult> | undefined

/**
 * Retrieves a key-value object containing collection names and their definition file locations.
 * It scans the `<serverDir>/<pruvious.dir.collections>` directories across all Nuxt layers.
 */
export function resolveCollectionFiles(): Record<string, ResolveFromLayersResult> {
  if (!collections) {
    collections = {}

    const nuxt = useNuxt()
    const duplicates: Record<string, { slug: string; layer: NuxtConfigLayer; relativePath: string }> = {}

    for (const location of resolveFromLayers({
      nuxtDir: 'serverDir',
      pruviousDir: (options) => options.dir?.collections ?? 'collections',
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(`Resolving collections in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`),
    })) {
      const { layer, file, base, pruviousDirNames } = location
      const collectionName = pascalCase(pruviousDirNames.join('-') + '-' + base)
      const slug = slugify(collectionName)

      if (isDefined(duplicates[collectionName]) && duplicates[collectionName].layer === layer) {
        warnWithContext(`Two collection files resolving to the same name \`${collectionName}\`:`, [
          file.relative,
          duplicates[collectionName].relativePath,
        ])
        continue
      }

      const duplicateSlug = Object.values(duplicates).find((duplicate) => duplicate.slug === slug)
      if (duplicateSlug && duplicateSlug.layer === layer) {
        warnWithContext(`Two collection files resolving to the same slug \`${slug}\`:`, [
          file.relative,
          duplicateSlug.relativePath,
        ])
        continue
      }

      if (isDefined(collections[collectionName])) {
        debug(`Skipping collection <${collectionName}> as it was previously resolved in a parent layer`)
        continue
      }

      if (collectionName === 'Options') {
        warnWithContext(`The collection name ${colorize('yellow', collectionName)} is reserved.`, [
          `This is a system table utilized by the \`@pruvious/orm\` package.`,
          `Source: ${colorize('dim', file.relative)}`,
        ])
        continue
      }

      if (collectionName === 'Cache' && nuxt.options.runtimeConfig.pruvious.cache.driver === 'mainDatabase') {
        warnWithContext(`The collection name ${colorize('yellow', collectionName)} is reserved.`, [
          `This is a system table utilized by the \`@pruvious/orm\` package.`,
          `Source: ${colorize('dim', file.relative)}`,
        ])
        continue
      }

      if (collectionName === 'Queue' && nuxt.options.runtimeConfig.pruvious.queue.driver === 'mainDatabase') {
        warnWithContext(`The collection name ${colorize('yellow', collectionName)} is reserved.`, [
          `This is a system table utilized by the \`@pruvious/orm\` package.`,
          `Source: ${colorize('dim', file.relative)}`,
        ])
        continue
      }

      if (collectionName.length > 63) {
        warnWithContext(`The collection name ${colorize('yellow', collectionName)} is too long.`, [
          `Collection names must be 63 characters or fewer.`,
          `Source: ${colorize('dim', file.relative)}`,
        ])
        continue
      }

      collections[collectionName] = location
      duplicates[collectionName] = { slug, layer, relativePath: file.relative }
      debug(`Resolved collection \`${collectionName}\` in <${file.relative}>`)
    }
  }

  return collections
}

export function resetCollectionsResolver() {
  collections = undefined
}
