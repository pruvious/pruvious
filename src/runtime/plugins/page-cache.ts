import type { useNitroApp } from '#build/types/nitro-imports'
// @ts-ignore
import { defineNitroPlugin, useRuntimeConfig, type RenderResponse } from '#imports'
import crypto from 'crypto'
import fs from 'fs-extra'
import { isProduction } from 'std-env'
import { resolveAppPath } from '../instances/path'
import type { ModuleOptions } from '../module-types'

export default defineNitroPlugin((nitroApp: ReturnType<typeof useNitroApp>) => {
  const runtimeConfig = useRuntimeConfig()

  if (isProduction && runtimeConfig.pruvious.pageCache) {
    nitroApp.hooks.hook('request', async (event) => {
      const res = await getCachedResponse(event.path)

      if (res) {
        event.respondWith(
          new Response(res.body, {
            headers: res.headers,
            status: res.status,
            statusText: res.statusText,
          }),
        )
      }
    })

    nitroApp.hooks.hook('render:html', async (_, { event }) => {
      await prepareCachedResponse(event.path)
    })

    nitroApp.hooks.hook('render:response', async (response, { event }) => {
      if ((await getCachedResponse(event.path)) === true) {
        await cacheResponse(event.path, response)
      }
    })
  }
})

async function prepareCachedResponse(path: string) {
  const pageCache = useRuntimeConfig().pruvious.pageCache as ModuleOptions['pageCache'] & object
  const hash = crypto.createHash('sha256').update(path).digest('hex')

  if (pageCache.type === 'local') {
    fs.outputFileSync(resolveAppPath(pageCache.path, hash), 'true')
  } else if (pageCache.type === 'redis') {
    const { cache } = await import('../instances/cache')
    await (await cache(true))?.set(`pruvious:page-cache:${hash}`, 'true')
  }
}

async function cacheResponse(path: string, response: Partial<RenderResponse>) {
  const pageCache = useRuntimeConfig().pruvious.pageCache as ModuleOptions['pageCache'] & object
  const hash = crypto.createHash('sha256').update(path).digest('hex')

  if (pageCache.type === 'local') {
    fs.outputFileSync(resolveAppPath(pageCache.path, hash), JSON.stringify(response))
  } else if (pageCache.type === 'redis') {
    const { cache } = await import('../instances/cache')
    await (await cache(true))?.set(`pruvious:page-cache:${hash}`, JSON.stringify(response))
  }
}

async function getCachedResponse(path: string): Promise<Partial<RenderResponse> | null> {
  const pageCache = useRuntimeConfig().pruvious.pageCache as ModuleOptions['pageCache'] & object
  const hash = crypto.createHash('sha256').update(path).digest('hex')

  if (pageCache.type === 'local') {
    const filePath = resolveAppPath(pageCache.path, hash)

    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
  } else if (pageCache.type === 'redis') {
    const { cache } = await import('../instances/cache')
    const value = await (await cache(true))?.get(`pruvious:page-cache:${hash}`)

    if (value) {
      return JSON.parse(value)
    }
  }

  return null
}

export async function clearPageCache() {
  const pageCache = useRuntimeConfig().pruvious.pageCache as ModuleOptions['pageCache']

  if (!isProduction || !pageCache) {
    return
  } else if (pageCache.type === 'local') {
    fs.emptyDirSync(resolveAppPath(pageCache.path))
  } else if (pageCache.type === 'redis') {
    const { cache } = await import('../instances/cache')
    await (await cache(true))?.flushDb()
  }
}
