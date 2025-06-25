import {
  __,
  pruviousError,
  resolveContextLanguage,
  resolveRoute,
  type ResolvedRoute,
  type RouteRedirect,
} from '#pruvious/server'
import { randomIdentifier, withLeadingSlash } from '@pruvious/utils'
import type { H3Event } from 'h3'
import { isProduction } from 'std-env'
import { logRequest } from '../../../modules/pruvious/debug/logs'

export default defineEventHandler(async (event) => {
  const { basePath } = useRuntimeConfig().pruvious.api
  return resolveRouteEventHandler(event, event.path.slice((basePath + 'routes').length))
})

export async function resolveRouteEventHandler(event: H3Event, path: string): Promise<ResolvedRoute | RouteRedirect> {
  const runtimeConfig = useRuntimeConfig()
  const subpaths = path.split('/').filter(Boolean)

  event.context.pruvious ??= { auth: { isLoggedIn: false, user: null, permissions: [] } } as any
  event.context.pruvious.requestDebugId = runtimeConfig.pruvious.debug.logs.enabled ? randomIdentifier() : ''

  await resolveContextLanguage()
  event.waitUntil(logRequest()) // @todo replace with analytics

  if (
    subpaths[0] === runtimeConfig.pruvious.i18n.primaryLanguage &&
    !runtimeConfig.pruvious.i18n.prefixPrimaryLanguage
  ) {
    const code = isProduction ? 301 : 302
    setResponseStatus(event, code)
    return { to: withLeadingSlash(subpaths.slice(1).join('/')), code, forwardQueryParams: true }
  }

  const resolvedRoute = await resolveRoute(path)

  if (!resolvedRoute) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Resource not found'),
    })
  }

  return resolvedRoute
}
