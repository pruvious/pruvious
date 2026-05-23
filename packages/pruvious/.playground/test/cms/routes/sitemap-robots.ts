import { describe, expect, test } from 'vitest'
import { $getRaw, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('sitemap.xml and robots.txt', () => {
  test('setup: configure SEO singleton with a base URL', async () => {
    await $patchAsAdmin('/api/singletons/seo', {
      baseURL: 'https://example.test',
      isIndexable: true,
    })
  })

  test('setup: seed indexable + non-indexable routes', async () => {
    await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/sitemap-indexable',
      referencedSingleton: 'Options',
      isPublicEN: true,
      seoEN: { isIndexable: true },
    })

    await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/sitemap-hidden',
      referencedSingleton: 'Options',
      isPublicEN: true,
      seoEN: { isIndexable: false },
    })

    await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/sitemap-draft',
      referencedSingleton: 'Options',
      isPublicEN: false,
      seoEN: { isIndexable: true },
    })
  })

  test('GET /sitemap.xml returns XML with indexable URLs only', async () => {
    const res = await $getRaw('/sitemap.xml')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/xml')

    const xml = String(res.data)
    expect(xml).toContain('<urlset')
    expect(xml).toContain('https://example.test/sitemap-indexable')
    expect(xml).not.toContain('sitemap-hidden')
    expect(xml).not.toContain('sitemap-draft')
  })

  test('GET /sitemap.xml on a hidden site returns an empty urlset', async () => {
    await $patchAsAdmin('/api/singletons/seo', { isIndexable: false })
    try {
      const res = await $getRaw('/sitemap.xml')
      expect(res.status).toBe(200)
      const xml = String(res.data)
      expect(xml).toContain('<urlset')
      expect(xml).not.toContain('<loc>')
    } finally {
      await $patchAsAdmin('/api/singletons/seo', { isIndexable: true })
    }
  })

  test('GET /robots.txt allows crawling when site is visible', async () => {
    const res = await $getRaw('/robots.txt')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/plain')

    const txt = String(res.data)
    expect(txt).toContain('User-agent: *')
    expect(txt).toContain('Allow: /')
    expect(txt).toContain('Sitemap: https://example.test/sitemap.xml')
  })

  test('GET /robots.txt disallows crawling when site is hidden', async () => {
    await $patchAsAdmin('/api/singletons/seo', { isIndexable: false })
    try {
      const res = await $getRaw('/robots.txt')
      expect(res.status).toBe(200)
      const txt = String(res.data)
      expect(txt).toContain('Disallow: /')
      expect(txt).not.toContain('Allow: /')
    } finally {
      await $patchAsAdmin('/api/singletons/seo', { isIndexable: true })
    }
  })
})
