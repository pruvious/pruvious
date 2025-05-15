import { remove } from '@pruvious/utils'
import { useDebounceFn } from '@vueuse/core'
import fs from 'node:fs'
import { useNitro, useNuxt } from 'nuxt/kit'
import type { NuxtConfigLayer, WatchEvent } from 'nuxt/schema'
import { join, relative } from 'pathe'
import { resetServerHandlersResolver } from '../api/resolver'
import { resetBlocksResolver, resolveBlockDefinition, resolveBlockFiles } from '../blocks/resolver'
import { generateClientFiles } from '../build/client'
import { generateServerFiles } from '../build/server'
import { resetCollectionsResolver } from '../collections/resolver'
import { resolveCustomComponentsInFile } from '../components/resolver'
import {
  debouncedWriteDashboardPages,
  resetDashboardPagesResolver,
  resolveDashboardPageDefinition,
  resolveDashboardPageFiles,
} from '../dashboard-pages/resolver'
import { debug } from '../debug/console'
import { resetFieldsResolver } from '../fields/resolver'
import { clearCachedClientHooks, clearCachedServerHooks } from '../hooks/resolver'
import { resetJobsResolver } from '../queue/resolver'
import { resetSingletonsResolver } from '../singletons/resolver'
import { resetTemplatesResolver } from '../templates/resolver'
import { resetTranslationsResolver } from '../translations/resolver'
import { getClientViteServers } from './vite-server'

type PruviousFileType =
  | 'collection-definition'
  | 'singleton-definition'
  | 'block-component'
  | 'field-definition'
  | 'field-component'
  | 'job-definition'
  | 'template-definition'
  | 'translation-definition'
  | 'server-handler'
  | 'client-hook'
  | 'server-hook'
  | 'client-action'
  | 'server-action'
  | 'client-filter'
  | 'server-filter'
  | 'shared-file'
  | 'dashboard-page'

const skipped: string[] = []

/**
 * Watches Pruvious files for changes.
 */
