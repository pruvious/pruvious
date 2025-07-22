import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('select field', () => {
  const select = '/api/collections/fields?returning=select'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(select, { select: undefined })).toEqual([{ select: 'option2' }])
    expect(await $postAsAdmin(select, { select: 'option1' })).toEqual([{ select: 'option1' }])
    expect(await $getAsAdmin(`/api/collections/fields?select=select&where=select[=][option1]`)).toEqual(
      $paginated([{ select: 'option1' }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=select&where=select[=][option1]`, { select: 'option3' }),
    ).toEqual([{ select: 'option3' }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(select, { select: true })).toEqual($422([{ select: expect.any(String) }]))
    expect(await $postAsAdmin(select, { select: null })).toEqual($422([{ select: expect.any(String) }]))
  })
})
