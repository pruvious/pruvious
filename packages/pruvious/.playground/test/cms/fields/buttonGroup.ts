import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('buttonGroup field', () => {
  const buttonGroup = '/api/collections/fields?returning=buttonGroup'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(buttonGroup, { buttonGroup: undefined })).toEqual([{ buttonGroup: 'option2' }])
    expect(await $postAsAdmin(buttonGroup, { buttonGroup: 'option1' })).toEqual([{ buttonGroup: 'option1' }])
    expect(await $getAsAdmin(`/api/collections/fields?select=buttonGroup&where=buttonGroup[=][option1]`)).toEqual(
      $paginated([{ buttonGroup: 'option1' }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=buttonGroup&where=buttonGroup[=][option1]`, {
        buttonGroup: 'option3',
      }),
    ).toEqual([{ buttonGroup: 'option3' }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(buttonGroup, { buttonGroup: true })).toEqual($422([{ buttonGroup: expect.any(String) }]))
    expect(await $postAsAdmin(buttonGroup, { buttonGroup: null })).toEqual($422([{ buttonGroup: expect.any(String) }]))
  })
})
