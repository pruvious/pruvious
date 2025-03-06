import { isDefined, kebabCase, uniqueArray } from '@pruvious/utils'
import fs from 'node:fs'
import { useNuxt } from 'nuxt/kit'
import type { NuxtConfigLayer } from 'nuxt/schema'
import { join, relative } from 'pathe'
import { debug, warnWithContext } from '../debug/console'
import { extractStringLiteralArguments } from '../utils/ast'
import { reduceFileNameSegments, resolveFromLayers, type ResolveFromLayersResult } from '../utils/resolve'

/**
 * Key-value object containing action names and their definition file locations for both client and server.
 */
const actionDefinitions: {
  client: Record<string, ResolveFromLayersResult> | undefined
  server: Record<string, ResolveFromLayersResult> | undefined
} = {
  client: undefined,
  server: undefined,
}

/**
 * Key-value object containing filter names and their definition file locations for both client and server.
 */
const filterDefinitions: {
  client: Record<string, ResolveFromLayersResult> | undefined
  server: Record<string, ResolveFromLayersResult> | undefined
} = {
  client: undefined,
  server: undefined,
}

/**
 * Key-value object containing action names and their callback file locations for both client and server.
 */
const actionCallbacks: {
  client: Record<string, ResolveFromLayersResult[]> | undefined
  server: Record<string, ResolveFromLayersResult[]> | undefined
} = {
  client: undefined,
  server: undefined,
}

/**
 * Key-value object containing filter names and their callback file locations for both client and server.
 */
const filterCallbacks: {
  client: Record<string, ResolveFromLayersResult[]> | undefined
  server: Record<string, ResolveFromLayersResult[]> | undefined
} = {
  client: undefined,
  server: undefined,
}

/**
 * Gets an object with two main properties: `client` and `server`.
 * Both properties contain key-value pairs where keys are action names and values are locations to their definition file.
 *
 * It scans the following directories across all Nuxt layers:
 *
 * - `<srcDir>/<pruvious.dir.hooks.client>/actions`
 * - `<serverDir>/<pruvious.dir.hooks.server>/actions`
 */
