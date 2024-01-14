import { supportedLanguages } from '#pruvious'
import { collections } from '#pruvious/collections'
import { defineEventHandler, setResponseHeader } from 'h3'
import { query } from '../collections/query'
import { getModuleOption } from '../instances/state'

export default defineEventHandler(async (event) => {
  const seo = await query('seo').read()
  const robots: string[] = ['User-agent: *']

  if (seo.visible) {
    if (getModuleOption('api').routes['sitemap.xml.get']) {
      const perPage = 1000
      let count = 0

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

          count += await q.count()
        }
      }

      if (count > perPage) {
        for (let i = 1; i <= Math.ceil(count / perPage); i++) {
          robots.push(`Sitemap: ${seo.baseUrl}/sitemap.xml/${i}`)
        }
      } else {
        robots.push(`Sitemap: ${seo.baseUrl}/sitemap.xml`)
      }
    }
  } else {
    robots.push('Disallow: /')
  }

  setResponseHeader(event, 'Content-Type', 'text/plain')

  return robots.join('\n') + '\n'
})
