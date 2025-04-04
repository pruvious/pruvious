import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('date field', () => {
  const date = '/api/collections/fields?returning=date'
  const dateMinMax = '/api/collections/fields?returning=dateMinMax'

  test('create, filter, update', async () => {
    const d1 = Date.parse('2025-12-30')
    const d2 = Date.parse('2025-12-31')
    expect(await $postAsAdmin(date, { date: undefined })).toEqual([{ date: null }])
    expect(await $postAsAdmin(date, { date: null })).toEqual([{ date: null }])
    expect(await $postAsAdmin(date, { date: d1 })).toEqual([{ date: d1 }])
    expect(await $getAsAdmin(`/api/collections/fields?select=date&where=date[=][${d1}]`)).toEqual(
      $paginated([{ date: d1 }]),
    )
    expect(await $patchAsAdmin(`/api/collections/fields?returning=date&where=date[=][${d1}]`, { date: d2 })).toEqual([
      { date: d2 },
    ])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(date, { date: '2025-01-01' })).toEqual([{ date: Date.parse('2025-01-01') }])
    expect(await $postAsAdmin(date, { date: '2025-01' })).toEqual([{ date: Date.parse('2025-01-01') }])
    expect(await $postAsAdmin(date, { date: String(Date.parse('2025-01-01')) + '.00' })).toEqual([
      { date: Date.parse('2025-01-01') },
    ])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(date, { date: true })).toEqual($422([{ date: expect.any(String) }]))

    // min/max
    expect(await $postAsAdmin(date, { date: -59011459200001 })).toEqual($422([{ date: expect.any(String) }]))
    expect(await $postAsAdmin(date, { date: 8640000000000001 })).toEqual($422([{ date: expect.any(String) }]))
    expect(await $postAsAdmin(dateMinMax, { dateMinMax: '2025-03-01' })).toEqual([
      { dateMinMax: Date.parse('2025-03-01') },
    ])
    expect(await $postAsAdmin(dateMinMax, { dateMinMax: '2025-03-31' })).toEqual([
      { dateMinMax: Date.parse('2025-03-31') },
    ])
    expect(await $postAsAdmin(dateMinMax, { dateMinMax: '2025-02-28' })).toEqual(
      $422([{ dateMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(dateMinMax, { dateMinMax: '2025-04-01' })).toEqual(
      $422([{ dateMinMax: expect.any(String) }]),
    )

    // rounded to day
    expect(await $postAsAdmin(date, { date: Date.parse('2025-01-01T01:00:00Z') })).toEqual(
      $422([{ date: expect.any(String) }]),
    )
    expect(await $postAsAdmin(date, { date: Date.parse('2025-01-01T00:01:00Z') })).toEqual(
      $422([{ date: expect.any(String) }]),
    )
    expect(await $postAsAdmin(date, { date: Date.parse('2025-01-01T00:00:01Z') })).toEqual(
      $422([{ date: expect.any(String) }]),
    )
    expect(await $postAsAdmin(date, { date: Date.parse('2025-01-01T00:00:00.001Z') })).toEqual(
      $422([{ date: expect.any(String) }]),
    )
  })
})
