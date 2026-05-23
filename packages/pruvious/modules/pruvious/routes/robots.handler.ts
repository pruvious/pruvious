import { resolveContextLanguage, selectSingleton } from '#pruvious/server'
import { isString, withoutTrailingSlash } from '@pruvious/utils'
import { defineEventHandler, setResponseHeader, setResponseStatus } from 'h3'

export default defineEventHandler(async (event) => {
  const { routing } = useRuntimeConfig().pruvious

  if (!routing.robots) {
    setResponseStatus(event, 404)
    return ''
  }

  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300')

  event.context.pruvious ??= {} as any
  await resolveContextLanguage()

  const baseSEO = (await selectSingleton('SEO').populate().get()).data ?? ({} as any)
  const baseURL = isString(baseSEO.baseURL) ? withoutTrailingSlash(baseSEO.baseURL) : ''
  const lines: string[] = ['User-agent: *']

  if (baseSEO.isIndexable !== false) {
    lines.push('Allow: /')
  } else {
    lines.push('Disallow: /')
  }

  if (baseURL && routing.sitemap !== false) {
    lines.push('', `Sitemap: ${baseURL}/sitemap.xml`)
  }

  return lines.join('\n') + '\n'
})
