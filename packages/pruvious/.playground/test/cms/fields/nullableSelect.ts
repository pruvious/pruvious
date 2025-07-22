import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('nullableSelect field', () => {
  const nullableSelect = '/api/collections/fields?returning=nullableSelect'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(nullableSelect, { nullableSelect: undefined })).toEqual([{ nullableSelect: 'option2' }])
    expect(await $postAsAdmin(nullableSelect, { nullableSelect: null })).toEqual([{ nullableSelect: null }])
    expect(await $getAsAdmin(`/api/collections/fields?select=nullableSelect&where=nullableSelect[=][null]`)).toEqual(
      $paginated([{ nullableSelect: null }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=nullableSelect&where=nullableSelect[=][null]`, {
        nullableSelect: 'option3',
      }),
    ).toEqual([{ nullableSelect: 'option3' }])
    expect(await $postAsAdmin(nullableSelect, { nullableSelect: null })).toEqual([{ nullableSelect: null }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(nullableSelect, { nullableSelect: true })).toEqual(
      $422([{ nullableSelect: expect.any(String) }]),
    )
  })
})
