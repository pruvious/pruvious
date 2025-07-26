import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('switch field', () => {
  const switchField = '/api/collections/fields?returning=switch'
  const switchRequireTrue = '/api/collections/fields?returning=switchRequireTrue'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(switchField, { switch: undefined })).toEqual([{ switch: false }])
    expect(await $postAsAdmin(switchField, { switch: 'T', switchRequireTrue: true })).toEqual([{ switch: true }])
    expect(await $getAsAdmin(`/api/collections/fields?select=switch&where=switch[=][true]`)).toEqual(
      $paginated([{ switch: true }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=switch&where=switch[=][T]`, { switch: false }),
    ).toEqual([{ switch: false }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(switchField, { switch: 1, switchRequireTrue: true })).toEqual([{ switch: true }])
    expect(await $postAsAdmin(switchField, { switch: '1', switchRequireTrue: true })).toEqual([{ switch: true }])
    expect(await $postAsAdmin(switchField, { switch: 't', switchRequireTrue: true })).toEqual([{ switch: true }])
    expect(await $postAsAdmin(switchField, { switch: 'F' })).toEqual([{ switch: false }])
    expect(await $postAsAdmin(switchField, { switch: 'FaLsE' })).toEqual([{ switch: false }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(switchField, { switch: null })).toEqual($422([{ switch: expect.any(String) }]))
    expect(await $postAsAdmin(switchField, { switch: 'true2' })).toEqual($422([{ switch: expect.any(String) }]))
    expect(await $postAsAdmin(switchField, { switch: 2 })).toEqual($422([{ switch: expect.any(String) }]))
    expect(await $postAsAdmin(switchField, { switch: -1 })).toEqual($422([{ switch: expect.any(String) }]))
    expect(await $postAsAdmin(switchField, { switch: [] })).toEqual($422([{ switch: expect.any(String) }]))
    expect(await $postAsAdmin(switchField, { switch: {} })).toEqual($422([{ switch: expect.any(String) }]))

    // requireTrue
    expect(await $postAsAdmin(switchRequireTrue, { switchRequireTrue: false })).toEqual([{ switchRequireTrue: false }])
    expect(await $postAsAdmin(switchRequireTrue, { switch: true, switchRequireTrue: true })).toEqual([
      { switchRequireTrue: true },
    ])
    expect(await $postAsAdmin(switchRequireTrue, { switch: true })).toEqual(
      $422([{ switchRequireTrue: expect.any(String) }]),
    )
    expect(await $postAsAdmin(switchRequireTrue, { switch: true, switchRequireTrue: false })).toEqual(
      $422([{ switchRequireTrue: expect.any(String) }]),
    )
  })
})
