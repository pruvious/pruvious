import { resolveContextLanguage, selectSingleton, type LanguageCode } from '#pruvious/server'
import { isString, withoutTrailingSlash } from '@pruvious/utils'
import { defineEventHandler, setResponseHeader, setResponseStatus } from 'h3'

export default defineEventHandler(async (event) => {
  const { routing, i18n } = useRuntimeConfig().pruvious

  if (!routing.robots) {
    setResponseStatus(event, 404)
    return ''
  }

  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300')

  event.context.pruvious ??= {} as any
  await resolveContextLanguage()

  const seoByLanguage = await Promise.all(
    i18n.languages.map(async ({ code }) => ({
      code,
      data: (await selectSingleton('SEO').language(code as LanguageCode).populate().get()).data ?? ({} as any),
    })),
  )

  const primary = seoByLanguage.find(({ code }) => code === i18n.primaryLanguage) ?? seoByLanguage[0]!
  const baseURL = isString(primary.data.baseURL) ? withoutTrailingSlash(primary.data.baseURL) : ''
  const anyVisible = seoByLanguage.some(({ data }) => data.isIndexable !== false)
  const lines: string[] = ['User-agent: *']

  if (anyVisible) {
    lines.push('Allow: /')
  } else {
    lines.push('Disallow: /')
  }

  if (baseURL && routing.sitemap !== false) {
    lines.push('', `Sitemap: ${baseURL}/sitemap.xml`)
  }

  return lines.join('\n') + '\n'
})
