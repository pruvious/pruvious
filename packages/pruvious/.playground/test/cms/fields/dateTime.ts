import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('dateTime field', () => {
  const dateTimeUTC = '/api/collections/fields?returning=dateTimeUTC'
  const dateTimeLocal = '/api/collections/fields?returning=dateTimeLocal'
  const dateTimeBerlin = '/api/collections/fields?returning=dateTimeBerlin'
  const dateTimeNewYork = '/api/collections/fields?returning=dateTimeNewYork'
  const dateTimeBerlinMinMax = '/api/collections/fields?returning=dateTimeBerlinMinMax'

  test('create, filter, update', async () => {
    const d1 = Date.parse('2025-12-30')
    const d2 = Date.parse('2025-12-31 13:37:00')
    expect(await $postAsAdmin(dateTimeUTC, { dateTimeUTC: undefined })).toEqual([{ dateTimeUTC: null }])
    expect(await $postAsAdmin(dateTimeUTC, { dateTimeUTC: null })).toEqual([{ dateTimeUTC: null }])
    expect(await $postAsAdmin(dateTimeUTC, { dateTimeUTC: d1 })).toEqual([{ dateTimeUTC: d1 }])
    expect(await $getAsAdmin(`/api/collections/fields?select=dateTimeUTC&where=dateTimeUTC[=][${d1}]`)).toEqual(
      $paginated([{ dateTimeUTC: d1 }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=dateTimeUTC&where=dateTimeUTC[=][${d1}]`, {
        dateTimeUTC: d2,
      }),
    ).toEqual([{ dateTimeUTC: d2 }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(dateTimeUTC, { dateTimeUTC: '2025-01-01' })).toEqual([
      { dateTimeUTC: Date.parse('2025-01-01') },
    ])
    expect(await $postAsAdmin(dateTimeUTC, { dateTimeUTC: '2025-01 13:37:00' })).toEqual([
      { dateTimeUTC: Date.parse('2025-01-01T12:37:00Z') },
    ])
    expect(await $postAsAdmin(dateTimeUTC, { dateTimeUTC: String(Date.parse('2025-01-01')) + '.00' })).toEqual([
      { dateTimeUTC: Date.parse('2025-01-01') },
    ])
  })

  test('time zones', async () => {
    expect(await $postAsAdmin(dateTimeUTC, { dateTimeUTC: '2025-01-01T13:37:00Z' })).toEqual([
      { dateTimeUTC: Date.parse('2025-01-01T13:37:00Z') },
    ])
    expect(await $postAsAdmin(dateTimeLocal, { dateTimeLocal: '2025-01-01T13:37:00Z' })).toEqual([
      { dateTimeLocal: Date.parse('2025-01-01T13:37:00Z') },
    ])
    expect(await $postAsAdmin(dateTimeBerlin, { dateTimeBerlin: '2025-01-01T13:37:00Z' })).toEqual([
      { dateTimeBerlin: Date.parse('2025-01-01T13:37:00Z') },
    ])
    expect(await $postAsAdmin(dateTimeNewYork, { dateTimeNewYork: '2025-01-01T13:37:00Z' })).toEqual([
      { dateTimeNewYork: Date.parse('2025-01-01T13:37:00Z') },
    ])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(dateTimeUTC, { dateTimeUTC: true })).toEqual($422([{ dateTimeUTC: expect.any(String) }]))

    // min/max
    expect(await $postAsAdmin(dateTimeUTC, { dateTimeUTC: -59011459200001 })).toEqual(
      $422([{ dateTimeUTC: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateTimeUTC, { dateTimeUTC: 8640000000000001 })).toEqual(
      $422([{ dateTimeUTC: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateTimeBerlinMinMax, { dateTimeBerlinMinMax: '2025-03-01 GMT+1' })).toEqual([
      { dateTimeBerlinMinMax: Date.parse('2025-02-28T23:00:00Z') },
    ])
    expect(await $postAsAdmin(dateTimeBerlinMinMax, { dateTimeBerlinMinMax: '2025-03-31 GMT+2' })).toEqual([
      { dateTimeBerlinMinMax: Date.parse('2025-03-30T22:00:00Z') },
    ])
    expect(await $postAsAdmin(dateTimeBerlinMinMax, { dateTimeBerlinMinMax: '2025-02-28T22:59:59Z' })).toEqual(
      $422([{ dateTimeBerlinMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateTimeBerlinMinMax, { dateTimeBerlinMinMax: '2025-03-30T22:00:01Z' })).toEqual(
      $422([{ dateTimeBerlinMinMax: expect.any(String) }]),
    )

    // rounded to seconds
    expect(await $postAsAdmin(dateTimeUTC, { dateTimeUTC: Date.parse('2025-01-01T00:00:00.001Z') })).toEqual(
      $422([{ dateTimeUTC: expect.any(String) }]),
    )
  })
})
