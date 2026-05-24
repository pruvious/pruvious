import { nanoid } from '@pruvious/utils'
import { describe, expect, test } from 'vitest'
import { $deleteAsAdmin, $getRaw, $getRawAsAdmin, $getRawAsEditor, $getRawAsPreviewer, $postAsAdmin } from '../utils'

describe('routes API (auth-aware)', () => {
  let publicRouteId: number
  let draftRouteId: number
  let draftWithRedirectId: number
  let translatedRouteId: number
  let mixedCaseRouteId: number
  const articleIds: number[] = []

  const mkRoute = async (body: Record<string, any>) =>
    ((await $postAsAdmin('/api/collections/routes?returning=id', body)) as [{ id: number }])[0].id
  const mkArticle = async (body: Record<string, any>) =>
    ((await $postAsAdmin('/api/collections/articles?returning=id', body)) as [{ id: number }])[0].id

  test('setup: create routes and articles', async () => {
    publicRouteId = await mkRoute({
      pathEN: '/api-routes-public',
      referencedCollections: ['Articles'],
      isPublicEN: true,
    })

    draftRouteId = await mkRoute({
      pathEN: '/api-routes-draft',
      referencedCollections: ['Articles'],
      isPublicEN: false,
    })

    draftWithRedirectId = await mkRoute({
      pathEN: '/api-routes-draft-redirect',
      referencedSingleton: 'Options',
      isPublicEN: false,
      redirectsEN: [{ match: null, to: 'https://example.com/redirected', code: 301, forwardQueryParams: false }],
    })

    translatedRouteId = await mkRoute({
      pathEN: '/api-routes-trans',
      pathDE: '/api-routes-trans-de',
      referencedCollections: ['Articles'],
      isPublicEN: true,
      isPublicDE: false,
    })

    mixedCaseRouteId = await mkRoute({
      pathEN: '/api-routes-mixed',
      referencedCollections: ['Articles'],
      isPublicEN: false,
    })

    const translatedGroup = nanoid()
    articleIds.push(await mkArticle({ name: 'A pub', price: 1, subpath: 'a-pub', language: 'en' }))
    articleIds.push(await mkArticle({ name: 'A draft', price: 1, subpath: 'a-draft', language: 'en' }))
    articleIds.push(await mkArticle({ name: 'A mixed', price: 1, subpath: 'A-Mixed', language: 'en' }))
    articleIds.push(
      await mkArticle({
        name: 'A en trans',
        price: 1,
        subpath: 'a-trans-en',
        language: 'en',
        translations: translatedGroup,
      }),
    )
    articleIds.push(
      await mkArticle({
        name: 'A de',
        price: 1,
        subpath: 'a-trans-de',
        language: 'de',
        translations: translatedGroup,
      }),
    )

    expect([publicRouteId, draftRouteId, draftWithRedirectId, translatedRouteId, mixedCaseRouteId].every(Boolean)).toBe(
      true,
    )
  })

  test('anonymous on public route: 200, no private cache headers', async () => {
    const res = await $getRaw('/api/routes/api-routes-public/a-pub')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control') ?? '').not.toContain('private')
    expect(res.headers.get('cache-control') ?? '').not.toContain('no-store')
    expect(res.headers.get('vary') ?? '').not.toContain('Authorization')
    expect((res.data as any).ref).toBe('Articles')
  })

  test('anonymous on draft route: 404', async () => {
    const res = await $getRaw('/api/routes/api-routes-draft/a-draft')
    expect(res.status).toBe(404)
  })

  test('admin on draft route: 200 with private cache headers', async () => {
    const res = await $getRawAsAdmin('/api/routes/api-routes-draft/a-draft')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(res.headers.get('vary')).toContain('Authorization')
    expect(res.headers.get('vary')).toContain('Cookie')
    expect((res.data as any).ref).toBe('Articles')
  })

  test('admin on public route: 200 with private cache headers (always private when authenticated)', async () => {
    const res = await $getRawAsAdmin('/api/routes/api-routes-public/a-pub')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  test('editor without preview-drafts on draft route: 404 (same as anonymous)', async () => {
    const res = await $getRawAsEditor('/api/routes/api-routes-draft/a-draft')
    expect(res.status).toBe(404)
  })

  test('previewer with preview-drafts on draft route: 200 with private cache headers', async () => {
    const res = await $getRawAsPreviewer('/api/routes/api-routes-draft/a-draft')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(res.headers.get('vary')).toContain('Authorization')
    expect((res.data as any).ref).toBe('Articles')
  })

  test('tampered bearer token on public route: 200, treated as anonymous', async () => {
    const res = await $getRaw('/api/routes/api-routes-public/a-pub', {
      headers: { Authorization: 'Bearer not-a-real-token' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control') ?? '').not.toContain('private')
  })

  test('tampered bearer token on draft route: 404 (treated as anonymous)', async () => {
    const res = await $getRaw('/api/routes/api-routes-draft/a-draft', {
      headers: { Authorization: 'Bearer not-a-real-token' },
    })
    expect(res.status).toBe(404)
  })

  test('malformed JWT on draft route: 404 (treated as anonymous)', async () => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4IiwiZXhwIjoxLCJpYXQiOjF9.invalidsignature'
    const res = await $getRaw('/api/routes/api-routes-draft/a-draft', {
      headers: { Authorization: `Bearer ${fakeJwt}` },
    })
    expect(res.status).toBe(404)
  })

  test('translations map: anonymous sees no draft sibling-language path', async () => {
    const anon = await $getRaw('/api/routes/api-routes-trans/a-trans-en')
    expect(anon.status).toBe(200)
    expect((anon.data as any).translations.de).toBeNull()
  })

  test('translations map: previewer sees sibling-language path with the other-language route base', async () => {
    const prev = await $getRawAsPreviewer('/api/routes/api-routes-trans/a-trans-en')
    expect(prev.status).toBe(200)
    expect((prev.data as any).translations.de).toBe('/de/api-routes-trans-de/a-trans-de')
  })

  test('softRedirect on case-different path: returned for previewer on draft; anonymous gets 404', async () => {
    const anon = await $getRaw('/api/routes/api-routes-mixed/a-mixed')
    expect(anon.status).toBe(404)

    const prev = await $getRawAsPreviewer('/api/routes/api-routes-mixed/a-mixed')
    expect(prev.status).toBe(200)
    expect((prev.data as any).softRedirect).toBe('/api-routes-mixed/A-Mixed')
  })

  test('language detection: Accept-Language directs admin to the localized variant', async () => {
    const res = await $getRawAsAdmin('/api/routes/de/api-routes-trans-de/a-trans-de', {
      headers: { 'Accept-Language': 'de' },
    })
    expect(res.status).toBe(200)
    expect((res.data as any).language).toBe('de')
  })

  test('redirects on draft route: filtered out for anon (404), applied for previewer', async () => {
    const anon = await $getRaw('/api/routes/api-routes-draft-redirect')
    expect(anon.status).toBe(404)

    const prev = await $getRawAsPreviewer('/api/routes/api-routes-draft-redirect')
    expect(prev.status).toBe(200)
    expect((prev.data as any).to).toBe('https://example.com/redirected')
    expect((prev.data as any).code).toBe(301)
  })

  test('regional language: pathDEAT column resolves via /api/routes/de-AT/...', async () => {
    const id = await mkRoute({
      pathDEAT: '/api-routes-at-home',
      referencedSingleton: 'Options',
      isPublicDEAT: true,
    })
    try {
      const res = await $getRaw('/api/routes/de-AT/api-routes-at-home')
      expect(res.status).toBe(200)
      expect((res.data as any).language).toBe('de-AT')
      expect((res.data as any).ref).toBe('Options')
    } finally {
      await $deleteAsAdmin(`/api/collections/routes/${id}`)
    }
  })

  test('cleanup: delete routes and articles', async () => {
    for (const id of [publicRouteId, draftRouteId, draftWithRedirectId, translatedRouteId, mixedCaseRouteId]) {
      expect(await $deleteAsAdmin(`/api/collections/routes/${id}`)).toBe(1)
    }
    for (const id of articleIds) {
      expect(await $deleteAsAdmin(`/api/collections/articles/${id}`)).toBe(1)
    }
  })
})
