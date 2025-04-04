import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('dateRange field', () => {
  const dateRange = '/api/collections/fields?returning=dateRange'
  const dateRangeMinMax = '/api/collections/fields?returning=dateRangeMinMax'
  const dateRangeBounded = '/api/collections/fields?returning=dateRangeBounded'

  test('create, filter, update', async () => {
    const d1 = [Date.parse('2025-12-01'), Date.parse('2025-12-02')]
    const d2 = [Date.parse('2025-12-30'), Date.parse('2025-12-31')]
    expect(await $postAsAdmin(dateRange, { dateRange: undefined })).toEqual([{ dateRange: null }])
    expect(await $postAsAdmin(dateRange, { dateRange: null })).toEqual([{ dateRange: null }])
    expect(await $postAsAdmin(dateRange, { dateRange: d1 })).toEqual([{ dateRange: d1 }])
    expect(await $getAsAdmin(`/api/collections/fields?select=dateRange&where=dateRange[=][[${d1}]]`)).toEqual(
      $paginated([{ dateRange: d1 }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=dateRange&where=dateRange[=][[${d1}]]`, { dateRange: d2 }),
    ).toEqual([{ dateRange: d2 }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(dateRange, { dateRange: ['2025-01-01', '2025-02'] })).toEqual([
      { dateRange: [Date.parse('2025-01-01'), Date.parse('2025-02-01')] },
    ])
    expect(await $postAsAdmin(dateRange, { dateRange: [String(Date.parse('2025-01-01')) + '.00', '2025-02'] })).toEqual(
      [{ dateRange: [Date.parse('2025-01-01'), Date.parse('2025-02-01')] }],
    )
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(dateRange, { dateRange: true })).toEqual($422([{ dateRange: expect.any(String) }]))
    expect(await $postAsAdmin(dateRange, { dateRange: [0, null] })).toEqual($422([{ dateRange: expect.any(String) }]))
    expect(await $postAsAdmin(dateRange, { dateRange: [null, 0] })).toEqual($422([{ dateRange: expect.any(String) }]))

    // not tuple
    expect(await $postAsAdmin(dateRange, { dateRange: [] })).toEqual($422([{ dateRange: expect.any(String) }]))
    expect(
      await $postAsAdmin(dateRange, {
        dateRange: [Date.parse('2025-01-01'), Date.parse('2025-01-02'), Date.parse('2025-01-03')],
      }),
    ).toEqual($422([{ dateRange: expect.any(String) }]))

    // not range
    expect(await $postAsAdmin(dateRange, { dateRange: [Date.parse('2025-01-02'), Date.parse('2025-01-01')] })).toEqual(
      $422([{ dateRange: expect.any(String) }]),
    )

    // min/max
    expect(await $postAsAdmin(dateRange, { dateRange: [-59011459200001, 0] })).toEqual(
      $422([{ dateRange: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateRange, { dateRange: [8640000000000001, 0] })).toEqual(
      $422([{ dateRange: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateRange, { dateRange: [0, -59011459200001] })).toEqual(
      $422([{ dateRange: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateRange, { dateRange: [0, 8640000000000001] })).toEqual(
      $422([{ dateRange: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateRangeMinMax, { dateRangeMinMax: ['2025-03-01', '2025-03-31'] })).toEqual([
      { dateRangeMinMax: [Date.parse('2025-03-01'), Date.parse('2025-03-31')] },
    ])
    expect(await $postAsAdmin(dateRangeMinMax, { dateRangeMinMax: ['2025-02-28', '2025-03-31'] })).toEqual(
      $422([{ dateRangeMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateRangeMinMax, { dateRangeMinMax: ['2025-03-01', '2025-04-01'] })).toEqual(
      $422([{ dateRangeMinMax: expect.any(String) }]),
    )

    // minRange/maxRange
    expect(await $postAsAdmin(dateRangeMinMax, { dateRangeMinMax: ['2025-03-01', '2025-03-01'] })).toEqual([
      { dateRangeMinMax: [Date.parse('2025-03-01'), Date.parse('2025-03-01')] },
    ])
    expect(await $postAsAdmin(dateRangeBounded, { dateRangeBounded: ['2025-01-01', '2025-01-11'] })).toEqual([
      { dateRangeBounded: [Date.parse('2025-01-01'), Date.parse('2025-01-11')] },
    ])
    expect(await $postAsAdmin(dateRangeBounded, { dateRangeBounded: ['2025-01-01', '2025-01-02'] })).toEqual([
      { dateRangeBounded: [Date.parse('2025-01-01'), Date.parse('2025-01-02')] },
    ])
    expect(await $postAsAdmin(dateRangeBounded, { dateRangeBounded: ['2025-01-01', '2025-01-12'] })).toEqual(
      $422([{ dateRangeBounded: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateRangeBounded, { dateRangeBounded: ['2025-01-01', '2025-01-01'] })).toEqual(
      $422([{ dateRangeBounded: expect.any(String) }]),
    )

    // rounded to day
    expect(await $postAsAdmin(dateRange, { dateRange: [Date.parse('2025-01-01T01:00:00Z'), '2025-02-01'] })).toEqual(
      $422([{ dateRange: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateRange, { dateRange: [Date.parse('2025-01-01T00:01:00Z'), '2025-02-01'] })).toEqual(
      $422([{ dateRange: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateRange, { dateRange: [Date.parse('2025-01-01T00:00:01Z'), '2025-02-01'] })).toEqual(
      $422([{ dateRange: expect.any(String) }]),
    )
    expect(
      await $postAsAdmin(dateRange, { dateRange: [Date.parse('2025-01-01T00:00:00.001Z'), '2025-02-01'] }),
    ).toEqual($422([{ dateRange: expect.any(String) }]))
  })
})
