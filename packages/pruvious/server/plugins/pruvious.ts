import { initAllDatabases, initStorage, loadActions, loadFilters, writePageCacheEntry } from '#pruvious/server'
import { isObject, isString } from '@pruvious/utils'
import { getResponseHeader } from 'h3'
import { isWorkerd } from 'std-env'
import { setVerbose } from '../../modules/pruvious/debug/console'
import { logResponseHandler } from '../../modules/pruvious/debug/logs'

/**
 * Pruvious Nitro server plugin.
 *
 * - Sets the verbose mode.
 * - Loads server-side hooks.
 * - Initializes the main, cache, queue, and logs databases.
 * - Initializes the storage driver for uploads.
 * - Adds log hooks.
 */
export default defineNitroPlugin(async (nitro) => {
  const runtimeConfig = useRuntimeConfig()

  // Verbose mode
  setVerbose(runtimeConfig.pruvious.debug.verbose)

  // Hooks
  await loadActions()
  await loadFilters()

  // Init storage and databases
  if (isWorkerd) {
    nitro.hooks.hook('request', async () => {
      initStorage()
      await initAllDatabases()
    })
  } else {
    initStorage()
    await initAllDatabases()
  }

  // Handle logs
  if (runtimeConfig.pruvious.debug.logs.enabled) {
    nitro.hooks.hook('afterResponse', logResponseHandler)
    nitro.hooks.hook('error', (error, { event }) =>
      logResponseHandler(event, {
        body: isObject(error.cause) ? error.cause.data : '',
        errorMessage: error.message,
      }),
    )
  }

  // Page cache writer
  if (runtimeConfig.pruvious.cache.page.enabled) {
    nitro.hooks.hook('render:response', (response, { event }) => {
      const meta = (event?.context as any)?.pruviousPageCache as
        | { key: string; token: string; ttl: number | null }
        | null
        | undefined

      if (!meta || !meta.key || !meta.token) {
        return
      }

      if (!response || response.statusCode !== 200) {
        return
      }

      if (!isString(response.body)) {
        return
      }

      const contentType = response.headers?.['content-type']
      if (!isString(contentType) || !contentType.toLowerCase().startsWith('text/html')) {
        return
      }

      if (event && getResponseHeader(event, 'set-cookie')) {
        return
      }

      const expiresAt = meta.ttl ? Date.now() + meta.ttl * 1000 : null
      event!.waitUntil?.(writePageCacheEntry(meta.key, response.body, expiresAt, meta.token).catch(() => false))
    })
  }
})
