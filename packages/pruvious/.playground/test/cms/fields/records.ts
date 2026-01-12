import { describe, expect, test } from 'vitest'
import { $422, $deleteAsAdmin, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('records field', () => {
  const records = '/api/collections/fields?returning=records'
  const recordsMinMax = '/api/collections/fields?returning=recordsMinMax'
  const recordsPopulate = '/api/collections/fields?returning=recordsPopulate'
  const recordsRepeater = '/api/collections/fields?returning=recordsRepeater'
  const recordsRepeaterMinMax = '/api/collections/fields?returning=recordsRepeaterMinMax'
  const recordsRepeaterPopulate = '/api/collections/fields?returning=recordsRepeaterPopulate'

  test('create, filter, update', async () => {
    // Junction
    expect(await $postAsAdmin(records, { records: undefined })).toEqual([{ records: [] }])
    expect(await $postAsAdmin(records, { records: [1] })).toEqual([{ records: [1] }])
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
      await $patchAsAdmin(`/api/collections/fields?returning=records&where=records[includes][1]`, {
        records: [2],
      }),
    ).toEqual([{ records: [2] }])

    // Matrix
    expect(await $postAsAdmin(recordsRepeater, { recordsRepeater: [{ records: undefined }] })).toEqual([
      { recordsRepeater: [{ records: [] }] },
    ])
    expect(await $postAsAdmin(recordsRepeater, { recordsRepeater: [{ records: [1] }] })).toEqual([
      { recordsRepeater: [{ records: [1] }] },
    ])
    expect(
      await $getAsAdmin(
        `/api/collections/fields?select=recordsRepeater&where=recordsRepeater[like][%{"records":$[1$]}%]`,
      ),
    ).toEqual($paginated([{ recordsRepeater: [{ records: [1] }] }]))
    expect(
      await $patchAsAdmin(
        `/api/collections/fields?returning=recordsRepeater&where=recordsRepeater[like][%{"records":$[1$]}%]`,
        { recordsRepeater: [{ records: [2] }] },
      ),
    ).toEqual([{ recordsRepeater: [{ records: [2] }] }])
  })

  test('sanitizers', async () => {
    // Junction
    expect(await $postAsAdmin(records, { records: '[]' })).toEqual([{ records: [] }])
    expect(await $postAsAdmin(records, { records: ['1'] })).toEqual([{ records: [1] }])
    expect(await $postAsAdmin(records, { records: ['001.00'] })).toEqual([{ records: [1] }])

    // Matrix
    expect(await $postAsAdmin(recordsRepeater, { recordsRepeater: '[{"records":"[]"}]' })).toEqual([
      { recordsRepeater: [{ records: [] }] },
    ])
    expect(await $postAsAdmin(recordsRepeater, { recordsRepeater: [{ records: ['1'] }] })).toEqual([
      { recordsRepeater: [{ records: [1] }] },
    ])
    expect(await $postAsAdmin(recordsRepeater, { recordsRepeater: [{ records: ['001.00'] }] })).toEqual([
      { recordsRepeater: [{ records: [1] }] },
    ])
  })

  test('validators (junction)', async () => {
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

    // deduplicate
    expect(await $postAsAdmin(records, { records: [1, 2, 2] })).toEqual([{ records: [1, 2] }])

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

  test('validators (matrix)', async () => {
    // wrong type
    expect(await $postAsAdmin(recordsRepeater, { recordsRepeater: [{ records: 1 }] })).toEqual(
      $422([{ 'recordsRepeater.0.records': expect.any(String) }]),
    )
    expect(await $postAsAdmin(recordsRepeater, { recordsRepeater: [{ records: true }] })).toEqual(
      $422([{ 'recordsRepeater.0.records': expect.any(String) }]),
    )
    expect(await $postAsAdmin(recordsRepeater, { recordsRepeater: [{ records: {} }] })).toEqual(
      $422([{ 'recordsRepeater.0.records': expect.any(String) }]),
    )

    // non-existent records
    expect(await $postAsAdmin(recordsRepeater, { recordsRepeater: [{ records: [9001] }] })).toEqual(
      $422([{ 'recordsRepeater.0.records': expect.any(String), 'recordsRepeater.0.records.0': expect.any(String) }]),
    )

    // min/max
    expect(await $postAsAdmin(recordsRepeaterMinMax, { recordsRepeaterMinMax: [{ records: undefined }] })).toEqual([
      { recordsRepeaterMinMax: [{ records: [1, 2] }] },
    ])
    expect(await $postAsAdmin(recordsRepeaterMinMax, { recordsRepeaterMinMax: [{ records: [3, 4] }] })).toEqual([
      { recordsRepeaterMinMax: [{ records: [3, 4] }] },
    ])
    expect(await $postAsAdmin(recordsRepeaterMinMax, { recordsRepeaterMinMax: [{ records: [1] }] })).toEqual(
      $422([{ 'recordsRepeaterMinMax.0.records': expect.any(String) }]),
    )
    expect(await $postAsAdmin(recordsRepeaterMinMax, { recordsRepeaterMinMax: [{ records: [1, 2, 3, 4] }] })).toEqual(
      $422([{ 'recordsRepeaterMinMax.0.records': expect.any(String) }]),
    )

    // deduplicate
    expect(await $postAsAdmin(recordsRepeater, { recordsRepeater: [{ records: [1, 2, 2] }] })).toEqual([
      { recordsRepeater: [{ records: [1, 2] }] },
    ])

    // populate
    expect(
      await $postAsAdmin(`${recordsRepeaterPopulate}&populate=t`, {
        recordsRepeaterPopulate: [{ records: [3] }],
      }),
    ).toEqual([
      {
        recordsRepeaterPopulate: [
          {
            records: [
              {
                id: 3,
                email: 'author@pruvious.com',
                roles: [{ id: 1, name: 'Author', permissions: expect.arrayContaining(['access-dashboard']) }],
              },
            ],
          },
        ],
      },
    ])
  })

  test('recovery', async () => {
    // Create tmp user
    const user = (await $postAsAdmin('/api/collections/users?returning=id', {
      email: 'tmp@pruvious.com',
      password: 12345678,
    })) as [{ id: number }]
    expect(user).toEqual([{ id: expect.any(Number) }])

    // Create junction
    const junction = (await $postAsAdmin(`${records},id`, { records: [1, user[0].id, 3] })) as [
      { records: number[]; id: number },
    ]
    expect(junction).toEqual([{ records: [1, user[0].id, 3], id: expect.any(Number) }])

    // Create matrix
    const matrix = (await $postAsAdmin(`${recordsRepeater},id`, {
      recordsRepeater: [{ records: [1, user[0].id, 3] }],
    })) as [{ recordsRepeater: { records: number[] }[]; id: number }]
    expect(matrix).toEqual([{ recordsRepeater: [{ records: [1, user[0].id, 3] }], id: expect.any(Number) }])

    // Delete tmp user
    expect(await $deleteAsAdmin(`/api/collections/users/${user[0].id}`)).toEqual(1)

    // Check junction recovery
    expect(await $getAsAdmin(`/api/collections/fields/${junction[0].id}?select=records`)).toEqual({
      records: [1, 3],
    })
    expect(await $getAsAdmin(`/api/collections/fields/${junction[0].id}?select=records&populate=1`)).toEqual({
      records: [
        { id: 1, email: 'admin@pruvious.com', roles: [] },
        { id: 3, email: 'author@pruvious.com', roles: [1] },
      ],
    })

    // Check matrix recovery
    expect(await $getAsAdmin(`/api/collections/fields/${matrix[0].id}?select=recordsRepeater`)).toEqual({
      recordsRepeater: [{ records: [1, user[0].id, 3] }],
    })
    expect(await $getAsAdmin(`/api/collections/fields/${matrix[0].id}?select=recordsRepeater&populate=1`)).toEqual({
      recordsRepeater: [
        {
          records: [
            { id: 1, email: 'admin@pruvious.com', roles: [] },
            { id: 3, email: 'author@pruvious.com', roles: [1] },
          ],
        },
      ],
    })
  })
})
