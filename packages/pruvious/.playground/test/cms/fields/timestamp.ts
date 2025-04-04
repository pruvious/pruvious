import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('timestamp field', () => {
  const timestamp = '/api/collections/fields?returning=timestamp'
  const timestampMinMax = '/api/collections/fields?returning=timestampMinMax'

  test('create, filter, update', async () => {
    const d1 = Date.parse('2025-12-30')
    const d2 = Date.parse('2025-12-31 13:37:00')
    expect(await $postAsAdmin(timestamp, { timestamp: undefined })).toEqual([{ timestamp: 0 }])
    expect(await $postAsAdmin(timestamp, { timestamp: d1 })).toEqual([{ timestamp: d1 }])
    expect(await $getAsAdmin(`/api/collections/fields?select=timestamp&where=timestamp[=][${d1}]`)).toEqual(
      $paginated([{ timestamp: d1 }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=timestamp&where=timestamp[=][${d1}]`, {
        timestamp: d2,
      }),
    ).toEqual([{ timestamp: d2 }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(timestamp, { timestamp: '2025-01-01' })).toEqual([
      { timestamp: Date.parse('2025-01-01') },
    ])
    expect(await $postAsAdmin(timestamp, { timestamp: '2025-01 13:37:00' })).toEqual([
      { timestamp: Date.parse('2025-01-01T12:37:00Z') },
    ])
    expect(await $postAsAdmin(timestamp, { timestamp: String(Date.parse('2025-01-01')) + '.00' })).toEqual([
      { timestamp: Date.parse('2025-01-01') },
    ])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(timestamp, { timestamp: true })).toEqual($422([{ timestamp: expect.any(String) }]))
    expect(await $postAsAdmin(timestamp, { timestamp: null })).toEqual($422([{ timestamp: expect.any(String) }]))

    // min/max
    expect(await $postAsAdmin(timestamp, { timestamp: -8640000000000000 })).toEqual([{ timestamp: -8640000000000000 }])
    expect(await $postAsAdmin(timestamp, { timestamp: 8640000000000000 })).toEqual([{ timestamp: 8640000000000000 }])
    expect(await $postAsAdmin(timestamp, { timestamp: -8640000000000001 })).toEqual(
      $422([{ timestamp: expect.any(String) }]),
    )
    expect(await $postAsAdmin(timestamp, { timestamp: 8640000000000001 })).toEqual(
      $422([{ timestamp: expect.any(String) }]),
    )
    expect(await $postAsAdmin(timestampMinMax, { timestampMinMax: '2025-03-01' })).toEqual([
      { timestampMinMax: Date.parse('2025-03-01T00:00:00Z') },
    ])
    expect(await $postAsAdmin(timestampMinMax, { timestampMinMax: '2025-03-31' })).toEqual([
      { timestampMinMax: Date.parse('2025-03-31T00:00:00Z') },
    ])
    expect(await $postAsAdmin(timestampMinMax, { timestampMinMax: '2025-02-28T23:59:59.999Z' })).toEqual(
      $422([{ timestampMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(timestampMinMax, { timestampMinMax: '2025-03-31T22:00:00.001Z' })).toEqual(
      $422([{ timestampMinMax: expect.any(String) }]),
    )
  })
})
