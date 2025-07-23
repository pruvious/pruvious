import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('nullableText field', () => {
  const nullableText = '/api/collections/fields?returning=nullableText'
  const nullableTextMinMax = '/api/collections/fields?returning=nullableTextMinMax'
  const nullableTextAllowEmptyString = '/api/collections/fields?returning=nullableTextAllowEmptyString'
  const nullableTextNoTrim = '/api/collections/fields?returning=nullableTextNoTrim'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(nullableText, { nullableText: undefined })).toEqual([{ nullableText: 'Default' }])
    expect(await $postAsAdmin(nullableText, { nullableText: null })).toEqual([{ nullableText: null }])
    expect(await $postAsAdmin(nullableText, { nullableText: 'foo' })).toEqual([{ nullableText: 'foo' }])
    expect(await $getAsAdmin(`/api/collections/fields?select=nullableText&where=nullableText[=][foo]`)).toEqual(
      $paginated([{ nullableText: 'foo' }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=nullableText&where=nullableText[=][foo]`, {
        nullableText: 'bar',
      }),
    ).toEqual([{ nullableText: 'bar' }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(nullableText, { nullableText: 123 })).toEqual([{ nullableText: '123' }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(nullableText, { nullableText: true })).toEqual(
      $422([{ nullableText: expect.any(String) }]),
    )
    expect(await $postAsAdmin(nullableText, { nullableText: [] })).toEqual($422([{ nullableText: expect.any(String) }]))
    expect(await $postAsAdmin(nullableText, { nullableText: {} })).toEqual($422([{ nullableText: expect.any(String) }]))

    // min/max
    expect(await $postAsAdmin(nullableTextMinMax, { nullableTextMinMax: 'foobar' })).toEqual([
      { nullableTextMinMax: 'foobar' },
    ])
    expect(await $postAsAdmin(nullableTextMinMax, { nullableTextMinMax: 'foobarba' })).toEqual([
      { nullableTextMinMax: 'foobarba' },
    ])
    expect(await $postAsAdmin(nullableTextMinMax, { nullableTextMinMax: null })).toEqual([{ nullableTextMinMax: null }])
    expect(await $postAsAdmin(nullableTextMinMax, { nullableTextMinMax: 'fooba' })).toEqual(
      $422([{ nullableTextMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(nullableTextMinMax, { nullableTextMinMax: 'foobarbaz' })).toEqual(
      $422([{ nullableTextMinMax: expect.any(String) }]),
    )

    // allowEmptyString
    expect(await $postAsAdmin(nullableTextAllowEmptyString, { nullableTextAllowEmptyString: '' })).toEqual([
      { nullableTextAllowEmptyString: '' },
    ])
    expect(await $postAsAdmin(nullableTextAllowEmptyString, { nullableTextAllowEmptyString: ' ' })).toEqual([
      { nullableTextAllowEmptyString: '' },
    ])
    expect(await $postAsAdmin(nullableTextAllowEmptyString, { nullableTextAllowEmptyString: null })).toEqual([
      { nullableTextAllowEmptyString: null },
    ])
    expect(await $postAsAdmin(nullableTextAllowEmptyString, { nullableTextAllowEmptyString: undefined })).toEqual([
      { nullableTextAllowEmptyString: null },
    ])

    // noTrim
    expect(await $postAsAdmin(nullableTextNoTrim, { nullableTextNoTrim: '  ' })).toEqual([{ nullableTextNoTrim: '  ' }])
    expect(await $postAsAdmin(nullableTextNoTrim, { nullableTextNoTrim: '  foo  ' })).toEqual([
      { nullableTextNoTrim: '  foo  ' },
    ])
    expect(await $postAsAdmin(nullableTextNoTrim, { nullableTextNoTrim: null })).toEqual([{ nullableTextNoTrim: null }])
    expect(await $postAsAdmin(nullableTextNoTrim, { nullableTextNoTrim: undefined })).toEqual([
      { nullableTextNoTrim: null },
    ])
  })
})
