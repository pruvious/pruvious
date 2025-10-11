import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('textArea field', () => {
  const textArea = '/api/collections/fields?returning=textArea'
  const textAreaMinMax = '/api/collections/fields?returning=textAreaMinMax'
  const textAreaAllowEmptyString = '/api/collections/fields?returning=textAreaAllowEmptyString'
  const textAreaNoTrim = '/api/collections/fields?returning=textAreaNoTrim'
  const textAreaDisallowLineBreaks = '/api/collections/fields?returning=textAreaDisallowLineBreaks'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(textArea, { textArea: undefined })).toEqual([{ textArea: 'Default' }])
    expect(await $postAsAdmin(textArea, { textArea: 'foo' })).toEqual([{ textArea: 'foo' }])
    expect(await $getAsAdmin(`/api/collections/fields?select=textArea&where=textArea[=][foo]`)).toEqual(
      $paginated([{ textArea: 'foo' }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=textArea&where=textArea[=][foo]`, {
        textArea: 'bar',
      }),
    ).toEqual([{ textArea: 'bar' }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(textArea, { textArea: 123 })).toEqual([{ textArea: '123' }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(textArea, { textArea: null })).toEqual($422([{ textArea: expect.any(String) }]))
    expect(await $postAsAdmin(textArea, { textArea: true })).toEqual($422([{ textArea: expect.any(String) }]))
    expect(await $postAsAdmin(textArea, { textArea: [] })).toEqual($422([{ textArea: expect.any(String) }]))
    expect(await $postAsAdmin(textArea, { textArea: {} })).toEqual($422([{ textArea: expect.any(String) }]))

    // min/max
    expect(await $postAsAdmin(textAreaMinMax, { textAreaMinMax: 'foobar' })).toEqual([{ textAreaMinMax: 'foobar' }])
    expect(await $postAsAdmin(textAreaMinMax, { textAreaMinMax: 'foobarba' })).toEqual([{ textAreaMinMax: 'foobarba' }])
    expect(await $postAsAdmin(textAreaMinMax, { textAreaMinMax: 'fooba' })).toEqual(
      $422([{ textAreaMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(textAreaMinMax, { textAreaMinMax: 'foobarbaz' })).toEqual(
      $422([{ textAreaMinMax: expect.any(String) }]),
    )

    // allowEmptyString
    expect(await $postAsAdmin(textAreaAllowEmptyString, { textAreaAllowEmptyString: '' })).toEqual([
      { textAreaAllowEmptyString: '' },
    ])
    expect(await $postAsAdmin(textAreaAllowEmptyString, { textAreaAllowEmptyString: ' ' })).toEqual([
      { textAreaAllowEmptyString: '' },
    ])
    expect(await $postAsAdmin(textAreaAllowEmptyString, { textAreaAllowEmptyString: undefined })).toEqual([
      { textAreaAllowEmptyString: '' },
    ])

    // noTrim
    expect(await $postAsAdmin(textAreaNoTrim, { textAreaNoTrim: '  ' })).toEqual([{ textAreaNoTrim: '  ' }])
    expect(await $postAsAdmin(textAreaNoTrim, { textAreaNoTrim: '  foo  ' })).toEqual([{ textAreaNoTrim: '  foo  ' }])
    expect(await $postAsAdmin(textAreaNoTrim, { textAreaNoTrim: '  \nfoo  ' })).toEqual([
      { textAreaNoTrim: '  \nfoo  ' },
    ])
    expect(await $postAsAdmin(textAreaNoTrim, { textAreaNoTrim: undefined })).toEqual([{ textAreaNoTrim: '' }])

    // disallowLineBreaks
    expect(await $postAsAdmin(textAreaDisallowLineBreaks, { textAreaDisallowLineBreaks: 'foo\nbar' })).toEqual([
      { textAreaDisallowLineBreaks: 'foo bar' },
    ])
    expect(
      await $postAsAdmin(textAreaDisallowLineBreaks, { textAreaDisallowLineBreaks: ' \n foo \n \n bar \n ' }),
    ).toEqual([{ textAreaDisallowLineBreaks: 'foo bar' }])
  })
})
