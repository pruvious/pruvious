import { describe, expect, test } from 'vitest'
import { $422, $deleteAsAdmin, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('record field', () => {
  const record = '/api/collections/fields?returning=record'
  const recordPopulate = '/api/collections/fields?returning=recordPopulate'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(record, { record: undefined })).toEqual([{ record: null }])
    expect(await $postAsAdmin(record, { record: 1 })).toEqual([{ record: 1 }])
    expect(await $getAsAdmin(`/api/collections/fields?select=record&where=record[=][1]`)).toEqual(
      $paginated([{ record: 1 }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=record&where=record[=][1]`, {
        record: 2,
      }),
    ).toEqual([{ record: 2 }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(record, { record: '1' })).toEqual([{ record: 1 }])
    expect(await $postAsAdmin(record, { record: '001.00' })).toEqual([{ record: 1 }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(record, { record: true })).toEqual($422([{ record: expect.any(String) }]))
    expect(await $postAsAdmin(record, { record: [] })).toEqual($422([{ record: expect.any(String) }]))
    expect(await $postAsAdmin(record, { record: {} })).toEqual($422([{ record: expect.any(String) }]))

    // non-existent record
    expect(await $postAsAdmin(record, { record: 9001 })).toEqual($422([{ record: expect.any(String) }]))

    // populate
    expect(await $postAsAdmin(`${recordPopulate}&populate=t`, { recordPopulate: 3 })).toEqual([
      {
        recordPopulate: {
          id: 3,
          email: 'author@pruvious.com',
          roles: [{ id: 1, name: 'Author', permissions: expect.arrayContaining(['access-dashboard']) }],
        },
      },
    ])
  })

  test('recovery', async () => {
    const user = (await $postAsAdmin('/api/collections/users?returning=id', {
      email: 'tmp@pruvious.com',
      password: 12345678,
    })) as [{ id: number }]
    expect(user).toEqual([{ id: expect.any(Number) }])
    const result = (await $postAsAdmin(`${record},id`, { record: user[0].id })) as [{ record: number; id: number }]
    expect(result).toEqual([{ record: user[0].id, id: expect.any(Number) }])
    expect(await $deleteAsAdmin(`/api/collections/users/${user[0].id}`)).toEqual(1)
    expect(await $getAsAdmin(`/api/collections/fields/${result[0].id}?select=record`)).toEqual({ record: user[0].id })
    expect(await $getAsAdmin(`/api/collections/fields/${result[0].id}?select=record&populate=1`)).toEqual({
      record: null,
    })
  })
})
