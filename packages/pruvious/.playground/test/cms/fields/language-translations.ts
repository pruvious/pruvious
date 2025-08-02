import { nanoid } from '@pruvious/utils'
import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('language and translations fields', () => {
  const ff = '/api/collections/language-translations?returning=languageTest,translationsTest'
  const fp = '/api/collections/language-translations?returning=language,translations'
  const rnd = () => ({ languageTest: 'en', translationsTest: nanoid() })

  test('create, filter, update (field)', async () => {
    expect(await $postAsAdmin(ff, { languageTest: undefined, translationsTest: undefined, language: 'en' })).toEqual([
      { languageTest: null, translationsTest: null },
    ])
    expect(await $postAsAdmin(ff, { languageTest: null, translationsTest: 'foo', language: 'en' })).toEqual([
      { languageTest: null, translationsTest: 'foo' },
    ])
    expect(await $postAsAdmin(ff, { languageTest: 'en', translationsTest: null, language: 'en' })).toEqual([
      { languageTest: 'en', translationsTest: null },
    ])
    expect(await $postAsAdmin(ff, { languageTest: 'en', translationsTest: 'foo', language: 'en' })).toEqual([
      { languageTest: 'en', translationsTest: 'foo' },
    ])
    expect(
      await $getAsAdmin(
        `/api/collections/language-translations?select=languageTest,translationsTest&where=languageTest[=][en],translationsTest[=][foo]`,
      ),
    ).toEqual($paginated([{ languageTest: 'en', translationsTest: 'foo' }]))
    expect(
      await $patchAsAdmin(
        `/api/collections/language-translations?returning=languageTest,translationsTest&where=languageTest[=][en],translationsTest[=][foo]`,
        { languageTest: 'bs', translationsTest: 'bar' },
      ),
    ).toEqual([{ languageTest: 'bs', translationsTest: 'bar' }])
  })

  test('sanitizers (field)', async () => {
    expect(await $postAsAdmin(ff, { languageTest: ' BS ', language: 'en' })).toEqual([
      { languageTest: 'bs', translationsTest: null },
    ])
  })

  test('validators (field)', async () => {
    expect(await $postAsAdmin(ff, { languageTest: true, language: 'en' })).toEqual(
      $422([{ languageTest: expect.any(String) }]),
    )
    expect(await $postAsAdmin(ff, { languageTest: 'fr', language: 'en' })).toEqual(
      $422([{ languageTest: expect.any(String) }]),
    )
    expect(await $postAsAdmin(ff, { languageTest: null, translationsTest: null, language: 'en' })).toEqual(
      $422([{ languageTest: expect.any(String), translationsTest: expect.any(String) }]),
    )
    expect(await $postAsAdmin(ff, { languageTest: 'bs', translationsTest: 'bar', language: 'en' })).toEqual(
      $422([{ languageTest: expect.any(String), translationsTest: expect.any(String) }]),
    )
    expect(await $postAsAdmin(ff, { languageTest: 'BS', translationsTest: 'bar', language: 'en' })).toEqual(
      $422([{ languageTest: expect.any(String), translationsTest: expect.any(String) }]),
    )
  })

  test('create, filter, update (preset)', async () => {
    expect(await $postAsAdmin(fp, { language: undefined, translations: undefined, ...rnd() })).toEqual(
      $422([{ language: expect.any(String), translations: expect.any(String) }]),
    )
    expect(await $postAsAdmin(fp, { language: null, translations: null, ...rnd() })).toEqual(
      $422([{ language: expect.any(String) }]),
    )
    expect(await $postAsAdmin(fp, { language: 'de', translations: 'foo', ...rnd() })).toEqual([
      { language: 'de', translations: 'foo' },
    ])
    expect(await $postAsAdmin(fp, { language: 'en', translations: 'foo', ...rnd() })).toEqual([
      { language: 'en', translations: 'foo' },
    ])
    expect(
      await $getAsAdmin(
        `/api/collections/language-translations?select=language,translations&where=language[=][en],translations[=][foo]`,
      ),
    ).toEqual($paginated([{ language: 'en', translations: 'foo' }]))
  })

  test('immutability (preset)', async () => {
    expect(
      await $patchAsAdmin(`/api/collections/language-translations?returning=language&where=language[=][de]`, {
        language: 'bs',
      }),
    ).toEqual([{ language: 'de' }])
  })

  test('sanitizers (preset)', async () => {
    expect(await $postAsAdmin(fp, { language: ' BS ', ...rnd() })).toEqual([
      { language: 'bs', translations: expect.any(String) },
    ])
  })

  test('validators (preset)', async () => {
    expect(await $postAsAdmin(fp, { language: true, ...rnd() })).toEqual($422([{ language: expect.any(String) }]))
    expect(await $postAsAdmin(fp, { language: 'fr', ...rnd() })).toEqual($422([{ language: expect.any(String) }]))
    expect(await $postAsAdmin(fp, { language: 'de', translations: 'foo', ...rnd() })).toEqual(
      $422([{ language: expect.any(String), translations: expect.any(String) }]),
    )
  })
})
