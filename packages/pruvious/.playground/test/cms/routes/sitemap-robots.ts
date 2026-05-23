import { describe, expect, test } from 'vitest'
import { $deleteAsAdmin, $getRaw, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('sitemap.xml and robots.txt', () => {
  const routeIds: number[] = []

  test('setup: configure SEO singleton with a base URL', async () => {
    await $patchAsAdmin('/api/singletons/seo', {
      baseURL: 'https://example.test',
      isIndexable: true,
    })
  })

  test('setup: seed indexable + non-indexable routes', async () => {
    const indexable: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/sitemap-indexable',
      referencedSingleton: 'Options',
      isPublicEN: true,
      seoEN: { isIndexable: true },
    })

    const hidden: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/sitemap-hidden',
      referencedSingleton: 'Options',
      isPublicEN: true,
      seoEN: { isIndexable: false },
    })

    const draft: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/sitemap-draft',
      referencedSingleton: 'Options',
      isPublicEN: false,
      seoEN: { isIndexable: true },
    })

    routeIds.push(indexable[0].id, hidden[0].id, draft[0].id)
  })

  test('GET /sitemap.xml returns XML with indexable URLs only', async () => {
    const res = await $getRaw('/sitemap.xml')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/xml')

    const xml = String(res.data)
    expect(xml).toContain('<urlset')
    expect(xml.match(/<loc>/g)?.length ?? 0).toBe(1)
    expect(xml).toContain('https://example.test/sitemap-indexable')
  })

  test('GET /sitemap.xml returns an empty urlset when every language is hidden', async () => {
    await Promise.all(
      ['en', 'de', 'bs'].map((language) =>
        $patchAsAdmin(`/api/singletons/seo?language=${language}`, { isIndexable: false }),
      ),
    )
    try {
      const res = await $getRaw('/sitemap.xml')
      expect(res.status).toBe(200)
      const xml = String(res.data)
      expect(xml).toContain('<urlset')
      expect(xml).not.toContain('<loc>')
    } finally {
      await Promise.all(
        ['en', 'de', 'bs'].map((language) =>
          $patchAsAdmin(`/api/singletons/seo?language=${language}`, { isIndexable: true }),
        ),
      )
    }
  })

  test('GET /sitemap.xml drops a language when only that language is hidden at the singleton level', async () => {
    const bilingual: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/sitemap-bilingual',
      pathDE: '/sitemap-bilingual-de',
      referencedSingleton: 'Options',
      isPublicEN: true,
      isPublicDE: true,
      seoEN: { isIndexable: true },
      seoDE: { isIndexable: true },
    })

    routeIds.push(bilingual[0].id)

    await $patchAsAdmin('/api/singletons/seo?language=de', { isIndexable: false })
    try {
      const res = await $getRaw('/sitemap.xml')
      expect(res.status).toBe(200)
      const xml = String(res.data)
      expect(xml).toContain('https://example.test/sitemap-bilingual')
      expect(xml).not.toContain('sitemap-bilingual-de')
    } finally {
      await $patchAsAdmin('/api/singletons/seo?language=de', { isIndexable: true })
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

  test('GET /robots.txt allows crawling when only one language is hidden', async () => {
    await $patchAsAdmin('/api/singletons/seo?language=en', { isIndexable: false })
    try {
      const res = await $getRaw('/robots.txt')
      expect(res.status).toBe(200)
      const txt = String(res.data)
      expect(txt).toContain('Allow: /')
      expect(txt).not.toContain('Disallow: /')
    } finally {
      await $patchAsAdmin('/api/singletons/seo?language=en', { isIndexable: true })
    }
  })

  test('GET /robots.txt disallows crawling when every language is hidden', async () => {
    await Promise.all(
      ['en', 'de', 'bs'].map((language) =>
        $patchAsAdmin(`/api/singletons/seo?language=${language}`, { isIndexable: false }),
      ),
    )
    try {
      const res = await $getRaw('/robots.txt')
      expect(res.status).toBe(200)
      const txt = String(res.data)
      expect(txt).toContain('Disallow: /')
      expect(txt).not.toContain('Allow: /')
    } finally {
      await Promise.all(
        ['en', 'de', 'bs'].map((language) =>
          $patchAsAdmin(`/api/singletons/seo?language=${language}`, { isIndexable: true }),
        ),
      )
    }
  })

  test('sitemap emits <lastmod> for each url', async () => {
    const res = await $getRaw('/sitemap.xml')
    expect(res.status).toBe(200)
    const xml = String(res.data)
    expect(xml).toContain('<lastmod>')
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(xml).not.toContain('xmlns:xhtml')
    expect(xml).not.toContain('<xhtml:link')
  })

  test('sitemap excludes routes with canonical override', async () => {
    const canonical: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/sitemap-canonical-overridden',
      referencedSingleton: 'Options',
      isPublicEN: true,
      seoEN: {
        isIndexable: true,
        canonicalURL: { url: 'https://master.example/article', target: '', rel: '' },
      },
    })
    try {
      const res = await $getRaw('/sitemap.xml')
      expect(res.status).toBe(200)
      const xml = String(res.data)
      expect(xml).not.toContain('sitemap-canonical-overridden')
    } finally {
      await $deleteAsAdmin(`/api/collections/routes/${canonical[0].id}`)
    }
  })

  test('cleanup: delete routes and reset SEO singleton', async () => {
    for (const id of routeIds) {
      expect(await $deleteAsAdmin(`/api/collections/routes/${id}`)).toBe(1)
    }
    await Promise.all(
      ['en', 'de', 'bs'].map((language) =>
        $patchAsAdmin(`/api/singletons/seo?language=${language}`, {
          baseURL: null,
          isIndexable: true,
        }),
      ),
    )
  })
})
