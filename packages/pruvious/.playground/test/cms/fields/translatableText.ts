import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('translatable text field', () => {
  const translatableText = '/api/collections/fields?returning=translatableText'
  const translatableTextMinMax = '/api/collections/fields?returning=translatableTextMinMax'
  const translatableTextAllowEmptyString = '/api/collections/fields?returning=translatableTextAllowEmptyString'
  const translatableTextNoTrim = '/api/collections/fields?returning=translatableTextNoTrim'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(translatableText, { translatableText: undefined })).toEqual([
      { translatableText: { en: 'Default', de: 'Standard', bs: 'Zadano' } },
    ])
    expect(await $postAsAdmin(translatableText, { translatableText: { en: 'foo', de: '', bs: '' } })).toEqual([
      { translatableText: { en: 'foo', de: '', bs: '' } },
    ])
    expect(
      await $getAsAdmin(`/api/collections/fields?select=translatableText&where=translatableText[like][%"en":"foo"%]`),
    ).toEqual($paginated([{ translatableText: { en: 'foo', de: '', bs: '' } }]))
    expect(
      await $patchAsAdmin(
        `/api/collections/fields?returning=translatableText&where=translatableText[like][%"en":"foo"%]`,
        { translatableText: { en: 'bar', de: '', bs: '' } },
      ),
    ).toEqual([{ translatableText: { en: 'bar', de: '', bs: '' } }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(translatableText, { translatableText: { en: 123, de: '', bs: '' } })).toEqual([
      { translatableText: { en: '123', de: '', bs: '' } },
    ])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(translatableText, { translatableText: null })).toEqual(
      $422([{ translatableText: expect.any(String) }]),
    )
    expect(await $postAsAdmin(translatableText, { translatableText: true })).toEqual(
      $422([{ translatableText: expect.any(String) }]),
    )
    expect(await $postAsAdmin(translatableText, { translatableText: [] })).toEqual(
      $422([{ translatableText: expect.any(String) }]),
    )
    expect(await $postAsAdmin(translatableText, { translatableText: {} })).toEqual(
      $422([
        {
          'translatableText.en': expect.any(String),
          'translatableText.de': expect.any(String),
          'translatableText.bs': expect.any(String),
        },
      ]),
    )
    expect(await $postAsAdmin(translatableText, { translatableText: { en: 1, de: true, bs: null } })).toEqual(
      $422([{ 'translatableText.de': expect.any(String), 'translatableText.bs': expect.any(String) }]),
    )
    expect(await $postAsAdmin(translatableText, { translatableText: { de: '', bs: '' } })).toEqual(
      $422([{ 'translatableText.en': expect.any(String) }]),
    )
    expect(await $postAsAdmin(translatableText, { translatableText: { en: '', de: '', bs: '', __: '' } })).toEqual(
      $422([{ 'translatableText.__': expect.any(String) }]),
    )

    // min/max
    expect(
      await $postAsAdmin(translatableTextMinMax, {
        translatableTextMinMax: { en: 'foobar', de: 'foobar', bs: 'foobar' },
      }),
    ).toEqual([{ translatableTextMinMax: { en: 'foobar', de: 'foobar', bs: 'foobar' } }])
    expect(
      await $postAsAdmin(translatableTextMinMax, {
        translatableTextMinMax: { en: 'foobarba', de: 'foobarba', bs: 'foobarba' },
      }),
    ).toEqual([{ translatableTextMinMax: { en: 'foobarba', de: 'foobarba', bs: 'foobarba' } }])
    expect(
      await $postAsAdmin(translatableTextMinMax, {
        translatableTextMinMax: { en: 'fooba', de: 'foobar', bs: 'foobar' },
      }),
    ).toEqual($422([{ 'translatableTextMinMax.en': expect.any(String) }]))
    expect(
      await $postAsAdmin(translatableTextMinMax, {
        translatableTextMinMax: { en: 'foobarbaz', de: 'foobar', bs: 'foobar' },
      }),
    ).toEqual($422([{ 'translatableTextMinMax.en': expect.any(String) }]))

    // allowEmptyString
    expect(
      await $postAsAdmin(translatableTextAllowEmptyString, {
        translatableTextAllowEmptyString: { en: '', de: '', bs: '' },
      }),
    ).toEqual([{ translatableTextAllowEmptyString: { en: '', de: '', bs: '' } }])
    expect(
      await $postAsAdmin(translatableTextAllowEmptyString, {
        translatableTextAllowEmptyString: { en: ' ', de: '', bs: '' },
      }),
    ).toEqual([{ translatableTextAllowEmptyString: { en: '', de: '', bs: '' } }])
    expect(
      await $postAsAdmin(translatableTextAllowEmptyString, { translatableTextAllowEmptyString: undefined }),
    ).toEqual([{ translatableTextAllowEmptyString: { en: '', de: '', bs: '' } }])

    // noTrim
    expect(
      await $postAsAdmin(translatableTextNoTrim, { translatableTextNoTrim: { en: '  ', de: '', bs: '' } }),
    ).toEqual([{ translatableTextNoTrim: { en: '  ', de: '', bs: '' } }])
    expect(
      await $postAsAdmin(translatableTextNoTrim, { translatableTextNoTrim: { en: '  foo  ', de: '', bs: '' } }),
    ).toEqual([{ translatableTextNoTrim: { en: '  foo  ', de: '', bs: '' } }])
    expect(await $postAsAdmin(translatableTextNoTrim, { translatableTextNoTrim: undefined })).toEqual([
      { translatableTextNoTrim: { en: '', de: '', bs: '' } },
    ])
  })
})