export async function watchPruviousFiles(event: WatchEvent, path: string) {
  const nuxt = useNuxt()
  const { type, layer } = resolvePruviousFile(path)

  if (!type) {
    return
  }

  // Skip newly created files
  if (event === 'add' && !fs.readFileSync(path, 'utf-8').trim()) {
    skipped.push(path)
    return
  }

  if (type === 'collection-definition') {
    resolveCustomComponentsInFile({
      file: path,
      srcDir: layer.config.srcDir,
      srcDirs: nuxt.options._layers.map(({ config }) => config.srcDir),
    })

    if (event === 'add' || event === 'unlink' || skipped.includes(path)) {
      remove(path, skipped)
      resetCollectionsResolver()
      generateServerFiles()
    }

    reloadOnNitroCompiled(event, path)
    return
  }

  if (type === 'singleton-definition') {
    resolveCustomComponentsInFile({
      file: path,
      srcDir: layer.config.srcDir,
      srcDirs: nuxt.options._layers.map(({ config }) => config.srcDir),
    })

    if (event === 'add' || event === 'unlink' || skipped.includes(path)) {
      remove(path, skipped)
      resetSingletonsResolver()
      generateServerFiles()
    }

    reloadOnNitroCompiled(event, path)
    return
  }

  if (type === 'block-component') {
    if (event === 'add' || event === 'unlink' || skipped.includes(path)) {
      remove(path, skipped)
      resetTemplatesResolver()
      resetCollectionsResolver()
      resetBlocksResolver()
      resetSingletonsResolver()
      generateClientFiles()
      generateServerFiles()
      resolveBlockFiles()
      reloadOnNitroCompiled(event, path)
    } else {
      const written = await resolveBlockDefinition({ vueFile: path, srcDir: layer.config.srcDir })
      resolveCustomComponentsInFile({
        file: path,
        srcDir: layer.config.srcDir,
        srcDirs: nuxt.options._layers.map(({ config }) => config.srcDir),
      })
      if (written) {
        reloadOnNitroCompiled(event, path)
      }
    }

    return
  }

  if (type === 'field-definition') {
    if (event === 'add' || event === 'unlink' || skipped.includes(path)) {
      remove(path, skipped)
      resetFieldsResolver()
      resetTemplatesResolver()
      resetCollectionsResolver()
      resetSingletonsResolver()
      resetBlocksResolver()
      generateClientFiles()
      generateServerFiles()
      resolveBlockFiles()
    }

    reloadOnNitroCompiled(event, path)
    return
  }

  if (type === 'field-component') {
    if (event === 'add' || event === 'unlink' || skipped.includes(path)) {
      remove(path, skipped)
      resetFieldsResolver()
      resetTemplatesResolver()
      resetCollectionsResolver()
      resetSingletonsResolver()
      resetBlocksResolver()
      generateClientFiles()
      generateServerFiles()
      resolveBlockFiles()
      reloadOnNitroCompiled(event, path)
    }

    return
  }

  if (type === 'job-definition') {
    resetJobsResolver()
    generateServerFiles()
    return
  }

  if (type === 'template-definition') {
    resolveCustomComponentsInFile({
      file: path,
      srcDir: layer.config.srcDir,
      srcDirs: nuxt.options._layers.map(({ config }) => config.srcDir),
    })

    if (event === 'add' || event === 'unlink' || skipped.includes(path)) {
      remove(path, skipped)
      resetTemplatesResolver()
      resetCollectionsResolver()
      resetSingletonsResolver()
      generateServerFiles()
    }

    reloadOnNitroCompiled(event, path)
    return
  }

  if (type === 'translation-definition') {
    if (event === 'add' || event === 'unlink' || skipped.includes(path)) {
      remove(path, skipped)
      resetTranslationsResolver()
      generateClientFiles()
      generateServerFiles()
    }

    reloadOnNitroCompiled(event, path)
    return
  }

  if (type === 'server-handler') {
    if (event === 'add' || event === 'unlink' || skipped.includes(path)) {
      remove(path, skipped)
      resetServerHandlersResolver()
      generateServerFiles()
    }

    reloadOnNitroCompiled(event, path)
    return
  }

  if (type === 'client-hook' || type === 'client-action' || type === 'client-filter') {
    clearCachedClientHooks()
    generateClientFiles()
    return
  }

  if (type === 'server-hook' || type === 'server-action' || type === 'server-filter') {
    if (event === 'add' || event === 'unlink' || skipped.includes(path)) {
      remove(path, skipped)
      clearCachedServerHooks()
      generateServerFiles()
    }

    reloadOnNitroCompiled(event, path)
    return
  }

  if (type === 'shared-file') {
    resolveCustomComponentsInFile({
      file: path,
      srcDir: layer.config.srcDir,
      srcDirs: nuxt.options._layers.map(({ config }) => config.srcDir),
    })
    return
  }

  if (type === 'dashboard-page') {
    if (event === 'add' || event === 'unlink' || skipped.includes(path)) {
      remove(path, skipped)
      resetDashboardPagesResolver()
      resolveDashboardPageFiles(false)
      const written = await debouncedWriteDashboardPages()
      if (written) {
        reloadOnNitroCompiled(event, path)
      }
    } else {
      const written = await resolveDashboardPageDefinition({ vueFile: path, srcDir: layer.config.srcDir })
      if (written) {
        reloadOnNitroCompiled(event, path)
      }
    }

    return
  }
}