export function resolveActionDefinitionFiles(): {
  client: Record<string, ResolveFromLayersResult>
  server: Record<string, ResolveFromLayersResult>
} {
  if (!actionDefinitions.client) {
    actionDefinitions.client = {}

    const nuxt = useNuxt()
    const duplicates: Record<string, { layer: NuxtConfigLayer; relativePath: string }> = {}

    for (const location of resolveFromLayers({
      nuxtDir: 'srcDir',
      pruviousDir: (options) => join(options.dir?.hooks?.client ?? 'hooks', 'actions'),
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(
          `Resolving client-side action definitions in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
        ),
    })) {
      const { layer, file, base, pruviousDirNames } = location
      const actionName = reduceFileNameSegments(pruviousDirNames, base).map(kebabCase).join(':')

      if (isDefined(duplicates[actionName]) && duplicates[actionName].layer === layer) {
        warnWithContext(`Two client-side action definition files resolving to the same name \`${actionName}\`:`, [
          file.relative,
          duplicates[actionName].relativePath,
        ])
        continue
      }

      if (isDefined(actionDefinitions.client[actionName])) {
        debug(`Skipping client-side action definition <${actionName}> as it was previously resolved in a parent layer`)
        continue
      }

      actionDefinitions.client[actionName] = location
      duplicates[actionName] = { layer, relativePath: file.relative }
      debug(`Resolved client-side action definition \`${actionName}\` in <${file.relative}>`)
    }
  }

  if (!actionDefinitions.server) {
    actionDefinitions.server = {}

    const nuxt = useNuxt()
    const duplicates: Record<string, { layer: NuxtConfigLayer; relativePath: string }> = {}

    for (const location of resolveFromLayers({
      nuxtDir: 'serverDir',
      pruviousDir: (options) => join(options.dir?.hooks?.server ?? 'hooks', 'actions'),
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(
          `Resolving server-side action definitions in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
        ),
    })) {
      const { layer, file, base, pruviousDirNames } = location
      const actionName = reduceFileNameSegments(pruviousDirNames, base).map(kebabCase).join(':')

      if (isDefined(duplicates[actionName]) && duplicates[actionName].layer === layer) {
        warnWithContext(`Two server-side action definition files resolving to the same name \`${actionName}\`:`, [
          file.relative,
          duplicates[actionName].relativePath,
        ])
        continue
      }

      if (isDefined(actionDefinitions.server[actionName])) {
        debug(`Skipping server-side action definition <${actionName}> as it was previously resolved in a parent layer`)
        continue
      }

      actionDefinitions.server[actionName] = location
      duplicates[actionName] = { layer, relativePath: file.relative }
      debug(`Resolved server-side action definition \`${actionName}\` in <${file.relative}>`)
    }
  }

  return actionDefinitions as any
}

/**
 * Gets an object with two main properties: `client` and `server`.
 * Both properties contain key-value pairs where keys are filter names and values are locations to their definition file.
 *
 * It scans the following directories across all Nuxt layers:
 *
 * - `<srcDir>/<pruvious.dir.hooks.client>/filters`
 * - `<serverDir>/<pruvious.dir.hooks.server>/filters`
 */
export function resolveFilterDefinitionFiles(): {
  client: Record<string, ResolveFromLayersResult>
  server: Record<string, ResolveFromLayersResult>
} {
  if (!filterDefinitions.client) {
    filterDefinitions.client = {}

    const nuxt = useNuxt()
    const duplicates: Record<string, { layer: NuxtConfigLayer; relativePath: string }> = {}

    for (const location of resolveFromLayers({
      nuxtDir: 'srcDir',
      pruviousDir: (options) => join(options.dir?.hooks?.client ?? 'hooks', 'filters'),
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(
          `Resolving client-side filter definitions in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
        ),
    })) {
      const { layer, file, base, pruviousDirNames } = location
      const filterName = reduceFileNameSegments(pruviousDirNames, base).map(kebabCase).join(':')

      if (isDefined(duplicates[filterName]) && duplicates[filterName].layer === layer) {
        warnWithContext(`Two client-side filter definition files resolving to the same name \`${filterName}\`:`, [
          file.relative,
          duplicates[filterName].relativePath,
        ])
        continue
      }

      if (isDefined(filterDefinitions.client[filterName])) {
        debug(`Skipping client-side filter definition <${filterName}> as it was previously resolved in a parent layer`)
        continue
      }

      filterDefinitions.client[filterName] = location
      duplicates[filterName] = { layer, relativePath: file.relative }
      debug(`Resolved client-side filter definition \`${filterName}\` in <${file.relative}>`)
    }
  }

  if (!filterDefinitions.server) {
    filterDefinitions.server = {}

    const nuxt = useNuxt()
    const duplicates: Record<string, { layer: NuxtConfigLayer; relativePath: string }> = {}

    for (const location of resolveFromLayers({
      nuxtDir: 'serverDir',
      pruviousDir: (options) => join(options.dir?.hooks?.server ?? 'hooks', 'filters'),
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(
          `Resolving server-side filter definitions in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
        ),
    })) {
      const { layer, file, base, pruviousDirNames } = location
      const filterName = reduceFileNameSegments(pruviousDirNames, base).map(kebabCase).join(':')

      if (isDefined(duplicates[filterName]) && duplicates[filterName].layer === layer) {
        warnWithContext(`Two server-side filter definition files resolving to the same name \`${filterName}\`:`, [
          file.relative,
          duplicates[filterName].relativePath,
        ])
        continue
      }

      if (isDefined(filterDefinitions.server[filterName])) {
        debug(`Skipping server-side filter definition <${filterName}> as it was previously resolved in a parent layer`)
        continue
      }

      filterDefinitions.server[filterName] = location
      duplicates[filterName] = { layer, relativePath: file.relative }
      debug(`Resolved server-side filter definition \`${filterName}\` in <${file.relative}>`)
    }
  }

  return filterDefinitions as any
}

/**
 * Gets an object with two main properties: `client` and `server`.
 * Both properties contain key-value pairs where keys are action names and values are locations to their callback files.
 *
 * It scans the following directories across all Nuxt layers:
 *
 * - `<srcDir>/<pruvious.dir.actions.client>`
 * - `<serverDir>/<pruvious.dir.actions.server>`
 */
export function resolveActionCallbackFiles(): {
  client: Record<string, ResolveFromLayersResult[]>
  server: Record<string, ResolveFromLayersResult[]>
} {
  if (!actionCallbacks.client) {
    actionCallbacks.client = {}

    const nuxt = useNuxt()

    for (const location of resolveFromLayers({
      nuxtDir: 'srcDir',
      pruviousDir: (options) => options.dir?.actions?.client ?? 'actions',
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(
          `Resolving client-side action callbacks in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
        ),
    })) {
      const { file, ext } = location
      const code = fs.readFileSync(file.absolute, 'utf-8')
      const names = extractStringLiteralArguments({
        code,
        mode: ext === 'ts' ? 'ts' : 'js',
        targetFunctionNames: ['addAction'],
      })
        .flatMap(({ args }) => args[0])
        .filter(Boolean) as string[]

      for (const name of uniqueArray(names)) {
        actionCallbacks.client[name] ??= []
        actionCallbacks.client[name].push(location)
      }

      debug(`Resolved client-side action callbacks in <${file.relative}>`)
    }
  }

  if (!actionCallbacks.server) {
    actionCallbacks.server = {}

    const nuxt = useNuxt()

    for (const location of resolveFromLayers({
      nuxtDir: 'serverDir',
      pruviousDir: (options) => options.dir?.actions?.server ?? 'actions',
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(
          `Resolving server-side action callbacks in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
        ),
    })) {
      const { file, ext } = location
      const code = fs.readFileSync(file.absolute, 'utf-8')
      const names = extractStringLiteralArguments({
        code,
        mode: ext === 'ts' ? 'ts' : 'js',
        targetFunctionNames: ['addAction'],
      })
        .flatMap(({ args }) => args[0])
        .filter(Boolean) as string[]

      for (const name of names) {
        actionCallbacks.server[name] ??= []
        actionCallbacks.server[name].push(location)
      }

      debug(`Resolved server-side action callbacks in <${file.relative}>`)
    }
  }

  return actionCallbacks as any
}

/**
 * Gets an object with two main properties: `client` and `server`.
 * Both properties contain key-value pairs where keys are filter names and values are locations to their callback files.
 *
 * It scans the following directories across all Nuxt layers:
 *
 * - `<srcDir>/<pruvious.dir.filters.client>`
 * - `<serverDir>/<pruvious.dir.filters.server>`
 */
export function resolveFilterCallbackFiles(): {
  client: Record<string, ResolveFromLayersResult[]>
  server: Record<string, ResolveFromLayersResult[]>
} {
  if (!filterCallbacks.client) {
    filterCallbacks.client = {}

    const nuxt = useNuxt()

    for (const location of resolveFromLayers({
      nuxtDir: 'srcDir',
      pruviousDir: (options) => options.dir?.filters?.client ?? 'filters',
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(
          `Resolving client-side filter callbacks in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
        ),
    })) {
      const { file, ext } = location
      const code = fs.readFileSync(file.absolute, 'utf-8')
      const names = extractStringLiteralArguments({
        code,
        mode: ext === 'ts' ? 'ts' : 'js',
        targetFunctionNames: ['addFilter'],
      })
        .flatMap(({ args }) => args[0])
        .filter(Boolean) as string[]

      for (const name of names) {
        filterCallbacks.client[name] ??= []
        filterCallbacks.client[name].push(location)
      }

      debug(`Resolved client-side filter callbacks in <${file.relative}>`)
    }
  }

  if (!filterCallbacks.server) {
    filterCallbacks.server = {}

    const nuxt = useNuxt()

    for (const location of resolveFromLayers({
      nuxtDir: 'serverDir',
      pruviousDir: (options) => options.dir?.filters?.server ?? 'filters',
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(
          `Resolving server-side filter callbacks in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`,
        ),
    })) {
      const { file, ext } = location
      const code = fs.readFileSync(file.absolute, 'utf-8')
      const names = extractStringLiteralArguments({
        code,
        mode: ext === 'ts' ? 'ts' : 'js',
        targetFunctionNames: ['addFilter'],
      })
        .flatMap(({ args }) => args[0])
        .filter(Boolean) as string[]

      for (const name of names) {
        filterCallbacks.server[name] ??= []
        filterCallbacks.server[name].push(location)
      }

      debug(`Resolved server-side filter callbacks in <${file.relative}>`)
    }
  }

  return filterCallbacks as any
}

/**
 * Clears the client-side action and filter cache.
 */
export function clearCachedClientHooks() {
  actionDefinitions.client = undefined
  filterDefinitions.client = undefined
  actionCallbacks.client = undefined
  filterCallbacks.client = undefined
}

export function resetHooksResolver() {
  actionDefinitions.client = undefined
  actionDefinitions.server = undefined
  filterDefinitions.client = undefined
  filterDefinitions.server = undefined
  actionCallbacks.client = undefined
  actionCallbacks.server = undefined
  filterCallbacks.client = undefined
  filterCallbacks.server = undefined
}
