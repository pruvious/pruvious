import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('text field', () => {
  const text = '/api/collections/fields?returning=text'
  const textMinMax = '/api/collections/fields?returning=textMinMax'
  const textAllowEmptyString = '/api/collections/fields?returning=textAllowEmptyString'
  const textNoTrim = '/api/collections/fields?returning=textNoTrim'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(text, { text: undefined })).toEqual([{ text: 'Default' }])
    expect(await $postAsAdmin(text, { text: 'foo' })).toEqual([{ text: 'foo' }])
    expect(await $getAsAdmin(`/api/collections/fields?select=text&where=text[=][foo]`)).toEqual(
      $paginated([{ text: 'foo' }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=text&where=text[=][foo]`, {
        text: 'bar',
      }),
    ).toEqual([{ text: 'bar' }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(text, { text: 123 })).toEqual([{ text: '123' }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(text, { text: null })).toEqual($422([{ text: expect.any(String) }]))
    expect(await $postAsAdmin(text, { text: true })).toEqual($422([{ text: expect.any(String) }]))
    expect(await $postAsAdmin(text, { text: [] })).toEqual($422([{ text: expect.any(String) }]))
    expect(await $postAsAdmin(text, { text: {} })).toEqual($422([{ text: expect.any(String) }]))

    // min/max
    expect(await $postAsAdmin(textMinMax, { textMinMax: 'foobar' })).toEqual([{ textMinMax: 'foobar' }])
    expect(await $postAsAdmin(textMinMax, { textMinMax: 'foobarba' })).toEqual([{ textMinMax: 'foobarba' }])
    expect(await $postAsAdmin(textMinMax, { textMinMax: 'fooba' })).toEqual($422([{ textMinMax: expect.any(String) }]))
    expect(await $postAsAdmin(textMinMax, { textMinMax: 'foobarbaz' })).toEqual(
      $422([{ textMinMax: expect.any(String) }]),
    )

    // allowEmptyString
    expect(await $postAsAdmin(textAllowEmptyString, { textAllowEmptyString: '' })).toEqual([
      { textAllowEmptyString: '' },
    ])
    expect(await $postAsAdmin(textAllowEmptyString, { textAllowEmptyString: ' ' })).toEqual([
      { textAllowEmptyString: '' },
    ])
    expect(await $postAsAdmin(textAllowEmptyString, { textAllowEmptyString: undefined })).toEqual([
      { textAllowEmptyString: '' },
    ])

    // noTrim
    expect(await $postAsAdmin(textNoTrim, { textNoTrim: '  ' })).toEqual([{ textNoTrim: '  ' }])
    expect(await $postAsAdmin(textNoTrim, { textNoTrim: '  foo  ' })).toEqual([{ textNoTrim: '  foo  ' }])
    expect(await $postAsAdmin(textNoTrim, { textNoTrim: undefined })).toEqual([{ textNoTrim: '' }])
  })
})
