import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('checkbox field', () => {
  const checkbox = '/api/collections/fields?returning=checkbox'
  const checkboxRequireTrue = '/api/collections/fields?returning=checkboxRequireTrue'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(checkbox, { checkbox: undefined })).toEqual([{ checkbox: false }])
    expect(await $postAsAdmin(checkbox, { checkbox: 'T', checkboxRequireTrue: true })).toEqual([{ checkbox: true }])
    expect(await $getAsAdmin(`/api/collections/fields?select=checkbox&where=checkbox[=][true]`)).toEqual(
      $paginated([{ checkbox: true }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=checkbox&where=checkbox[=][T]`, { checkbox: false }),
    ).toEqual([{ checkbox: false }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(checkbox, { checkbox: 1, checkboxRequireTrue: true })).toEqual([{ checkbox: true }])
    expect(await $postAsAdmin(checkbox, { checkbox: '1', checkboxRequireTrue: true })).toEqual([{ checkbox: true }])
    expect(await $postAsAdmin(checkbox, { checkbox: 't', checkboxRequireTrue: true })).toEqual([{ checkbox: true }])
    expect(await $postAsAdmin(checkbox, { checkbox: 'F' })).toEqual([{ checkbox: false }])
    expect(await $postAsAdmin(checkbox, { checkbox: 'FaLsE' })).toEqual([{ checkbox: false }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(checkbox, { checkbox: null })).toEqual($422([{ checkbox: expect.any(String) }]))
    expect(await $postAsAdmin(checkbox, { checkbox: 'true2' })).toEqual($422([{ checkbox: expect.any(String) }]))
    expect(await $postAsAdmin(checkbox, { checkbox: 2 })).toEqual($422([{ checkbox: expect.any(String) }]))
    expect(await $postAsAdmin(checkbox, { checkbox: -1 })).toEqual($422([{ checkbox: expect.any(String) }]))
    expect(await $postAsAdmin(checkbox, { checkbox: [] })).toEqual($422([{ checkbox: expect.any(String) }]))
    expect(await $postAsAdmin(checkbox, { checkbox: {} })).toEqual($422([{ checkbox: expect.any(String) }]))

    // requireTrue
    expect(await $postAsAdmin(checkboxRequireTrue, { checkboxRequireTrue: false })).toEqual([
      { checkboxRequireTrue: false },
    ])
    expect(await $postAsAdmin(checkboxRequireTrue, { checkbox: true, checkboxRequireTrue: true })).toEqual([
      { checkboxRequireTrue: true },
    ])
    expect(await $postAsAdmin(checkboxRequireTrue, { checkbox: true })).toEqual(
      $422([{ checkboxRequireTrue: expect.any(String) }]),
    )
    expect(await $postAsAdmin(checkboxRequireTrue, { checkbox: true, checkboxRequireTrue: false })).toEqual(
      $422([{ checkboxRequireTrue: expect.any(String) }]),
    )
  })
})
