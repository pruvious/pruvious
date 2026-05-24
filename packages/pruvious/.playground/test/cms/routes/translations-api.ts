import { describe, expect, test } from 'vitest'
import { $get } from '../utils'

describe('GET /api/translations regional fallback', () => {
  test('base language returns its own strings', async () => {
    const strings = await $get('/api/translations?domain=default&language=de')
    expect(strings).toMatchObject({
      '404': '404',
      'Page not found': 'Seite nicht gefunden',
    })
  })

  test('regional language merges base with own overrides', async () => {
    const strings = await $get('/api/translations?domain=default&language=de-AT')
    // override from default.de-AT.ts wins
    expect(strings).toMatchObject({ '404': '404 (AT)' })
    // missing in de-AT, inherited from default.de.ts
    expect(strings).toMatchObject({ 'Page not found': 'Seite nicht gefunden' })
  })

  test('pruvious-dashboard domain merges regional overrides over base', async () => {
    const strings = await $get('/api/translations?domain=pruvious-dashboard&language=de-AT')
    expect(strings).toMatchObject({
      // overrides from pruvious-dashboard.de-AT.ts
      'Price': 'Preis (AT)',
      'Small': 'Klein (AT)',
      // inherited from pruvious-dashboard.de.ts
      'Column 1': 'Spalte 1',
      'Medium': 'Mittel',
      'Variant name': 'Variantenname',
    })
  })

  test('language without own definition falls through to configured fallback chain', async () => {
    const strings = await $get('/api/translations?domain=default&language=bs')
    expect(strings).toMatchObject({
      '404': '404',
      'Page not found': 'Page not found',
    })
  })

  test('invalid language code is rejected with 422', async () => {
    const response = await $get('/api/translations?domain=default&language=xx')
    expect(response).toMatchObject({
      statusCode: 422,
      data: { language: 'Invalid language code' },
    })
  })
})

describe('resolveContextLanguage (Accept-Language header)', () => {
  const probe = async (header: string) => {
    const response = await $get('/api/translations?domain=default', { headers: { 'Accept-Language': header } })
    return (response as any).data.language as string
  }

  test('exact match wins (de → de)', async () => {
    expect(await probe('de')).toBe('Dieser Abfrageparameter ist erforderlich')
  })

  test('regional header matches configured regional (de-AT → de-AT)', async () => {
    expect(await probe('de-AT')).toBe('Dieser Abfrageparameter ist erforderlich')
  })

  test('regional header strips region to match base (de-CH → de)', async () => {
    expect(await probe('de-CH')).toBe('Dieser Abfrageparameter ist erforderlich')
  })

  test('unsupported header falls through to primary language (fr → en)', async () => {
    expect(await probe('fr')).toBe('This query parameter is required')
  })

  test('multi-language header picks the highest-q supported entry', async () => {
    expect(await probe('fr;q=0.9,de;q=0.8,en;q=0.7')).toBe('Dieser Abfrageparameter ist erforderlich')
  })
})
