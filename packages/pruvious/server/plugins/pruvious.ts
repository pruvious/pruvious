import { initAllDatabases, initStorage, loadActions, loadFilters } from '#pruvious/server'
import { isObject } from '@pruvious/utils'
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
})
