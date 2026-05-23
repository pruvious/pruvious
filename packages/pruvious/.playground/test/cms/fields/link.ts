import { describe, expect, test } from 'vitest'
import { $422, $deleteAsAdmin, $getAsAdmin, $postAsAdmin } from '../utils'

describe('link field', () => {
  const link = '/api/collections/fields?returning=link'
  const linkInternalOnly = '/api/collections/fields?returning=linkInternalOnly'
  const linkNoHash = '/api/collections/fields?returning=linkNoHash'
  const linkNoQuery = '/api/collections/fields?returning=linkNoQuery'
  const linkNoAttributes = '/api/collections/fields?returning=linkNoAttributes'
  const linkAllowedReferences = '/api/collections/fields?returning=linkAllowedReferences'
  const linkAllowedReferencesWithRoutes = '/api/collections/fields?returning=linkAllowedReferencesWithRoutes'
  const linkNoDrafts = '/api/collections/fields?returning=linkNoDrafts'

  let routeId: number
  let singletonRouteId: number
  let articleId: number
  let draftRouteId: number

  test('setup: create route and article', async () => {
    const route = (await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/blog',
      referencedCollections: ['Articles'],
      isPublicEN: true,
    })) as [{ id: number }]
    expect(route).toEqual([{ id: expect.any(Number) }])
    routeId = route[0].id

    const singletonRoute = (await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/options',
      pathDE: '/optionen',
      referencedSingleton: 'Options',
      isPublicEN: true,
      isPublicDE: true,
    })) as [{ id: number }]
    expect(singletonRoute).toEqual([{ id: expect.any(Number) }])
    singletonRouteId = singletonRoute[0].id

    const article = (await $postAsAdmin('/api/collections/articles?returning=id', {
      name: 'Test Article',
      price: 9.99,
      subpath: 'test-article',
      isPublic: true,
      language: 'en',
    })) as [{ id: number }]
    expect(article).toEqual([{ id: expect.any(Number) }])
    articleId = article[0].id

    const draftRoute = (await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/draft-no-drafts',
      referencedSingleton: 'Options',
      isPublicEN: false,
    })) as [{ id: number }]
    expect(draftRoute).toEqual([{ id: expect.any(Number) }])
    draftRouteId = draftRoute[0].id
  })

  test('create with null', async () => {
    expect(await $postAsAdmin(link, { link: null })).toEqual([{ link: null }])
  })

  test('create with external URL', async () => {
    expect(await $postAsAdmin(link, { link: { url: 'https://example.com' } })).toEqual([
      { link: { url: 'https://example.com', target: '', rel: '' } },
    ])
  })

  test('create with external URL and attributes', async () => {
    expect(
      await $postAsAdmin(link, { link: { url: 'https://example.com', target: '_blank', rel: 'noopener nofollow' } }),
    ).toEqual([{ link: { url: 'https://example.com', target: '_blank', rel: 'noopener nofollow' } }])
  })

  test('create with internal singleton route', async () => {
    expect(await $postAsAdmin(link, { link: { url: `rel://Routes:${routeId}` } })).toEqual([
      { link: { url: `rel://Routes:${routeId}`, target: '', rel: '' } },
    ])
  })

  test('create with internal collection record', async () => {
    expect(await $postAsAdmin(link, { link: { url: `rel://Routes:${routeId}/Articles:${articleId}` } })).toEqual([
      { link: { url: `rel://Routes:${routeId}/Articles:${articleId}`, target: '', rel: '' } },
    ])
  })

  test('create with hash and query', async () => {
    expect(
      await $postAsAdmin(link, { link: { url: `rel://Routes:${routeId}/Articles:${articleId}?page=2#comments` } }),
    ).toEqual([{ link: { url: `rel://Routes:${routeId}/Articles:${articleId}?page=2#comments`, target: '', rel: '' } }])
  })

  test('populate resolves internal link', async () => {
    const result = await $postAsAdmin(`${link},id&populate=t`, {
      link: { url: `rel://Routes:${routeId}/Articles:${articleId}` },
    })
    expect(result).toEqual([
      {
        link: { url: '/blog/test-article', target: '', rel: '' },
        id: expect.any(Number),
      },
    ])
  })

  test('populate resolves internal link with query and hash', async () => {
    const result = await $postAsAdmin(`${link}&populate=t`, {
      link: { url: `rel://Routes:${routeId}/Articles:${articleId}?page=2#comments` },
    })
    expect(result).toEqual([{ link: { url: '/blog/test-article?page=2#comments', target: '', rel: '' } }])
  })

  test('populate passes through external URL', async () => {
    const result = await $postAsAdmin(`${link}&populate=t`, {
      link: { url: 'https://example.com/page?q=1#top', target: '_blank', rel: 'noopener' },
    })
    expect(result).toEqual([{ link: { url: 'https://example.com/page?q=1#top', target: '_blank', rel: 'noopener' } }])
  })

  test('populate returns undefined url for broken link', async () => {
    const result = await $postAsAdmin(`${link},id&populate=t`, {
      link: { url: `rel://Routes:${routeId}/Articles:${articleId}` },
    })
    const id = (result as any)[0].id

    // Delete the article to break the link
    await $deleteAsAdmin(`/api/collections/articles/${articleId}`)

    const broken = await $getAsAdmin(`/api/collections/fields/${id}?select=link&populate=t`)
    expect(broken).toEqual({ link: { target: '', rel: '' } })

    // Recreate article for subsequent tests
    const article = (await $postAsAdmin('/api/collections/articles?returning=id', {
      name: 'Test Article',
      price: 9.99,
      subpath: 'test-article',
      isPublic: true,
      language: 'en',
    })) as [{ id: number }]
    articleId = article[0].id
  })

  // Validators - url subfield
  test('reject invalid URL protocol', async () => {
    expect(await $postAsAdmin(link, { link: { url: 'ftp://example.com' } })).toEqual(
      $422([{ 'link.url': 'Only internal and external links are allowed' }]),
    )
  })

  test('reject malformed rel:// URL', async () => {
    expect(await $postAsAdmin(link, { link: { url: 'rel://invalid' } })).toEqual(
      $422([{ 'link.url': 'This link is not formatted correctly' }]),
    )
  })

  test('reject non-existent route', async () => {
    expect(await $postAsAdmin(link, { link: { url: 'rel://Routes:99999' } })).toEqual(
      $422([{ 'link.url': 'Record does not exist' }]),
    )
  })

  test('reject non-existent record', async () => {
    expect(await $postAsAdmin(link, { link: { url: `rel://Routes:${routeId}/Articles:99999` } })).toEqual(
      $422([{ 'link.url': 'Record does not exist' }]),
    )
  })

  // Validators - target subfield
  test('reject invalid target', async () => {
    expect(await $postAsAdmin(link, { link: { url: 'https://example.com', target: 'invalid' } })).toEqual(
      $422([{ 'link.target': 'Invalid link target' }]),
    )
  })

  // allowExternal: false
  test('linkInternalOnly: reject external URL', async () => {
    expect(await $postAsAdmin(linkInternalOnly, { linkInternalOnly: { url: 'https://example.com' } })).toEqual(
      $422([{ 'linkInternalOnly.url': 'External links are not allowed in this field' }]),
    )
  })

  test('linkInternalOnly: accept internal URL', async () => {
    expect(await $postAsAdmin(linkInternalOnly, { linkInternalOnly: { url: `rel://Routes:${routeId}` } })).toEqual([
      { linkInternalOnly: { url: `rel://Routes:${routeId}`, target: '', rel: '' } },
    ])
  })

  // allowHash: false
  test('linkNoHash: reject URL with hash', async () => {
    expect(await $postAsAdmin(linkNoHash, { linkNoHash: { url: `rel://Routes:${routeId}#section` } })).toEqual(
      $422([{ 'linkNoHash.url': 'Hash fragments are not allowed in this field' }]),
    )
  })

  test('linkNoHash: accept URL without hash', async () => {
    expect(await $postAsAdmin(linkNoHash, { linkNoHash: { url: `rel://Routes:${routeId}` } })).toEqual([
      { linkNoHash: { url: `rel://Routes:${routeId}`, target: '', rel: '' } },
    ])
  })

  // allowQuery: false
  test('linkNoQuery: reject URL with query string', async () => {
    expect(await $postAsAdmin(linkNoQuery, { linkNoQuery: { url: `rel://Routes:${routeId}?foo=bar` } })).toEqual(
      $422([{ 'linkNoQuery.url': 'Query strings are not allowed in this field' }]),
    )
  })

  test('linkNoQuery: accept URL without query string', async () => {
    expect(await $postAsAdmin(linkNoQuery, { linkNoQuery: { url: `rel://Routes:${routeId}` } })).toEqual([
      { linkNoQuery: { url: `rel://Routes:${routeId}`, target: '', rel: '' } },
    ])
  })

  // ui.showTarget/showRel: false (UI-only; backend still accepts attributes)
  test('linkNoAttributes: accept link with attributes', async () => {
    expect(
      await $postAsAdmin(linkNoAttributes, {
        linkNoAttributes: { url: 'https://example.com', target: '_blank', rel: 'noopener' },
      }),
    ).toEqual([{ linkNoAttributes: { url: 'https://example.com', target: '_blank', rel: 'noopener' } }])
  })

  // allowedReferences: ['Articles']
  test('linkAllowedReferences: accept Articles link', async () => {
    expect(
      await $postAsAdmin(linkAllowedReferences, {
        linkAllowedReferences: { url: `rel://Routes:${routeId}/Articles:${articleId}` },
      }),
    ).toEqual([
      { linkAllowedReferences: { url: `rel://Routes:${routeId}/Articles:${articleId}`, target: '', rel: '' } },
    ])
  })

  test('linkAllowedReferences: reject non-Articles collection', async () => {
    expect(
      await $postAsAdmin(linkAllowedReferences, {
        linkAllowedReferences: { url: `rel://Routes:${routeId}/Public:1` },
      }),
    ).toEqual($422([{ 'linkAllowedReferences.url': 'Linking to `Public` is not allowed in this field' }]))
  })

  test('linkAllowedReferences: reject bare route when `Routes` not in the list', async () => {
    expect(
      await $postAsAdmin(linkAllowedReferences, {
        linkAllowedReferences: { url: `rel://Routes:${routeId}` },
      }),
    ).toEqual($422([{ 'linkAllowedReferences.url': 'Linking to `Routes` is not allowed in this field' }]))
  })

  // allowedReferences: ['Articles', 'Routes'] (collection records + bare routes)
  test('linkAllowedReferencesWithRoutes: accept Articles link', async () => {
    expect(
      await $postAsAdmin(linkAllowedReferencesWithRoutes, {
        linkAllowedReferencesWithRoutes: { url: `rel://Routes:${routeId}/Articles:${articleId}` },
      }),
    ).toEqual([
      {
        linkAllowedReferencesWithRoutes: {
          url: `rel://Routes:${routeId}/Articles:${articleId}`,
          target: '',
          rel: '',
        },
      },
    ])
  })

  test('linkAllowedReferencesWithRoutes: accept bare route', async () => {
    expect(
      await $postAsAdmin(linkAllowedReferencesWithRoutes, {
        linkAllowedReferencesWithRoutes: { url: `rel://Routes:${routeId}` },
      }),
    ).toEqual([{ linkAllowedReferencesWithRoutes: { url: `rel://Routes:${routeId}`, target: '', rel: '' } }])
  })

  test('linkAllowedReferencesWithRoutes: reject non-Articles collection', async () => {
    expect(
      await $postAsAdmin(linkAllowedReferencesWithRoutes, {
        linkAllowedReferencesWithRoutes: { url: `rel://Routes:${routeId}/Public:1` },
      }),
    ).toEqual($422([{ 'linkAllowedReferencesWithRoutes.url': 'Linking to `Public` is not allowed in this field' }]))
  })

  // allowDrafts: false
  test('linkNoDrafts: reject link to a draft route', async () => {
    expect(await $postAsAdmin(linkNoDrafts, { linkNoDrafts: { url: `rel://Routes:${draftRouteId}` } })).toEqual(
      $422([{ 'linkNoDrafts.url': 'Linking to drafts is not allowed in this field' }]),
    )
  })

  test('linkNoDrafts: accept link to a public route', async () => {
    expect(await $postAsAdmin(linkNoDrafts, { linkNoDrafts: { url: `rel://Routes:${routeId}` } })).toEqual([
      { linkNoDrafts: { url: `rel://Routes:${routeId}`, target: '', rel: '' } },
    ])
  })

  test('linkNoDrafts: accept link to a public record', async () => {
    expect(
      await $postAsAdmin(linkNoDrafts, {
        linkNoDrafts: { url: `rel://Routes:${routeId}/Articles:${articleId}` },
      }),
    ).toEqual([{ linkNoDrafts: { url: `rel://Routes:${routeId}/Articles:${articleId}`, target: '', rel: '' } }])
  })

  test('allowDrafts defaults to true: the same draft link is accepted by the default field', async () => {
    expect(await $postAsAdmin(link, { link: { url: `rel://Routes:${draftRouteId}` } })).toEqual([
      { link: { url: `rel://Routes:${draftRouteId}`, target: '', rel: '' } },
    ])
  })

  // Language pin (@lang)
  test('language pin: accept pin matching a configured route path', async () => {
    expect(await $postAsAdmin(link, { link: { url: `rel://Routes:${singletonRouteId}@de` } })).toEqual([
      { link: { url: `rel://Routes:${singletonRouteId}@de`, target: '', rel: '' } },
    ])
  })

  test('language pin: populate uses pinned language regardless of context', async () => {
    const result = await $postAsAdmin(`${link}&populate=t`, {
      link: { url: `rel://Routes:${singletonRouteId}@de` },
    })
    expect(result).toEqual([{ link: { url: '/de/optionen', target: '', rel: '' } }])
  })

  test('language pin: unpinned bare route defaults to primary language', async () => {
    const result = await $postAsAdmin(`${link}&populate=t`, {
      link: { url: `rel://Routes:${singletonRouteId}` },
    })
    expect(result).toEqual([{ link: { url: '/options', target: '', rel: '' } }])
  })

  test('language pin: reject unconfigured language', async () => {
    expect(await $postAsAdmin(link, { link: { url: `rel://Routes:${singletonRouteId}@xx` } })).toEqual(
      $422([{ 'link.url': 'The language `xx` is not supported' }]),
    )
  })

  test('language pin: reject when route has no path in the pinned language', async () => {
    expect(await $postAsAdmin(link, { link: { url: `rel://Routes:${routeId}@de` } })).toEqual(
      $422([{ 'link.url': 'Route is not available in the specified language' }]),
    )
  })

  test('language pin: accept on collection rel URL when pin matches record language', async () => {
    expect(
      await $postAsAdmin(link, { link: { url: `rel://Routes:${singletonRouteId}/Articles:${articleId}@en` } }),
    ).toEqual([{ link: { url: `rel://Routes:${singletonRouteId}/Articles:${articleId}@en`, target: '', rel: '' } }])
  })

  test('language pin: reject on collection rel URL when pin mismatches record language', async () => {
    expect(
      await $postAsAdmin(link, { link: { url: `rel://Routes:${singletonRouteId}/Articles:${articleId}@de` } }),
    ).toEqual($422([{ 'link.url': 'The linked record is not available in the language `de`' }]))
  })

  // preview-drafts bypass at populate time
  test('populate: link to a non-public route resolves for preview-drafts users (admin)', async () => {
    const draftRoute = (await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/draft-route',
      referencedSingleton: 'Options',
      isPublicEN: false,
    })) as [{ id: number }]
    const draftRouteId = draftRoute[0].id

    const result = await $postAsAdmin(`${link},id&populate=t`, {
      link: { url: `rel://Routes:${draftRouteId}` },
    })
    expect(result).toEqual([{ link: { url: '/draft-route', target: '', rel: '' }, id: expect.any(Number) }])

    expect(await $deleteAsAdmin(`/api/collections/routes/${draftRouteId}`)).toEqual(1)
  })

  // Cleanup
  test('cleanup: delete routes', async () => {
    expect(await $deleteAsAdmin(`/api/collections/routes/${routeId}`)).toEqual(1)
    expect(await $deleteAsAdmin(`/api/collections/routes/${singletonRouteId}`)).toEqual(1)
    expect(await $deleteAsAdmin(`/api/collections/routes/${draftRouteId}`)).toEqual(1)
  })
})
