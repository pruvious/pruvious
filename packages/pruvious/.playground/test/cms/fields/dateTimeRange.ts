import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('dateTimeRange field', () => {
  const dateTimeRangeUTC = '/api/collections/fields?returning=dateTimeRangeUTC'
  const dateTimeRangeLocal = '/api/collections/fields?returning=dateTimeRangeLocal'
  const dateTimeRangeBerlin = '/api/collections/fields?returning=dateTimeRangeBerlin'
  const dateTimeRangeNewYork = '/api/collections/fields?returning=dateTimeRangeNewYork'
  const dateTimeRangeBerlinMinMax = '/api/collections/fields?returning=dateTimeRangeBerlinMinMax'
  const dateTimeRangeBerlinBounded = '/api/collections/fields?returning=dateTimeRangeBerlinBounded'

  test('create, filter, update', async () => {
    const d1 = [Date.parse('2025-12-01'), Date.parse('2025-12-02')]
    const d2 = [Date.parse('2025-12-30'), Date.parse('2025-12-31 13:37:00')]
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: undefined })).toEqual([{ dateTimeRangeUTC: null }])
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: null })).toEqual([{ dateTimeRangeUTC: null }])
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: d1 })).toEqual([{ dateTimeRangeUTC: d1 }])
    expect(
      await $getAsAdmin(`/api/collections/fields?select=dateTimeRangeUTC&where=dateTimeRangeUTC[=][[${d1}]]`),
    ).toEqual($paginated([{ dateTimeRangeUTC: d1 }]))
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=dateTimeRangeUTC&where=dateTimeRangeUTC[=][[${d1}]]`, {
        dateTimeRangeUTC: d2,
      }),
    ).toEqual([{ dateTimeRangeUTC: d2 }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: ['2025-01-01', '2025-01 13:37:00'] })).toEqual([
      { dateTimeRangeUTC: [Date.parse('2025-01-01'), Date.parse('2025-01-01T12:37:00Z')] },
    ])
    expect(
      await $postAsAdmin(dateTimeRangeUTC, {
        dateTimeRangeUTC: [String(Date.parse('2025-01-01')) + '.00', '2025-02'],
      }),
    ).toEqual([{ dateTimeRangeUTC: [Date.parse('2025-01-01'), Date.parse('2025-02-01')] }])
  })

  test('time zones', async () => {
    expect(
      await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: ['2025-01-01T13:37:00Z', '2025-01-01T19:11:00Z'] }),
    ).toEqual([{ dateTimeRangeUTC: [Date.parse('2025-01-01T13:37:00Z'), Date.parse('2025-01-01T19:11:00Z')] }])
    expect(
      await $postAsAdmin(dateTimeRangeLocal, { dateTimeRangeLocal: ['2025-01-01T13:37:00Z', '2025-01-01T19:11:00Z'] }),
    ).toEqual([{ dateTimeRangeLocal: [Date.parse('2025-01-01T13:37:00Z'), Date.parse('2025-01-01T19:11:00Z')] }])
    expect(
      await $postAsAdmin(dateTimeRangeBerlin, {
        dateTimeRangeBerlin: ['2025-01-01T13:37:00Z', '2025-01-01T19:11:00Z'],
      }),
    ).toEqual([{ dateTimeRangeBerlin: [Date.parse('2025-01-01T13:37:00Z'), Date.parse('2025-01-01T19:11:00Z')] }])
    expect(
      await $postAsAdmin(dateTimeRangeNewYork, {
        dateTimeRangeNewYork: ['2025-01-01T13:37:00Z', '2025-01-01T19:11:00Z'],
      }),
    ).toEqual([{ dateTimeRangeNewYork: [Date.parse('2025-01-01T13:37:00Z'), Date.parse('2025-01-01T19:11:00Z')] }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: true })).toEqual(
      $422([{ dateTimeRangeUTC: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: [0, null] })).toEqual(
      $422([{ dateTimeRangeUTC: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: [null, 0] })).toEqual(
      $422([{ dateTimeRangeUTC: expect.any(String) }]),
    )

    // not tuple
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: [] })).toEqual(
      $422([{ dateTimeRangeUTC: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: [0, 3600000, 7200000] })).toEqual(
      $422([{ dateTimeRangeUTC: expect.any(String) }]),
    )

    // not range
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: [3600000, 0] })).toEqual(
      $422([{ dateTimeRangeUTC: expect.any(String) }]),
    )

    // min/max
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: [-59011459200001, 0] })).toEqual(
      $422([{ dateTimeRangeUTC: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: [8640000000000001, 0] })).toEqual(
      $422([{ dateTimeRangeUTC: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: [0, -59011459200001] })).toEqual(
      $422([{ dateTimeRangeUTC: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateTimeRangeUTC, { dateTimeRangeUTC: [0, 8640000000000001] })).toEqual(
      $422([{ dateTimeRangeUTC: expect.any(String) }]),
    )
    expect(
      await $postAsAdmin(dateTimeRangeBerlinMinMax, {
        dateTimeRangeBerlinMinMax: ['2025-03-01 GMT+1', '2025-03-31 GMT+2'],
      }),
    ).toEqual([{ dateTimeRangeBerlinMinMax: [Date.parse('2025-02-28T23:00:00Z'), Date.parse('2025-03-30T22:00:00Z')] }])
    expect(
      await $postAsAdmin(dateTimeRangeBerlinMinMax, {
        dateTimeRangeBerlinMinMax: ['2025-02-28T22:59:59Z', '2025-03-31 GMT+2'],
      }),
    ).toEqual($422([{ dateTimeRangeBerlinMinMax: expect.any(String) }]))
    expect(
      await $postAsAdmin(dateTimeRangeBerlinMinMax, {
        dateTimeRangeBerlinMinMax: ['2025-03-01 GMT+1', '2025-03-30T22:00:01Z'],
      }),
    ).toEqual($422([{ dateTimeRangeBerlinMinMax: expect.any(String) }]))

    // minRange/maxRange
    expect(
      await $postAsAdmin(dateTimeRangeBerlinMinMax, {
        dateTimeRangeBerlinMinMax: ['2025-03-01 GMT+1', '2025-03-01 GMT+1'],
      }),
    ).toEqual([{ dateTimeRangeBerlinMinMax: [Date.parse('2025-02-28T23:00:00Z'), Date.parse('2025-02-28T23:00:00Z')] }])
    expect(
      await $postAsAdmin(dateTimeRangeBerlinBounded, {
        dateTimeRangeBerlinBounded: ['2025-01-01 13:37:00', '2025-01-11 13:37:00'],
      }),
    ).toEqual([
      { dateTimeRangeBerlinBounded: [Date.parse('2025-01-01T12:37:00Z'), Date.parse('2025-01-11T12:37:00Z')] },
    ])
    expect(
      await $postAsAdmin(dateTimeRangeBerlinBounded, {
        dateTimeRangeBerlinBounded: ['2025-01-01 13:37:00', '2025-01-02 13:37:00'],
      }),
    ).toEqual([
      { dateTimeRangeBerlinBounded: [Date.parse('2025-01-01T12:37:00Z'), Date.parse('2025-01-02T12:37:00Z')] },
    ])
    expect(
      await $postAsAdmin(dateTimeRangeBerlinBounded, {
        dateTimeRangeBerlinBounded: ['2025-01-01 13:37:00', '2025-01-11 13:37:01'],
      }),
    ).toEqual($422([{ dateTimeRangeBerlinBounded: expect.any(String) }]))
    expect(
      await $postAsAdmin(dateTimeRangeBerlinBounded, {
        dateTimeRangeBerlinBounded: ['2025-01-01 13:37:00', '2025-01-01 13:36:59'],
      }),
    ).toEqual($422([{ dateTimeRangeBerlinBounded: expect.any(String) }]))

    // rounded to seconds
    expect(
      await $postAsAdmin(dateTimeRangeUTC, {
        dateTimeRangeUTC: [Date.parse('2025-01-01T00:00:00.001Z'), '2025-02-01'],
      }),
    ).toEqual($422([{ dateTimeRangeUTC: expect.any(String) }]))
  })
})
