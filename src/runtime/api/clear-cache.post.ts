import { useRuntimeConfig } from '#imports'
import { defineEventHandler, setResponseStatus } from 'h3'
import { isProduction } from 'std-env'
import { cache as getRedisCache } from '../instances/cache'
import { clearPageCache } from '../plugins/page-cache'
import { __ } from '../utils/server/translate-string'
import { getCapabilities } from '../utils/users'

export default defineEventHandler(async (event) => {
  if (!event.context.auth.isLoggedIn) {
    setResponseStatus(event, 401)
    return __(event, 'pruvious-server', 'Unauthorized due to either invalid credentials or missing authentication')
  }

  if (!event.context.auth.user.isAdmin && !getCapabilities(event.context.auth.user)['clear-cache']) {
    setResponseStatus(event, 403)
    return __(event, 'pruvious-server', 'Forbidden due to insufficient permissions')
  }

  const redisCache = await getRedisCache()
  const runtimeConfig = useRuntimeConfig()

  if (redisCache || (isProduction && runtimeConfig.pruvious.pageCache)) {
    redisCache?.flushDb()
    await clearPageCache()
    setResponseStatus(event, 204)
    return ''
  }

  setResponseStatus(event, 404)
  return __(event, 'pruvious-server', 'Resource not found')
})
