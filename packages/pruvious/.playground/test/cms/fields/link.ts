import { describe, expect, test } from 'vitest'
import { $422, $deleteAsAdmin, $getAsAdmin, $postAsAdmin } from '../utils'

describe('link field', () => {
  const link = '/api/collections/fields?returning=link'
  const linkInternalOnly = '/api/collections/fields?returning=linkInternalOnly'
  const linkNoHash = '/api/collections/fields?returning=linkNoHash'
  const linkNoAttributes = '/api/collections/fields?returning=linkNoAttributes'
  const linkAllowedReferences = '/api/collections/fields?returning=linkAllowedReferences'

  let routeId: number
  let articleId: number

  test('setup: create route and article', async () => {
    const route = (await $postAsAdmin('/api/collections/routes?returning=id', {
      pathEN: '/blog',
      referencedCollections: ['Articles'],
      isPublicEN: true,
    })) as [{ id: number }]
    expect(route).toEqual([{ id: expect.any(Number) }])
    routeId = route[0].id

    const article = (await $postAsAdmin('/api/collections/articles?returning=id', {
      name: 'Test Article',
      price: 9.99,
      subpath: 'test-article',
      isPublic: true,
      language: 'en',
    })) as [{ id: number }]
    expect(article).toEqual([{ id: expect.any(Number) }])
    articleId = article[0].id
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
    expect(await $postAsAdmin(link, { link: { url: `rel://routes:${routeId}` } })).toEqual([
      { link: { url: `rel://routes:${routeId}`, target: '', rel: '' } },
    ])
  })

  test('create with internal collection record', async () => {
    expect(await $postAsAdmin(link, { link: { url: `rel://routes:${routeId}/Articles:${articleId}` } })).toEqual([
      { link: { url: `rel://routes:${routeId}/Articles:${articleId}`, target: '', rel: '' } },
    ])
  })

  test('create with hash and query', async () => {
    expect(
      await $postAsAdmin(link, { link: { url: `rel://routes:${routeId}/Articles:${articleId}?page=2#comments` } }),
    ).toEqual([{ link: { url: `rel://routes:${routeId}/Articles:${articleId}?page=2#comments`, target: '', rel: '' } }])
  })

  test('populate resolves internal link', async () => {
    const result = await $postAsAdmin(`${link},id&populate=t`, {
      link: { url: `rel://routes:${routeId}/Articles:${articleId}` },
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
      link: { url: `rel://routes:${routeId}/Articles:${articleId}?page=2#comments` },
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
      link: { url: `rel://routes:${routeId}/Articles:${articleId}` },
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
      $422([{ 'link.url': expect.any(String) }]),
    )
  })

  test('reject malformed rel:// URL', async () => {
    expect(await $postAsAdmin(link, { link: { url: 'rel://invalid' } })).toEqual(
      $422([{ 'link.url': expect.any(String) }]),
    )
  })

  test('reject non-existent route', async () => {
    expect(await $postAsAdmin(link, { link: { url: 'rel://routes:99999' } })).toEqual(
      $422([{ 'link.url': expect.any(String) }]),
    )
  })

  test('reject non-existent record', async () => {
    expect(await $postAsAdmin(link, { link: { url: `rel://routes:${routeId}/Articles:99999` } })).toEqual(
      $422([{ 'link.url': expect.any(String) }]),
    )
  })

  // Validators - target subfield
  test('reject invalid target', async () => {
    expect(await $postAsAdmin(link, { link: { url: 'https://example.com', target: 'invalid' } })).toEqual(
      $422([{ 'link.target': expect.any(String) }]),
    )
  })

  // allowExternal: false
  test('linkInternalOnly: reject external URL', async () => {
    expect(await $postAsAdmin(linkInternalOnly, { linkInternalOnly: { url: 'https://example.com' } })).toEqual(
      $422([{ linkInternalOnly: expect.any(String) }]),
    )
  })

  test('linkInternalOnly: accept internal URL', async () => {
    expect(await $postAsAdmin(linkInternalOnly, { linkInternalOnly: { url: `rel://routes:${routeId}` } })).toEqual([
      { linkInternalOnly: { url: `rel://routes:${routeId}`, target: '', rel: '' } },
    ])
  })

  // allowHash: false
  test('linkNoHash: reject URL with hash', async () => {
    expect(await $postAsAdmin(linkNoHash, { linkNoHash: { url: `rel://routes:${routeId}#section` } })).toEqual(
      $422([{ linkNoHash: expect.any(String) }]),
    )
  })

  test('linkNoHash: accept URL without hash', async () => {
    expect(await $postAsAdmin(linkNoHash, { linkNoHash: { url: `rel://routes:${routeId}` } })).toEqual([
      { linkNoHash: { url: `rel://routes:${routeId}`, target: '', rel: '' } },
    ])
  })

  // allowAttributes: false (still accepts attributes, just hides UI)
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
        linkAllowedReferences: { url: `rel://routes:${routeId}/Articles:${articleId}` },
      }),
    ).toEqual([
      { linkAllowedReferences: { url: `rel://routes:${routeId}/Articles:${articleId}`, target: '', rel: '' } },
    ])
  })

  test('linkAllowedReferences: reject non-Articles collection', async () => {
    expect(
      await $postAsAdmin(linkAllowedReferences, {
        linkAllowedReferences: { url: `rel://routes:${routeId}/Public:1` },
      }),
    ).toEqual($422([{ linkAllowedReferences: expect.any(String) }]))
  })

  test('linkAllowedReferences: accept singleton route (no collection restriction)', async () => {
    expect(
      await $postAsAdmin(linkAllowedReferences, {
        linkAllowedReferences: { url: `rel://routes:${routeId}` },
      }),
    ).toEqual([{ linkAllowedReferences: { url: `rel://routes:${routeId}`, target: '', rel: '' } }])
  })

  // Cleanup
  test('cleanup: delete route', async () => {
    expect(await $deleteAsAdmin(`/api/collections/routes/${routeId}`)).toEqual(1)
  })
})
