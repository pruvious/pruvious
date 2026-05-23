import { listRoutes, resolveContextLanguage, selectSingleton, type ListRoutesEntry } from '#pruvious/server'
import { isString, withoutTrailingSlash } from '@pruvious/utils'
import { defineEventHandler, setResponseHeader, setResponseStatus } from 'h3'

const PAGE_PATTERN = /^\/sitemap-(\d+)\.xml$/i

export default defineEventHandler(async (event) => {
  const { routing } = useRuntimeConfig().pruvious

  if (routing.sitemap === false) {
    setResponseStatus(event, 404)
    return ''
  }

  event.context.pruvious ??= {} as any
  await resolveContextLanguage()

  const baseSEO = (await selectSingleton('SEO').select(['baseURL']).get()).data ?? ({} as any)
  const baseURL = isString(baseSEO.baseURL) ? withoutTrailingSlash(baseSEO.baseURL) : ''

  const perPage = routing.sitemap.perPage
  const path = event.path.split('?')[0]!.toLowerCase()

  const respondXML = (xml: string): string => {
    setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
    setResponseHeader(event, 'Cache-Control', 'public, max-age=300')
    return xml
  }

  if (path === '/sitemap.xml') {
    const first = await listRoutes({ perPage, page: 1, indexableOnly: true, language: 'all' })

    if (first.lastPage <= 1) {
      return respondXML(renderUrlset(baseURL, first.data))
    }

    return respondXML(renderSitemapIndex(baseURL, first.lastPage))
  }

  const pageMatch = PAGE_PATTERN.exec(path)

  if (pageMatch) {
    const page = parseInt(pageMatch[1]!, 10)
    const result = await listRoutes({ perPage, page, indexableOnly: true, language: 'all' })

    if (page < 1 || page > result.lastPage) {
      setResponseStatus(event, 404)
      return ''
    }

    return respondXML(renderUrlset(baseURL, result.data))
  }

  setResponseStatus(event, 404)
  return ''
})

function escapeXML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toLoc(baseURL: string, path: string): string {
  return baseURL + (path === '/' ? '' : path)
}

function renderUrlEntry(baseURL: string, entry: ListRoutesEntry): string {
  const lines: string[] = ['  <url>', `    <loc>${escapeXML(toLoc(baseURL, entry.path))}</loc>`]

  if (entry.updatedAt) {
    lines.push(`    <lastmod>${new Date(entry.updatedAt).toISOString()}</lastmod>`)
  }

  lines.push('  </url>')
  return lines.join('\n')
}

function renderUrlset(baseURL: string, entries: ListRoutesEntry[]): string {
  const urls = entries.map((entry) => renderUrlEntry(baseURL, entry)).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

function renderSitemapIndex(baseURL: string, lastPage: number): string {
  const entries = Array.from(
    { length: lastPage },
    (_, i) => `  <sitemap><loc>${escapeXML(`${baseURL}/sitemap-${i + 1}.xml`)}</loc></sitemap>`,
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`
}
