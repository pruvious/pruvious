import { prefixPrimaryLanguage, primaryLanguage, supportedLanguages } from '#pruvious'
import { collections } from '#pruvious/collections'
import { defineEventHandler, getRouterParam, setResponseHeader, setResponseStatus } from 'h3'
import { query } from '../collections/query'
import { numericSanitizer } from '../sanitizers/numeric'
import { isNull } from '../utils/common'
import { isPositiveInteger } from '../utils/number'
import { __ } from '../utils/server/translate-string'
import { joinRouteParts, resolveCollectionPathPrefix } from '../utils/string'

interface Page {
  path: string
  updatedAt: number
}

export default defineEventHandler(async (event) => {
  const indexParam = getRouterParam(event, 'index')
  const indexParamNumeric = indexParam ? numericSanitizer({ value: indexParam }) : 1
  const index = isPositiveInteger(indexParamNumeric) ? indexParamNumeric : null

  if (isNull(index)) {
    setResponseStatus(event, 404)
    return __(event, 'pruvious-server', 'Resource not found')
  }

  const seo = await query('seo').read()

  if (!seo.visible) {
    setResponseStatus(event, 404)
    return __(event, 'pruvious-server', 'Resource not found')
  }

  const perPage = 1000
  const offset = (index - 1) * perPage
  const records: Page[] = []
  const xml: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]

  for (const c of Object.values(collections)) {
    if (c.mode === 'multi' && c.publicPages) {
      const pp = c.publicPages
      const q = (query as any)(c.name)
        .select({
          [pp.pathField ?? 'path']: true,
          language: true,
          updatedAt: true,
        })
        .whereIn('language', supportedLanguages)

      if (pp.publicField) {
        q.where(pp.publicField, true)
      }

      if (pp.seo?.visibleField) {
        q.where(pp.seo.visibleField, true)
      }

      records.push(
        ...(await q.limit(index * perPage - records.length).all()).map(
          (record: Record<string, any>) =>
            ({
              path: joinRouteParts(
                record.language === primaryLanguage && !prefixPrimaryLanguage ? '' : record.language,
                resolveCollectionPathPrefix(c, record.language, primaryLanguage),
                record[pp.pathField ?? 'path'],
              ),
              updatedAt: record.updatedAt,
            } satisfies Page),
        ),
      )

      if (records.length >= offset + perPage) {
        break
      }
    }
  }

  const sitemapRecords = records.slice(offset, offset + perPage)

  if (!sitemapRecords.length) {
    setResponseStatus(event, 404)
    return __(event, 'pruvious-server', 'Resource not found')
  }

  for (const record of sitemapRecords) {
    xml.push('  <url>')
    xml.push(`    <loc>${seo.baseUrl}${record.path}</loc>`)
    xml.push(`    <lastmod>${new Date(record.updatedAt).toISOString()}</lastmod>`)
    xml.push('  </url>')
  }

  xml.push('</urlset>')

  setResponseHeader(event, 'Content-Type', 'text/xml')
  return xml.join('\n')
})
