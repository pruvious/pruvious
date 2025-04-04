import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('timeRange field', () => {
  const timeRange = '/api/collections/fields?returning=timeRange'
  const timeRangeMinMax = '/api/collections/fields?returning=timeRangeMinMax'
  const timeRangeBounded = '/api/collections/fields?returning=timeRangeBounded'

  test('create, filter, update', async () => {
    const d1 = [7200000, 7201000]
    const d2 = [3600000, 7200000]
    expect(await $postAsAdmin(timeRange, { timeRange: undefined })).toEqual([{ timeRange: [0, 86399000] }])
    expect(await $postAsAdmin(timeRange, { timeRange: d1 })).toEqual([{ timeRange: d1 }])
    expect(await $getAsAdmin(`/api/collections/fields?select=timeRange&where=timeRange[=][[${d1}]]`)).toEqual(
      $paginated([{ timeRange: d1 }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=timeRange&where=timeRange[=][[${d1}]]`, {
        timeRange: d2,
      }),
    ).toEqual([{ timeRange: d2 }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(timeRange, { timeRange: ['00:00:00', '01:00:00'] })).toEqual([
      { timeRange: [0, 3600000] },
    ])
    expect(
      await $postAsAdmin(timeRange, {
        timeRange: ['00:00:01', '3600000.00'],
      }),
    ).toEqual([{ timeRange: [1000, 3600000] }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(timeRange, { timeRange: true })).toEqual($422([{ timeRange: expect.any(String) }]))
    expect(await $postAsAdmin(timeRange, { timeRange: null })).toEqual($422([{ timeRange: expect.any(String) }]))
    expect(await $postAsAdmin(timeRange, { timeRange: [0, null] })).toEqual($422([{ timeRange: expect.any(String) }]))
    expect(await $postAsAdmin(timeRange, { timeRange: [null, 0] })).toEqual($422([{ timeRange: expect.any(String) }]))

    // not tuple
    expect(await $postAsAdmin(timeRange, { timeRange: [] })).toEqual($422([{ timeRange: expect.any(String) }]))
    expect(await $postAsAdmin(timeRange, { timeRange: [0, 3600000, 7200000] })).toEqual(
      $422([{ timeRange: expect.any(String) }]),
    )

    // not range
    expect(await $postAsAdmin(timeRange, { timeRange: [3600000, 0] })).toEqual(
      $422([{ timeRange: expect.any(String) }]),
    )

    // min/max
    expect(await $postAsAdmin(timeRange, { timeRange: [0, 86399000] })).toEqual([{ timeRange: [0, 86399000] }])
    expect(await $postAsAdmin(timeRange, { timeRange: [0, 0] })).toEqual([{ timeRange: [0, 0] }])
    expect(await $postAsAdmin(timeRange, { timeRange: [-1, 86399000] })).toEqual(
      $422([{ timeRange: expect.any(String) }]),
    )
    expect(await $postAsAdmin(timeRange, { timeRange: [0, 86400000] })).toEqual(
      $422([{ timeRange: expect.any(String) }]),
    )
    expect(
      await $postAsAdmin(timeRangeMinMax, {
        timeRangeMinMax: ['01:00:00', '23:00:00'],
      }),
    ).toEqual([{ timeRangeMinMax: [3600000, 82800000] }])
    expect(
      await $postAsAdmin(timeRangeMinMax, {
        timeRangeMinMax: ['00:59:59', '23:00:00'],
      }),
    ).toEqual($422([{ timeRangeMinMax: expect.any(String) }]))
    expect(
      await $postAsAdmin(timeRangeMinMax, {
        timeRangeMinMax: ['01:00:00', '23:00:01'],
      }),
    ).toEqual($422([{ timeRangeMinMax: expect.any(String) }]))

    // minRange/maxRange
    expect(
      await $postAsAdmin(timeRangeMinMax, {
        timeRangeMinMax: ['01:00:00', '01:00:00'],
      }),
    ).toEqual([{ timeRangeMinMax: [3600000, 3600000] }])
    expect(
      await $postAsAdmin(timeRangeBounded, {
        timeRangeBounded: ['01:00:00', '02:00:00'],
      }),
    ).toEqual([{ timeRangeBounded: [3600000, 7200000] }])
    expect(
      await $postAsAdmin(timeRangeBounded, {
        timeRangeBounded: ['01:00:00', '11:00:00'],
      }),
    ).toEqual([{ timeRangeBounded: [3600000, 39600000] }])
    expect(
      await $postAsAdmin(timeRangeBounded, {
        timeRangeBounded: ['00:59:59', '11:00:00'],
      }),
    ).toEqual($422([{ timeRangeBounded: expect.any(String) }]))
    expect(
      await $postAsAdmin(timeRangeBounded, {
        timeRangeBounded: ['01:00:00', '11:00:01'],
      }),
    ).toEqual($422([{ timeRangeBounded: expect.any(String) }]))

    // rounded to seconds
    expect(
      await $postAsAdmin(timeRange, {
        timeRange: [0, 1],
      }),
    ).toEqual($422([{ timeRange: expect.any(String) }]))
  })
})
