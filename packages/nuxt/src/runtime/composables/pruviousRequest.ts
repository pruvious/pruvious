import { usePruvious, useRoute, useRuntimeConfig } from '#imports'

export interface Options {
  clientCache: number | 'max'
  serverCache: number | 'max'
  method?:
    | 'GET'
    | 'HEAD'
    | 'PATCH'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'CONNECT'
    | 'OPTIONS'
    | 'TRACE'
    | 'get'
    | 'head'
    | 'patch'
    | 'post'
    | 'put'
    | 'delete'
    | 'connect'
    | 'options'
    | 'trace'
  headers?: Record<string, string>
  body?: Record<string, any> | FormData
}

const cached: Record<string, { timestamp: number; response: ReturnType<typeof $fetch> | null }> = {}

/**
 * Make a request to the Pruvious API.
 */
export async function _pruviousRequest(path: string, options: Options) {
  const config = useRuntimeConfig()
  const route = useRoute()
  const pruvious = usePruvious()
  const method = options.method ?? 'GET'
  const headers = options.headers
  const body = options.body
  const key = `pruvious:${method.toUpperCase()}:${path}`
  const now = Date.now()
  const clientCache = options.clientCache === 'max' ? 99999999999999 : options.clientCache

  let response: ReturnType<typeof $fetch> | null = null
  let cache = process.server
    ? options.serverCache === 'max'
      ? 99999999999999
      : options.serverCache
    : clientCache

  for (const _key of Object.keys(cached)) {
    if (now > cached[_key].timestamp) {
      delete cached[_key]
    }
  }

  if (process.client && pruvious.value.data[key] && pruvious.value.data[key].timestamp >= now) {
    return pruvious.value.data[key].response
  }

  if (route.query.__p) {
    cache = 0
  }

  if (cache && cached[key] !== undefined) {
    if (process.server) {
      pruvious.value.data[key] = {
        timestamp: Date.now() + clientCache,
        response: await cached[key].response,
      }
    }
    return cached[key].response ? await cached[key].response : null
  }

  response = $fetch(`${config.public.pruvious.cmsBaseUrl}/api${path}`, {
    method,
    body,
    headers,
  })

  if (cache) {
    cached[key] = { timestamp: Date.now() + cache, response }
  }

  try {
    if (process.server) {
      pruvious.value.data[key] = { timestamp: Date.now() + clientCache, response: await response }
    }

    return await response
  } catch (_) {
    if (cache) {
      cached[key] = { timestamp: Date.now() + cache, response: null }
    }
    return null
  }
}
