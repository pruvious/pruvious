import { describe, expect, test } from 'vitest'
import { $422, $deleteAsAdmin, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('records field', () => {
  const records = '/api/collections/fields?returning=records'
  const recordsMinMax = '/api/collections/fields?returning=recordsMinMax'
  const recordsAllowDuplicates = '/api/collections/fields?returning=recordsAllowDuplicates'
  const recordsDeduplicate = '/api/collections/fields?returning=recordsDeduplicate'
  const recordsPopulate = '/api/collections/fields?returning=recordsPopulate'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(records, { records: undefined })).toEqual([{ records: [] }])
    expect(await $postAsAdmin(records, { records: [1] })).toEqual([{ records: [1] }])
    expect(await $getAsAdmin(`/api/collections/fields?select=records&where=records[=][[$[1$]]]`)).toEqual(
      $paginated([{ records: [1] }]),
    )
    expect(await $getAsAdmin(`/api/collections/fields?select=records&where=records[includes][1]`)).toEqual(
      $paginated([{ records: [1] }]),
    )
    expect(await $getAsAdmin(`/api/collections/fields?select=records&where=records[includes][1,2]`)).toEqual(
      $paginated([]),
    )
    expect(await $getAsAdmin(`/api/collections/fields?select=records&where=records[includesAny][1,2]`)).toEqual(
      $paginated([{ records: [1] }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=records&where=records[=][[$[1$]]]`, {
        records: [2],
      }),
    ).toEqual([{ records: [2] }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(records, { records: '[]' })).toEqual([{ records: [] }])
    expect(await $postAsAdmin(records, { records: ['1'] })).toEqual([{ records: [1] }])
    expect(await $postAsAdmin(records, { records: ['001.00'] })).toEqual([{ records: [1] }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(records, { records: 1 })).toEqual($422([{ records: expect.any(String) }]))
    expect(await $postAsAdmin(records, { records: true })).toEqual($422([{ records: expect.any(String) }]))
    expect(await $postAsAdmin(records, { records: {} })).toEqual($422([{ records: expect.any(String) }]))

    // non-existent records
    expect(await $postAsAdmin(records, { records: [9001] })).toEqual(
      $422([{ 'records': expect.any(String), 'records.0': expect.any(String) }]),
    )

    // min/max
    expect(await $postAsAdmin(recordsMinMax, { recordsMinMax: undefined })).toEqual([{ recordsMinMax: [1, 2] }])
    expect(await $postAsAdmin(recordsMinMax, { recordsMinMax: [3, 4] })).toEqual([{ recordsMinMax: [3, 4] }])
    expect(await $postAsAdmin(recordsMinMax, { recordsMinMax: [1] })).toEqual(
      $422([{ recordsMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(recordsMinMax, { recordsMinMax: [1, 2, 3, 4] })).toEqual(
      $422([{ recordsMinMax: expect.any(String) }]),
    )

    // allow duplicates
    expect(await $postAsAdmin(records, { records: [1, 1] })).toEqual(
      $422([{ 'records': expect.any(String), 'records.1': expect.any(String) }]),
    )
    expect(await $postAsAdmin(recordsAllowDuplicates, { recordsAllowDuplicates: [1, 1] })).toEqual([
      { recordsAllowDuplicates: [1, 1] },
    ])

    // deduplicate
    expect(await $postAsAdmin(records, { records: [1, 2, 2] })).toEqual(
      $422([{ 'records': expect.any(String), 'records.2': expect.any(String) }]),
    )
    expect(await $postAsAdmin(recordsDeduplicate, { recordsDeduplicate: [1, 2, 2] })).toEqual([
      { recordsDeduplicate: [1, 2] },
    ])

    // populate
    expect(await $postAsAdmin(`${recordsPopulate}&populate=t`, { recordsPopulate: [3] })).toEqual([
      {
        recordsPopulate: [
          {
            id: 3,
            email: 'author@pruvious.com',
            roles: [{ id: 1, name: 'Author', permissions: expect.arrayContaining(['access-dashboard']) }],
          },
        ],
      },
    ])
  })

  test('recovery', async () => {
    const user = (await $postAsAdmin('/api/collections/users?returning=id', {
      email: 'tmp@pruvious.com',
      password: 12345678,
    })) as [{ id: number }]
    expect(user).toEqual([{ id: expect.any(Number) }])
    const result = (await $postAsAdmin(`${records},id`, { records: [1, user[0].id, 3] })) as [
      { records: number[]; id: number },
    ]
    expect(result).toEqual([{ records: [1, user[0].id, 3], id: expect.any(Number) }])
    expect(await $deleteAsAdmin(`/api/collections/users/${user[0].id}`)).toEqual(1)
    expect(await $getAsAdmin(`/api/collections/fields/${result[0].id}?select=records`)).toEqual({
      records: [1, user[0].id, 3],
    })
    expect(await $getAsAdmin(`/api/collections/fields/${result[0].id}?select=records&populate=1`)).toEqual({
      records: [
        { id: 1, email: 'admin@pruvious.com', roles: [] },
        { id: 3, email: 'author@pruvious.com', roles: [1] },
      ],
    })
  })
})
