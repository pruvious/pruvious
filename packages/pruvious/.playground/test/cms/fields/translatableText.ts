import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('translatable text field', () => {
  const translatableText = '/api/collections/fields?returning=translatableText'
  const translatableTextMinMax = '/api/collections/fields?returning=translatableTextMinMax'
  const translatableTextAllowEmptyString = '/api/collections/fields?returning=translatableTextAllowEmptyString'
  const translatableTextNoTrim = '/api/collections/fields?returning=translatableTextNoTrim'
  const translatableTextDisallowLineBreaks = '/api/collections/fields?returning=translatableTextDisallowLineBreaks'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(translatableText, { translatableText: undefined })).toEqual([
      { translatableText: { 'en': 'Default', 'de': 'Standard', 'de-AT': 'Standard (AT)', 'bs': 'Zadano' } },
    ])
    expect(
      await $postAsAdmin(translatableText, { translatableText: { 'en': 'foo', 'de': '', 'de-AT': '', 'bs': '' } }),
    ).toEqual([{ translatableText: { 'en': 'foo', 'de': '', 'de-AT': '', 'bs': '' } }])
    expect(
      await $getAsAdmin(`/api/collections/fields?select=translatableText&where=translatableText[like][%"en":"foo"%]`),
    ).toEqual($paginated([{ translatableText: { 'en': 'foo', 'de': '', 'de-AT': '', 'bs': '' } }]))
    expect(
      await $patchAsAdmin(
        `/api/collections/fields?returning=translatableText&where=translatableText[like][%"en":"foo"%]`,
        { translatableText: { 'en': 'bar', 'de': '', 'de-AT': '', 'bs': '' } },
      ),
    ).toEqual([{ translatableText: { 'en': 'bar', 'de': '', 'de-AT': '', 'bs': '' } }])
  })

  test('sanitizers', async () => {
    expect(
      await $postAsAdmin(translatableText, { translatableText: { 'en': 123, 'de': '', 'de-AT': '', 'bs': '' } }),
    ).toEqual([{ translatableText: { 'en': '123', 'de': '', 'de-AT': '', 'bs': '' } }])
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
          'translatableText.de-AT': expect.any(String),
        },
      ]),
    )
    expect(
      await $postAsAdmin(translatableText, { translatableText: { 'en': 1, 'de': true, 'de-AT': '', 'bs': null } }),
    ).toEqual($422([{ 'translatableText.de': expect.any(String), 'translatableText.bs': expect.any(String) }]))
    expect(await $postAsAdmin(translatableText, { translatableText: { 'de': '', 'de-AT': '', 'bs': '' } })).toEqual(
      $422([{ 'translatableText.en': expect.any(String) }]),
    )
    expect(
      await $postAsAdmin(translatableText, {
        translatableText: { 'en': '', 'de': '', 'de-AT': '', 'bs': '', '__': '' },
      }),
    ).toEqual($422([{ 'translatableText.__': expect.any(String) }]))

    // min/max
    expect(
      await $postAsAdmin(translatableTextMinMax, {
        translatableTextMinMax: { 'en': 'foobar', 'de': 'foobar', 'de-AT': 'foobar', 'bs': 'foobar' },
      }),
    ).toEqual([{ translatableTextMinMax: { 'en': 'foobar', 'de': 'foobar', 'de-AT': 'foobar', 'bs': 'foobar' } }])
    expect(
      await $postAsAdmin(translatableTextMinMax, {
        translatableTextMinMax: { 'en': 'foobarba', 'de': 'foobarba', 'de-AT': 'foobarba', 'bs': 'foobarba' },
      }),
    ).toEqual([
      { translatableTextMinMax: { 'en': 'foobarba', 'de': 'foobarba', 'de-AT': 'foobarba', 'bs': 'foobarba' } },
    ])
    expect(
      await $postAsAdmin(translatableTextMinMax, {
        translatableTextMinMax: { 'en': 'fooba', 'de': 'foobar', 'de-AT': 'foobar', 'bs': 'foobar' },
      }),
    ).toEqual($422([{ 'translatableTextMinMax.en': expect.any(String) }]))
    expect(
      await $postAsAdmin(translatableTextMinMax, {
        translatableTextMinMax: { 'en': 'foobarbaz', 'de': 'foobar', 'de-AT': 'foobar', 'bs': 'foobar' },
      }),
    ).toEqual($422([{ 'translatableTextMinMax.en': expect.any(String) }]))

    // allowEmptyString
    expect(
      await $postAsAdmin(translatableTextAllowEmptyString, {
        translatableTextAllowEmptyString: { 'en': '', 'de': '', 'de-AT': '', 'bs': '' },
      }),
    ).toEqual([{ translatableTextAllowEmptyString: { 'en': '', 'de': '', 'de-AT': '', 'bs': '' } }])
    expect(
      await $postAsAdmin(translatableTextAllowEmptyString, {
        translatableTextAllowEmptyString: { 'en': ' ', 'de': '', 'de-AT': '', 'bs': '' },
      }),
    ).toEqual([{ translatableTextAllowEmptyString: { 'en': '', 'de': '', 'de-AT': '', 'bs': '' } }])
    expect(
      await $postAsAdmin(translatableTextAllowEmptyString, { translatableTextAllowEmptyString: undefined }),
    ).toEqual([{ translatableTextAllowEmptyString: { 'en': '', 'de': '', 'de-AT': '', 'bs': '' } }])

    // noTrim
    expect(
      await $postAsAdmin(translatableTextNoTrim, {
        translatableTextNoTrim: { 'en': '  ', 'de': '', 'de-AT': '', 'bs': '' },
      }),
    ).toEqual([{ translatableTextNoTrim: { 'en': '  ', 'de': '', 'de-AT': '', 'bs': '' } }])
    expect(
      await $postAsAdmin(translatableTextNoTrim, {
        translatableTextNoTrim: { 'en': '  foo  ', 'de': '', 'de-AT': '', 'bs': '' },
      }),
    ).toEqual([{ translatableTextNoTrim: { 'en': '  foo  ', 'de': '', 'de-AT': '', 'bs': '' } }])
    expect(await $postAsAdmin(translatableTextNoTrim, { translatableTextNoTrim: undefined })).toEqual([
      { translatableTextNoTrim: { 'en': '', 'de': '', 'de-AT': '', 'bs': '' } },
    ])

    // disallowLineBreaks
    expect(
      await $postAsAdmin(translatableTextDisallowLineBreaks, {
        translatableTextDisallowLineBreaks: { 'en': 'foo\nbar', 'de': '', 'de-AT': '', 'bs': '' },
      }),
    ).toEqual([{ translatableTextDisallowLineBreaks: { 'en': 'foo bar', 'de': '', 'de-AT': '', 'bs': '' } }])
    expect(
      await $postAsAdmin(translatableTextDisallowLineBreaks, {
        translatableTextDisallowLineBreaks: { 'en': ' \n foo \n \n bar \n ', 'de': '', 'de-AT': '', 'bs': '' },
      }),
    ).toEqual([{ translatableTextDisallowLineBreaks: { 'en': 'foo bar', 'de': '', 'de-AT': '', 'bs': '' } }])
  })
})
