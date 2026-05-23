import { isNumber, nanoid } from '@pruvious/utils'
import { describe, expect, test } from 'vitest'
import { $deleteAsAdmin, $post, $postAsAdmin } from '../utils'

describe('rel:// utils (populateRelURL / translateRelURL)', () => {
  const call = (op: 'populate' | 'translate', url: string, targetLanguage?: string) =>
    $postAsAdmin('/api/test/rel-url', { op, url, targetLanguage }).then((r: any) => r.result)
  const callAnon = (op: 'populate' | 'translate', url: string, targetLanguage?: string) =>
    $post('/api/test/rel-url', { op, url, targetLanguage }).then((r: any) => r.result)

  // Singleton route, public in EN + DE
  let sr: number
  // Collection route (Articles), public in EN + DE
  let cr: number
  // Route public in EN only (no DE path)
  let nr: number
  // Route with an EN path but not public (draft)
  let dr: number
  // Collection route (Public, non-translatable), public in EN + DE
  let pr: number

  // Translated Articles pair (EN <-> DE) and a lone EN article with no translation
  let aEn: number
  let aDe: number
  let aLone: number

  test('setup: routes and records', async () => {
    const mk = async (body: Record<string, any>) =>
      ((await $postAsAdmin('/api/collections/routes?returning=id', body)) as [{ id: number }])[0].id

    sr = await mk({
      pathEN: '/u-rel-opt',
      pathDE: '/u-rel-opt-de',
      referencedSingleton: 'Options',
      isPublicEN: true,
      isPublicDE: true,
    })
    cr = await mk({
      pathEN: '/u-rel-blog',
      pathDE: '/u-rel-blog-de',
      referencedCollections: ['Articles'],
      isPublicEN: true,
      isPublicDE: true,
    })
    nr = await mk({ pathEN: '/u-rel-nr', referencedSingleton: 'Options', isPublicEN: true })
    dr = await mk({ pathEN: '/u-rel-dr', referencedSingleton: 'Options', isPublicEN: false })
    pr = await mk({
      pathEN: '/u-rel-pub',
      pathDE: '/u-rel-pub-de',
      referencedCollections: ['Public'],
      isPublicEN: true,
      isPublicDE: true,
    })

    const grp = nanoid()
    const mkArticle = async (body: Record<string, any>) =>
      ((await $postAsAdmin('/api/collections/articles?returning=id', body)) as [{ id: number }])[0].id

    aEn = await mkArticle({ name: 'A en', price: 1, subpath: 'a-en', language: 'en', translations: grp })
    aDe = await mkArticle({ name: 'A de', price: 1, subpath: 'a-de', language: 'de', translations: grp })
    aLone = await mkArticle({ name: 'A lone', price: 1, subpath: 'a-lone', language: 'en' })

    expect([sr, cr, nr, dr, pr, aEn, aDe, aLone].every(isNumber)).toBe(true)
  })

  // populateRelURL

  test('populate: bare singleton route resolves in primary language (unprefixed)', async () => {
    expect(await call('populate', `rel://Routes:${sr}`)).toBe('/u-rel-opt')
  })

  test('populate: pinned language uses the pinned route path and prefix', async () => {
    expect(await call('populate', `rel://Routes:${sr}@de`)).toBe('/de/u-rel-opt-de')
  })

  test('populate: query and hash are preserved', async () => {
    expect(await call('populate', `rel://Routes:${sr}@en?x=1#h`)).toBe('/u-rel-opt?x=1#h')
  })

  test('populate: collection record resolves to route path + subpath', async () => {
    expect(await call('populate', `rel://Routes:${cr}/Articles:${aEn}`)).toBe('/u-rel-blog/a-en')
  })

  test('populate: pinned collection record resolves in the pinned language', async () => {
    expect(await call('populate', `rel://Routes:${cr}/Articles:${aDe}@de`)).toBe('/de/u-rel-blog-de/a-de')
  })

  test('populate: external URL passes through unchanged', async () => {
    expect(await call('populate', 'https://example.com/x?q=1#h')).toBe('https://example.com/x?q=1#h')
  })

  test('populate: non-rel:// value passes through unchanged', async () => {
    expect(await call('populate', '/already/relative')).toBe('/already/relative')
    expect(await call('populate', '')).toBe('')
  })

  test('populate: missing route is broken (null)', async () => {
    expect(await call('populate', 'rel://Routes:999999')).toBe(null)
  })

  test('populate: missing record is broken (null)', async () => {
    expect(await call('populate', `rel://Routes:${cr}/Articles:999999`)).toBe(null)
  })

  test('populate: malformed rel:// is broken (null)', async () => {
    expect(await call('populate', 'rel://nope')).toBe(null)
  })

  test('populate: non-public route is hidden for anon, visible for preview-drafts users', async () => {
    expect(await callAnon('populate', `rel://Routes:${dr}`)).toBe(null)
    expect(await call('populate', `rel://Routes:${dr}`)).toBe('/u-rel-dr')
  })

  test('populate: route without a path in the pinned language is broken (null)', async () => {
    expect(await call('populate', `rel://Routes:${nr}@de`)).toBe(null)
  })

  // translateRelURL

  test('translate: same target language returns the input unchanged', async () => {
    expect(await call('translate', `rel://Routes:${sr}@en`, 'en')).toBe(`rel://Routes:${sr}@en`)
  })

  test('translate: singleton route switches language pin', async () => {
    expect(await call('translate', `rel://Routes:${sr}@en`, 'de')).toBe(`rel://Routes:${sr}@de`)
  })

  test('translate: unconfigured target language returns null', async () => {
    expect(await call('translate', `rel://Routes:${sr}@en`, 'xx')).toBe(null)
  })

  test('translate: route without a path in the target language returns null', async () => {
    expect(await call('translate', `rel://Routes:${nr}@en`, 'de')).toBe(null)
  })

  test('translate: translatable collection maps to the translated record', async () => {
    expect(await call('translate', `rel://Routes:${cr}/Articles:${aEn}@en`, 'de')).toBe(
      `rel://Routes:${cr}/Articles:${aDe}@de`,
    )
  })

  test('translate: translatable collection without a translation returns null', async () => {
    expect(await call('translate', `rel://Routes:${cr}/Articles:${aLone}@en`, 'de')).toBe(null)
  })

  test('translate: non-translatable collection keeps the same record id', async () => {
    expect(await call('translate', `rel://Routes:${pr}/Public:7@en`, 'de')).toBe(`rel://Routes:${pr}/Public:7@de`)
  })

  test('translate: query and hash are preserved', async () => {
    expect(await call('translate', `rel://Routes:${cr}/Articles:${aEn}@en?x=1#h`, 'de')).toBe(
      `rel://Routes:${cr}/Articles:${aDe}@de?x=1#h`,
    )
  })

  test('translate: non-rel:// input returns null', async () => {
    expect(await call('translate', 'https://example.com', 'de')).toBe(null)
  })

  test('cleanup: delete routes and articles', async () => {
    for (const id of [sr, cr, nr, dr, pr]) {
      expect(await $deleteAsAdmin(`/api/collections/routes/${id}`)).toBe(1)
    }
    for (const id of [aEn, aDe, aLone]) {
      expect(await $deleteAsAdmin(`/api/collections/articles/${id}`)).toBe(1)
    }
  })
})
