import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('chips field', () => {
  const chips = '/api/collections/fields?returning=chips'
  const chipsChoices = '/api/collections/fields?returning=chipsChoices'
  const chipsMinMax = '/api/collections/fields?returning=chipsMinMax'
  const chipsAllowDuplicates = '/api/collections/fields?returning=chipsAllowDuplicates'
  const chipsChoicesAllowDuplicates = '/api/collections/fields?returning=chipsChoicesAllowDuplicates'
  const chipsDeduplicate = '/api/collections/fields?returning=chipsDeduplicate'
  const chipsNested = '/api/collections/fields?returning=chipsNested'

  test('create, filter, update', async () => {
    const t1 = ['foo', 'bar']
    const t2 = ['baz']
    expect(await $postAsAdmin(chips, { chips: undefined })).toEqual([{ chips: [] }])
    expect(await $postAsAdmin(chips, { chips: t1 })).toEqual([{ chips: t1 }])
    expect(await $getAsAdmin(`/api/collections/fields?select=chips&where=chips[=][${JSON.stringify(t1)}]`)).toEqual(
      $paginated([{ chips: t1 }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=chips&where=chips[=][${JSON.stringify(t1)}]`, {
        chips: t2,
      }),
    ).toEqual([{ chips: t2 }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(chips, { chips: '[]' })).toEqual([{ chips: [] }])
    expect(await $postAsAdmin(chips, { chips: '["foo"]' })).toEqual([{ chips: ['foo'] }])
    expect(await $postAsAdmin(chips, { chips: '[1]' })).toEqual([{ chips: ['1'] }])
    expect(await $postAsAdmin(chips, { chips: '[-0.5]' })).toEqual([{ chips: ['-0.5'] }])
    expect(await $postAsAdmin(chips, { chips: JSON.stringify(['foo']) })).toEqual([{ chips: ['foo'] }])
    expect(await $postAsAdmin(chips, { chips: ['foo', 'FOO'] })).toEqual([{ chips: ['foo', 'FOO'] }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(chips, { chips: true })).toEqual($422([{ chips: expect.any(String) }]))
    expect(await $postAsAdmin(chips, { chips: null })).toEqual($422([{ chips: expect.any(String) }]))
    expect(await $postAsAdmin(chips, { chips: {} })).toEqual($422([{ chips: expect.any(String) }]))
    expect(await $postAsAdmin(chips, { chips: '[' })).toEqual($422([{ chips: expect.any(String) }]))
    expect(await $postAsAdmin(chips, { chips: '[true]' })).toEqual(
      $422([{ 'chips': expect.any(String), 'chips.0': expect.any(String) }]),
    )
    expect(await $postAsAdmin(chips, { chips: '[[]]' })).toEqual(
      $422([{ 'chips': expect.any(String), 'chips.0': expect.any(String) }]),
    )
    expect(await $postAsAdmin(chips, { chips: '[{}]' })).toEqual(
      $422([{ 'chips': expect.any(String), 'chips.0': expect.any(String) }]),
    )

    // choices
    expect(await $postAsAdmin(chipsChoices, { chipsChoices: [] })).toEqual([{ chipsChoices: [] }])
    expect(await $postAsAdmin(chipsChoices, { chipsChoices: ['option1'] })).toEqual([{ chipsChoices: ['option1'] }])
    expect(await $postAsAdmin(chipsChoices, { chipsChoices: ['foo'] })).toEqual(
      $422([{ 'chipsChoices': expect.any(String), 'chipsChoices.0': expect.any(String) }]),
    )
    expect(await $postAsAdmin(chipsChoices, { chipsChoices: ['option1', 'option1'] })).toEqual(
      $422([{ 'chipsChoices': expect.any(String), 'chipsChoices.1': expect.any(String) }]),
    )

    // min/max
    expect(await $postAsAdmin(chipsMinMax, {})).toEqual([{ chipsMinMax: ['foo', 'bar'] }])
    expect(await $postAsAdmin(chipsMinMax, { chipsMinMax: ['foo', 'bar', 'baz'] })).toEqual([
      { chipsMinMax: ['foo', 'bar', 'baz'] },
    ])
    expect(await $postAsAdmin(chipsMinMax, { chipsMinMax: [] })).toEqual($422([{ chipsMinMax: expect.any(String) }]))
    expect(await $postAsAdmin(chipsMinMax, { chipsMinMax: ['foo'] })).toEqual(
      $422([{ chipsMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(chipsMinMax, { chipsMinMax: ['foo', 'bar', 'baz', 'qux'] })).toEqual(
      $422([{ chipsMinMax: expect.any(String) }]),
    )

    // allow duplicate items
    expect(await $postAsAdmin(chipsAllowDuplicates, { chipsAllowDuplicates: [] })).toEqual([
      { chipsAllowDuplicates: [] },
    ])
    expect(await $postAsAdmin(chipsAllowDuplicates, { chipsAllowDuplicates: ['foo', 'foo'] })).toEqual([
      { chipsAllowDuplicates: ['foo', 'foo'] },
    ])

    // allow duplicate items (with choices)
    expect(await $postAsAdmin(chipsChoicesAllowDuplicates, { chipsChoicesAllowDuplicates: [] })).toEqual([
      { chipsChoicesAllowDuplicates: [] },
    ])
    expect(
      await $postAsAdmin(chipsChoicesAllowDuplicates, { chipsChoicesAllowDuplicates: ['option1', 'option1'] }),
    ).toEqual([{ chipsChoicesAllowDuplicates: ['option1', 'option1'] }])
    expect(await $postAsAdmin(chipsChoicesAllowDuplicates, { chipsChoicesAllowDuplicates: ['foo'] })).toEqual(
      $422([
        { 'chipsChoicesAllowDuplicates': expect.any(String), 'chipsChoicesAllowDuplicates.0': expect.any(String) },
      ]),
    )

    // deduplicate items
    expect(await $postAsAdmin(chipsDeduplicate, { chipsDeduplicate: ['foo', 'foo'] })).toEqual([
      { chipsDeduplicate: ['foo'] },
    ])
  })
})
