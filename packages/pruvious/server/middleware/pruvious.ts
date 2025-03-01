import {
  parseBody,
  removeExpiredCacheEntries,
  resolveContextLanguage,
  resolveCurrentUser,
  triggerQueueProcessing,
} from '#pruvious/server'
import { PathMatcher, randomIdentifier } from '@pruvious/utils'
import { logRequest } from '../../modules/pruvious/debug/logs'

let matcher: PathMatcher

/**
 * Server middleware for Pruvious API routes.
 *
 * The middleware performs the following operations:
 *
 * - Defines the `event.context.pruvious` object.
 * - Generates and assigns a unique request debug ID to `event.context.pruvious.requestDebugId`.
 * - Determines the request language and assigns it to `event.context.pruvious.language`.
 * - Validates user authentication status and sets the `event.context.pruvious.auth` context.
 * - Parses the request body and populates `event.context.pruvious.input` and `event.context.pruvious.files`.
 * - Logs the request.
 * - Removes expired cache entries.
 * - Initiates the job queue processing sequence.
 */
export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()
  const path = event.path.split('?')[0]!

  if (!matcher) {
    matcher = new PathMatcher({
      include: runtimeConfig.pruvious.api.middleware.include,
      exclude: runtimeConfig.pruvious.api.middleware.exclude,
    })
  }

  if (matcher.test(path)) {
    // Initialize context
    event.context.pruvious ??= {} as any

    // Debug ID
    event.context.pruvious.requestDebugId = runtimeConfig.pruvious.debug.logs.enabled ? randomIdentifier() : ''

    // Language
    await resolveContextLanguage()

    // Auth
    await resolveCurrentUser()

    // Body
    await parseBody(event)

    // Log request
    event.waitUntil(logRequest())

    // Cache
    event.waitUntil(removeExpiredCacheEntries())

    // Queue
    if (runtimeConfig.pruvious.queue.mode === 'auto') {
      event.waitUntil(triggerQueueProcessing())
    }
  }
})
