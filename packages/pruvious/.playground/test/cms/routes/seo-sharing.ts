import fs from 'node:fs'
import { describe, expect, test } from 'vitest'
import { $deleteAsAdmin, $getRaw, $patchAsAdmin, $postAsAdmin, $postFormData } from '../utils'

describe('SEO sharing image and meta tags', () => {
  let baseImageId = 0
  let baseImageDeId = 0
  let routeImageId = 0
  let recordImageId = 0
  let tooSmallImageId = 0
  const routeIds: number[] = []
  const articleIds: number[] = []

  test('setup: upload sharing images', async () => {
    const og = fs.readFileSync('packages/pruvious/.playground/test/files/test-og.png')
    const baseImage = new File([og], 'seo-base.png')
    const baseImageDe = new File([og], 'seo-base-de.png')
    const routeImage = new File([og], 'seo-route.png')
    const recordImage = new File([og], 'seo-record.png')
    const [baseResult, baseDeResult, routeResult, recordResult]: any[] = await Promise.all([
      $postFormData('/api/uploads', { '': baseImage }),
      $postFormData('/api/uploads', { '': baseImageDe }),
      $postFormData('/api/uploads', { '': routeImage }),
      $postFormData('/api/uploads', { '': recordImage }),
    ])
    baseImageId = baseResult[0].details.id
    baseImageDeId = baseDeResult[0].details.id
    routeImageId = routeResult[0].details.id
    recordImageId = recordResult[0].details.id
    expect(baseImageId).toBeGreaterThan(0)
    expect(baseImageDeId).toBeGreaterThan(0)
    expect(routeImageId).toBeGreaterThan(0)
    expect(recordImageId).toBeGreaterThan(0)
  })

  test('setup: configure SEO singleton with sharingImage and metaTags', async () => {
    await $patchAsAdmin('/api/singletons/seo', {
      baseURL: 'https://example.test',
      isIndexable: true,
      sharingImage: baseImageId,
      metaTags: [
        { attribute: 'property', key: 'og:type', content: 'website' },
        { attribute: 'name', key: 'twitter:creator', content: '@pruvious' },
      ],
    })
  })

  test('setup: create routes inheriting from singleton and overriding it', async () => {
    const inherit: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/seo-share-inherit',
      referencedSingleton: 'Options',
      isPublicEN: true,
      seoEN: { title: 'Inherit page' },
    })

    const override: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/seo-share-override',
      referencedSingleton: 'Options',
      isPublicEN: true,
      seoEN: {
        title: 'Override page',
        sharingImage: routeImageId,
        metaTags: [
          { attribute: 'property', key: 'og:type', content: 'article' },
          { attribute: 'property', key: 'og:locale', content: 'en_US' },
        ],
      },
    })

    routeIds.push(inherit[0].id, override[0].id)
  })

  test('GET /api/routes inherits sharingImage and metaTags from SEO singleton', async () => {
    const res = await $getRaw('/api/routes/seo-share-inherit')
    expect(res.status).toBe(200)
    const seo = (res.data as any).seo

    expect(seo.sharingImage).toEqual({
      url: expect.stringMatching(/^https:\/\/example\.test\/.+\/seo-base\.png$/),
      mime: 'image/png',
      width: expect.any(Number),
      height: expect.any(Number),
      alt: '',
    })

    expect(seo.metaTags).toEqual([
      { attribute: 'property', key: 'og:type', content: 'website' },
      { attribute: 'name', key: 'twitter:creator', content: '@pruvious' },
    ])
  })

  test('GET /api/routes route-level sharingImage and metaTags override singleton', async () => {
    const res = await $getRaw('/api/routes/seo-share-override')
    expect(res.status).toBe(200)
    const seo = (res.data as any).seo

    expect(seo.sharingImage.url).toMatch(/seo-route\.png$/)

    expect(seo.metaTags).toEqual([
      // overridden by route
      { attribute: 'property', key: 'og:type', content: 'article' },
      // inherited from singleton
      { attribute: 'name', key: 'twitter:creator', content: '@pruvious' },
      // added by route
      { attribute: 'property', key: 'og:locale', content: 'en_US' },
    ])
  })

  test('rejects sharingImage below the minimum 600x315 dimensions', async () => {
    const tooSmall = new File(
      [fs.readFileSync('packages/pruvious/.playground/test/files/test.png')],
      'seo-too-small.png',
    )
    const uploaded: any = await $postFormData('/api/uploads', { '': tooSmall })
    tooSmallImageId = uploaded[0].details.id

    const res: any = await $patchAsAdmin('/api/singletons/seo', { sharingImage: tooSmallImageId })
    expect(res.error).toBe(true)
    expect(res.statusCode).toBe(422)
    expect(res.data).toMatchObject({ sharingImage: expect.any(String) })
  })

  test('GET /api/routes when sharingImage cleared from singleton: no image, metaTags still emitted', async () => {
    await $patchAsAdmin('/api/singletons/seo', { sharingImage: null, metaTags: [] })
    try {
      const inherit = await $getRaw('/api/routes/seo-share-inherit')
      expect((inherit.data as any).seo.sharingImage).toBeNull()
      expect((inherit.data as any).seo.metaTags).toEqual([])

      const override = await $getRaw('/api/routes/seo-share-override')
      expect((override.data as any).seo.sharingImage.url).toMatch(/seo-route\.png$/)
      expect((override.data as any).seo.metaTags).toEqual([
        { attribute: 'property', key: 'og:type', content: 'article' },
        { attribute: 'property', key: 'og:locale', content: 'en_US' },
      ])
    } finally {
      await $patchAsAdmin('/api/singletons/seo', {
        sharingImage: baseImageId,
        metaTags: [
          { attribute: 'property', key: 'og:type', content: 'website' },
          { attribute: 'name', key: 'twitter:creator', content: '@pruvious' },
        ],
      })
    }
  })

  test('setup: configure SEO singleton in DE with different sharingImage and metaTags', async () => {
    await $patchAsAdmin('/api/singletons/seo?language=de', {
      isIndexable: true,
      sharingImage: baseImageDeId,
      metaTags: [
        { attribute: 'property', key: 'og:type', content: 'website' },
        { attribute: 'property', key: 'og:locale', content: 'de_DE' },
      ],
    })

    const bilingual: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/seo-share-bilingual',
      pathDE: '/seo-share-bilingual-de',
      referencedSingleton: 'Options',
      isPublicEN: true,
      isPublicDE: true,
    })

    routeIds.push(bilingual[0].id)
  })

  test('GET /api/routes inherits the singleton image and tags for the requested language', async () => {
    const en = await $getRaw('/api/routes/seo-share-bilingual')
    const de = await $getRaw('/api/routes/de/seo-share-bilingual-de')

    expect((en.data as any).seo.sharingImage.url).toMatch(/seo-base\.png$/)
    expect((en.data as any).seo.metaTags).toEqual([
      { attribute: 'property', key: 'og:type', content: 'website' },
      { attribute: 'name', key: 'twitter:creator', content: '@pruvious' },
    ])

    expect((de.data as any).seo.sharingImage.url).toMatch(/seo-base-de\.png$/)
    expect((de.data as any).seo.metaTags).toEqual([
      { attribute: 'property', key: 'og:type', content: 'website' },
      { attribute: 'property', key: 'og:locale', content: 'de_DE' },
    ])
  })

  test('setup: create a routable Articles route and an article overriding both singleton and route', async () => {
    const articlesRoute: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/seo-share-articles',
      referencedCollections: ['Articles'],
      isPublicEN: true,
      seoEN: {
        sharingImage: routeImageId,
        metaTags: [
          { attribute: 'property', key: 'og:type', content: 'article' },
          { attribute: 'property', key: 'og:section', content: 'route-section' },
        ],
      },
    })

    const article: any = await $postAsAdmin('/api/collections/articles?returning=id', {
      name: 'SEO override article',
      price: 1,
      subpath: 'seo-override',
      language: 'en',
      seo: {
        sharingImage: recordImageId,
        metaTags: [
          { attribute: 'property', key: 'og:type', content: 'product' },
          { attribute: 'property', key: 'og:price:amount', content: '1.00' },
        ],
      },
    })

    routeIds.push(articlesRoute[0].id)
    articleIds.push(article[0].id)
  })

  test('GET /api/routes record sharingImage and metaTags override route which overrides singleton', async () => {
    const res = await $getRaw('/api/routes/seo-share-articles/seo-override')
    expect(res.status).toBe(200)
    const seo = (res.data as any).seo

    expect(seo.sharingImage.url).toMatch(/seo-record\.png$/)

    expect(seo.metaTags).toEqual([
      // overridden by record (singleton had `website`, route had `article`, record wins with `product`)
      { attribute: 'property', key: 'og:type', content: 'product' },
      // inherited from singleton
      { attribute: 'name', key: 'twitter:creator', content: '@pruvious' },
      // inherited from route
      { attribute: 'property', key: 'og:section', content: 'route-section' },
      // added by record
      { attribute: 'property', key: 'og:price:amount', content: '1.00' },
    ])
  })

  test('exposes canonical url, hreflang alternates and inLanguage in JSON-LD', async () => {
    const en: any = await $getRaw('/api/routes/seo-share-bilingual')
    expect(en.status).toBe(200)
    const enSeo = en.data.seo

    expect(enSeo.url).toBe('https://example.test/seo-share-bilingual')

    const alternates = enSeo.alternates as { hreflang: string; href: string }[]
    expect(alternates.find((a) => a.hreflang === 'en')?.href).toBe('https://example.test/seo-share-bilingual')
    expect(alternates.find((a) => a.hreflang === 'de')?.href).toBe('https://example.test/de/seo-share-bilingual-de')
    expect(alternates.find((a) => a.hreflang === 'x-default')?.href).toBe('https://example.test/seo-share-bilingual')

    const webPage = (enSeo.jsonLd as any[]).find((entry) => entry['@type'] === 'WebPage')
    expect(webPage).toBeTruthy()
    expect(webPage.inLanguage).toBe('en')
    expect(webPage.url).toBe('https://example.test/seo-share-bilingual')
  })

  test('emits Organization + WebSite JSON-LD when identity is configured', async () => {
    let logoId = 0
    try {
      const logo: any = await $postFormData('/api/uploads', {
        '': new File([fs.readFileSync('packages/pruvious/.playground/test/files/test-og.png')], 'seo-logo.png'),
      })
      logoId = logo[0].details.id

      await $patchAsAdmin('/api/singletons/seo', {
        logo: logoId,
        socialLinks: [{ url: 'https://twitter.com/example' }, { url: 'https://github.com/example' }],
        metaTags: [
          { attribute: 'property', key: 'og:type', content: 'article' },
          { attribute: 'name', key: 'twitter:creator', content: '@pruvious' },
        ],
      })

      const res = await $getRaw('/api/routes/seo-share-inherit')
      expect(res.status).toBe(200)
      const seo = (res.data as any).seo

      expect(seo.siteName).toBeTruthy()
      expect(seo.ogType).toBe('article')
      expect(seo.logo?.url).toMatch(/seo-logo\.png$/)
      expect(seo.socialLinks).toEqual(['https://twitter.com/example', 'https://github.com/example'])

      const jsonLd = seo.jsonLd as Record<string, any>[]
      const organization = jsonLd.find((entry) => entry['@type'] === 'Organization')
      expect(organization).toBeTruthy()
      expect(organization!.url).toBe('https://example.test')
      expect(organization!.sameAs).toEqual(['https://twitter.com/example', 'https://github.com/example'])
      expect(organization!.logo?.url).toMatch(/seo-logo\.png$/)

      const website = jsonLd.find((entry) => entry['@type'] === 'WebSite')
      expect(website).toBeTruthy()

      const article = jsonLd.find((entry) => entry['@type'] === 'Article')
      expect(article).toBeTruthy()
      expect(article!.publisher?.name).toBe(seo.siteName)
    } finally {
      await $patchAsAdmin('/api/singletons/seo', {
        logo: null,
        socialLinks: [],
        metaTags: [
          { attribute: 'property', key: 'og:type', content: 'website' },
          { attribute: 'name', key: 'twitter:creator', content: '@pruvious' },
        ],
      })
      if (logoId) {
        await $deleteAsAdmin(`/api/uploads/${logoId}`)
      }
    }
  })

  test('canonical override: external URL sets seo.url and suppresses alternates', async () => {
    const route: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/canonical-external',
      pathDE: '/canonical-external-de',
      referencedSingleton: 'Options',
      isPublicEN: true,
      isPublicDE: true,
      seoEN: { canonicalURL: { url: 'https://master.example/article', target: '', rel: '' } },
    })

    try {
      const res = await $getRaw('/api/routes/canonical-external')
      expect(res.status).toBe(200)
      const seo = (res.data as any).seo
      expect(seo.url).toBe('https://master.example/article')
      expect(seo.autoURL).toBe('https://example.test/canonical-external')
      expect(seo.hasCanonicalOverride).toBe(true)
      expect(seo.alternates).toEqual([])

      // German still has its own canonical (no override) - alternates remain
      const de = await $getRaw('/api/routes/de/canonical-external-de')
      expect((de.data as any).seo.hasCanonicalOverride).toBe(false)
      expect((de.data as any).seo.alternates.length).toBeGreaterThan(0)
    } finally {
      await $deleteAsAdmin(`/api/collections/routes/${route[0].id}`)
    }
  })

  test('canonical override: internal `rel://` link resolves to baseURL + path', async () => {
    const targetRoute: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/canonical-target',
      referencedSingleton: 'Options',
      isPublicEN: true,
    })
    const route: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/canonical-internal',
      referencedSingleton: 'Options',
      isPublicEN: true,
      seoEN: { canonicalURL: { url: `rel://Routes:${targetRoute[0].id}`, target: '', rel: '' } },
    })

    try {
      const res = await $getRaw('/api/routes/canonical-internal')
      expect(res.status).toBe(200)
      const seo = (res.data as any).seo
      expect(seo.url).toBe('https://example.test/canonical-target')
      expect(seo.autoURL).toBe('https://example.test/canonical-internal')
      expect(seo.hasCanonicalOverride).toBe(true)
    } finally {
      await $deleteAsAdmin(`/api/collections/routes/${route[0].id}`)
      await $deleteAsAdmin(`/api/collections/routes/${targetRoute[0].id}`)
    }
  })

  test('canonical override: self-reference is rejected', async () => {
    const route: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/canonical-self',
      referencedSingleton: 'Options',
      isPublicEN: true,
    })

    try {
      const patchResult: any = await $patchAsAdmin(`/api/collections/routes/${route[0].id}`, {
        pathEN: '/canonical-self',
        seoEN: { canonicalURL: { url: `rel://Routes:${route[0].id}`, target: '', rel: '' } },
      })
      expect(patchResult.error).toBe(true)
      expect(patchResult.statusCode).toBe(422)
      expect(JSON.stringify(patchResult.data)).toContain('canonicalize to itself')
    } finally {
      await $deleteAsAdmin(`/api/collections/routes/${route[0].id}`)
    }
  })

  test('canonical override: mutual cycle (A -> B, B -> A) is rejected', async () => {
    const a: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/canonical-cycle-a',
      referencedSingleton: 'Options',
      isPublicEN: true,
    })
    const b: any = await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/canonical-cycle-b',
      referencedSingleton: 'Options',
      isPublicEN: true,
      seoEN: { canonicalURL: { url: `rel://Routes:${a[0].id}`, target: '', rel: '' } },
    })

    try {
      // Now try to canonicalize A -> B; B already canonicalizes to A.
      const patchResult: any = await $patchAsAdmin(`/api/collections/routes/${a[0].id}`, {
        pathEN: '/canonical-cycle-a',
        seoEN: { canonicalURL: { url: `rel://Routes:${b[0].id}`, target: '', rel: '' } },
      })
      expect(patchResult.error).toBe(true)
      expect(patchResult.statusCode).toBe(422)
      expect(JSON.stringify(patchResult.data)).toContain('canonicalizes back to this page')
    } finally {
      await $deleteAsAdmin(`/api/collections/routes/${a[0].id}`)
      await $deleteAsAdmin(`/api/collections/routes/${b[0].id}`)
    }
  })

  test('cleanup: delete records, uploads, and reset SEO singleton', async () => {
    for (const id of routeIds) {
      expect(await $deleteAsAdmin(`/api/collections/routes/${id}`)).toBe(1)
    }
    for (const id of articleIds) {
      expect(await $deleteAsAdmin(`/api/collections/articles/${id}`)).toBe(1)
    }
    for (const id of [baseImageId, baseImageDeId, routeImageId, recordImageId, tooSmallImageId]) {
      if (id) {
        await $deleteAsAdmin(`/api/uploads/${id}`)
      }
    }
    await Promise.all(
      ['en', 'de', 'bs'].map((language) =>
        $patchAsAdmin(`/api/singletons/seo?language=${language}`, {
          baseURL: null,
          isIndexable: true,
          sharingImage: null,
          metaTags: [],
        }),
      ),
    )
  })
})
