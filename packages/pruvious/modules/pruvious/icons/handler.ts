import { isEmpty, isNull, isString, sanitizeSvg } from '@pruvious/utils'
import { useRuntimeConfig, useStorage } from 'nitropack/runtime'
import { ICON_NAME_PATTERN } from './utils.server'

const MAX_AGE = 60 * 60 * 24

interface CachedIcon {
  svg: string
  etag: string
}

const sanitizedCache = new Map<string, CachedIcon | null>()

function computeEtag(svg: string): string {
  let h = 5381
  for (let i = 0; i < svg.length; i++) {
    h = ((h * 33) ^ svg.charCodeAt(i)) >>> 0
  }
  return `"${h.toString(16)}-${svg.length.toString(16)}"`
}

/**
 * Serves SVG icons from `pruvious.dir.icons`. The first directory is mounted at
 * `/_pruvious/icons/<name>.svg`; additional ones at `/_pruvious/icons/<prefix>/<name>.svg`.
 */
export default defineEventHandler(async (event) => {
  const dirs = useRuntimeConfig(event).pruvious.dir.icons
  if (dirs.length === 0) {
    throw createError({ statusCode: 404 })
  }

  const path = getRouterParam(event, '_') ?? ''
  if (isEmpty(path)) {
    throw createError({ statusCode: 404 })
  }

  const segments = path.split('/')
  let prefix: string
  let file: string

  if (segments.length === 1) {
    prefix = dirs[0]!.prefix
    file = segments[0]!
  } else if (segments.length === 2) {
    prefix = segments[0]!
    file = segments[1]!
    if (!dirs.some((d) => d.prefix === prefix) || prefix === dirs[0]!.prefix) {
      throw createError({ statusCode: 404 })
    }
  } else {
    throw createError({ statusCode: 404 })
  }

  if (!file.endsWith('.svg') || !ICON_NAME_PATTERN.test(file.slice(0, -4)) || !ICON_NAME_PATTERN.test(prefix)) {
    throw createError({ statusCode: 404 })
  }

  const cacheable = !import.meta.dev
  const cacheKey = `${prefix}/${file}`
  let cached = cacheable ? sanitizedCache.get(cacheKey) : undefined

  if (cached === undefined) {
    const entry = dirs.find((d) => d.prefix === prefix)!
    let svg: string | null = null

    for (let i = 0; i < entry.dirs.length; i++) {
      const raw = await useStorage(`assets:pruvious-icons-${prefix}-${i}`).getItemRaw<unknown>(file)
      if (isString(raw)) {
        svg = raw
      } else if (raw instanceof Uint8Array) {
        svg = new TextDecoder().decode(raw)
      } else if (raw && typeof (raw as ArrayBuffer).byteLength === 'number') {
        svg = new TextDecoder().decode(raw as ArrayBuffer)
      }
      if (!isNull(svg)) {
        break
      }
    }

    if (isNull(svg)) {
      throw createError({ statusCode: 404 })
    }

    const result = sanitizeSvg(svg).svg
    cached = isEmpty(result) ? null : { svg: result, etag: computeEtag(result) }

    if (cacheable) {
      sanitizedCache.set(cacheKey, cached)
    }
  }

  if (isNull(cached)) {
    throw createError({ statusCode: 404 })
  }

  setResponseHeader(event, 'Content-Type', 'image/svg+xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', cacheable ? `public, max-age=${MAX_AGE}, must-revalidate` : 'no-cache')
  setResponseHeader(event, 'ETag', cached.etag)

  if (getRequestHeader(event, 'if-none-match') === cached.etag) {
    setResponseStatus(event, 304)
    return null
  }

  return cached.svg
})
