import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('number field', () => {
  const number = '/api/collections/fields?returning=number'
  const numberMinMax = '/api/collections/fields?returning=numberMinMax'
  const numberDecimals = '/api/collections/fields?returning=numberDecimals'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(number, { number: undefined })).toEqual([{ number: 0 }])
    expect(await $postAsAdmin(number, { number: 1 })).toEqual([{ number: 1 }])
    expect(await $getAsAdmin('/api/collections/fields?select=number&where=number[=][1]')).toEqual(
      $paginated([{ number: 1 }]),
    )
    expect(await $patchAsAdmin('/api/collections/fields?returning=number&where=number[=][1]', { number: 0 })).toEqual([
      { number: 0 },
    ])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(number, { number: '1' })).toEqual([{ number: 1 }])
    expect(await $postAsAdmin(number, { number: ' 001.000 ' })).toEqual([{ number: 1 }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(number, { number: true })).toEqual($422([{ number: expect.any(String) }]))
    expect(await $postAsAdmin(number, { number: null })).toEqual($422([{ number: expect.any(String) }]))

    // integer
    expect(await $postAsAdmin(number, { number: 1.1 })).toEqual($422([{ number: expect.any(String) }]))

    // min/max
    expect(await $postAsAdmin(numberMinMax, { numberMinMax: undefined })).toEqual([{ numberMinMax: 50 }])
    expect(await $postAsAdmin(numberMinMax, { numberMinMax: 1 })).toEqual([{ numberMinMax: 1 }])
    expect(await $postAsAdmin(numberMinMax, { numberMinMax: 100 })).toEqual([{ numberMinMax: 100 }])
    expect(await $postAsAdmin(numberMinMax, { numberMinMax: 100.1 })).toEqual(
      $422([{ numberMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(numberMinMax, { numberMinMax: 101 })).toEqual(
      $422([{ numberMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(numberMinMax, { numberMinMax: 0 })).toEqual($422([{ numberMinMax: expect.any(String) }]))

    // decimals
    expect(await $postAsAdmin(numberDecimals, { numberDecimals: undefined })).toEqual([{ numberDecimals: 0 }])
    expect(await $postAsAdmin(numberDecimals, { numberDecimals: 0 })).toEqual([{ numberDecimals: 0 }])
    expect(await $postAsAdmin(numberDecimals, { numberDecimals: 0.1 })).toEqual([{ numberDecimals: 0.1 }])
    expect(await $postAsAdmin(numberDecimals, { numberDecimals: 0.01 })).toEqual([{ numberDecimals: 0.01 }])
    expect(await $postAsAdmin(numberDecimals, { numberDecimals: 0.001 })).toEqual(
      $422([{ numberDecimals: expect.any(String) }]),
    )
  })
})