function resolvePruviousFile(
  path: string,
): { type: PruviousFileType; layer: NuxtConfigLayer } | { type: null; layer: null } {
  const nuxt = useNuxt()

  for (const layer of nuxt.options._layers) {
    // Collection definitions
    if (
      layer.config.serverDir &&
      path.startsWith(join(layer.config.serverDir, layer.config.pruvious?.dir?.collections ?? 'collections') + '/')
    ) {
      return { type: 'collection-definition', layer }
    }

    // Singleton definitions
    if (
      layer.config.serverDir &&
      path.startsWith(join(layer.config.serverDir, layer.config.pruvious?.dir?.singletons ?? 'singletons') + '/')
    ) {
      return { type: 'singleton-definition', layer }
    }

    // Block components
    if (path.startsWith(join(layer.config.srcDir, layer.config.pruvious?.dir?.blocks ?? 'blocks') + '/')) {
      return { type: 'block-component', layer }
    }

    // Field definitions
    if (
      layer.config.serverDir &&
      path.startsWith(join(layer.config.serverDir, layer.config.pruvious?.dir?.fields?.definitions ?? 'fields') + '/')
    ) {
      return { type: 'field-definition', layer }
    }

    // Field components
    if (path.startsWith(join(layer.config.srcDir, layer.config.pruvious?.dir?.fields?.components ?? 'fields') + '/')) {
      return { type: 'field-component', layer }
    }

    // Job definitions
    if (
      layer.config.serverDir &&
      path.startsWith(join(layer.config.serverDir, layer.config.pruvious?.dir?.jobs ?? 'jobs') + '/')
    ) {
      return { type: 'job-definition', layer }
    }

    // Template definitions
    if (
      layer.config.serverDir &&
      path.startsWith(join(layer.config.serverDir, layer.config.pruvious?.dir?.templates ?? 'templates') + '/')
    ) {
      return { type: 'template-definition', layer }
    }

    // Translation definitions
    if (
      layer.config.serverDir &&
      path.startsWith(join(layer.config.serverDir, layer.config.pruvious?.dir?.translations ?? 'translations') + '/')
    ) {
      return { type: 'translation-definition', layer }
    }

    // Server handlers
    if (
      layer.config.serverDir &&
      path.startsWith(join(layer.config.serverDir, layer.config.pruvious?.dir?.api ?? 'pruvious-api') + '/')
    ) {
      return { type: 'server-handler', layer }
    }

    // Client hooks
    if (path.startsWith(join(layer.config.srcDir, layer.config.pruvious?.dir?.hooks?.client ?? 'hooks') + '/')) {
      return { type: 'client-hook', layer }
    }

    // Server hooks
    if (
      layer.config.serverDir &&
      path.startsWith(join(layer.config.serverDir, layer.config.pruvious?.dir?.hooks?.server ?? 'hooks') + '/')
    ) {
      return { type: 'server-hook', layer }
    }

    // Client actions
    if (path.startsWith(join(layer.config.srcDir, layer.config.pruvious?.dir?.actions?.client ?? 'actions') + '/')) {
      return { type: 'client-action', layer }
    }

    // Server actions
    if (
      layer.config.serverDir &&
      path.startsWith(join(layer.config.serverDir, layer.config.pruvious?.dir?.actions?.server ?? 'actions') + '/')
    ) {
      return { type: 'server-action', layer }
    }

    // Client filters
    if (path.startsWith(join(layer.config.srcDir, layer.config.pruvious?.dir?.filters?.client ?? 'filters') + '/')) {
      return { type: 'client-filter', layer }
    }

    // Server filters
    if (
      layer.config.serverDir &&
      path.startsWith(join(layer.config.serverDir, layer.config.pruvious?.dir?.filters?.server ?? 'filters') + '/')
    ) {
      return { type: 'server-filter', layer }
    }

    // Shared files
    if (path.startsWith(join(layer.config.rootDir, layer.config.dir?.shared ?? 'shared') + '/')) {
      return { type: 'shared-file', layer }
    }

    // Dashboard pages
    if (path.startsWith(join(layer.config.srcDir, layer.config.dir?.pages ?? 'pages') + '/')) {
      return { type: 'dashboard-page', layer }
    }
  }

  return { type: null, layer: null }
}

function reload(event: WatchEvent, path: string) {
  const nuxt = useNuxt()
  const servers = getClientViteServers()

  if (servers.length) {
    debug(`Reloading Vite server due to <${event}> event in <${relative(nuxt.options.workspaceDir, path)}>`)
    servers.forEach(({ hot }) => hot.send('pruvious:reload'))
  } else {
    debug(`Restarting development server due to <${event}> event in <${relative(nuxt.options.workspaceDir, path)}>`)
    nuxt.callHook('restart')
  }
}

function reloadOnNitroCompiled(event: WatchEvent, path: string) {
  const nitro = useNitro()
  nitro.hooks.hookOnce('compiled', () => reloadDebounced(event, path))
}

const reloadDebounced = useDebounceFn(reload, 50)
