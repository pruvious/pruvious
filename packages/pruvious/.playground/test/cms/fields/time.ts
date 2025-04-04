import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('time field', () => {
  const time = '/api/collections/fields?returning=time'
  const timeMinMax = '/api/collections/fields?returning=timeMinMax'

  test('create, filter, update', async () => {
    const t1 = 7200000
    const t2 = 86399000
    expect(await $postAsAdmin(time, { time: undefined })).toEqual([{ time: 0 }])
    expect(await $postAsAdmin(time, { time: t1 })).toEqual([{ time: t1 }])
    expect(await $getAsAdmin(`/api/collections/fields?select=time&where=time[=][${t1}]`)).toEqual(
      $paginated([{ time: t1 }]),
    )
    expect(await $patchAsAdmin(`/api/collections/fields?returning=time&where=time[=][${t1}]`, { time: t2 })).toEqual([
      { time: t2 },
    ])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(time, { time: '00:00:00' })).toEqual([{ time: 0 }])
    expect(await $postAsAdmin(time, { time: '01:00:00' })).toEqual([{ time: 3600000 }])
    expect(await $postAsAdmin(time, { time: '3600000.00' })).toEqual([{ time: 3600000 }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(time, { time: true })).toEqual($422([{ time: expect.any(String) }]))
    expect(await $postAsAdmin(time, { time: null })).toEqual($422([{ time: expect.any(String) }]))

    // min/max
    expect(await $postAsAdmin(time, { time: 0 })).toEqual([{ time: 0 }])
    expect(await $postAsAdmin(time, { time: 86399000 })).toEqual([{ time: 86399000 }])
    expect(await $postAsAdmin(time, { time: -1 })).toEqual($422([{ time: expect.any(String) }]))
    expect(await $postAsAdmin(time, { time: 86400000 })).toEqual($422([{ time: expect.any(String) }]))
    expect(await $postAsAdmin(timeMinMax, { timeMinMax: '01:00:00' })).toEqual([{ timeMinMax: 3600000 }])
    expect(await $postAsAdmin(timeMinMax, { timeMinMax: '23:00:00' })).toEqual([{ timeMinMax: 82800000 }])
    expect(await $postAsAdmin(timeMinMax, { timeMinMax: '00:59:59' })).toEqual(
      $422([{ timeMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(timeMinMax, { timeMinMax: '23:00:01' })).toEqual(
      $422([{ timeMinMax: expect.any(String) }]),
    )

    // rounded to seconds
    expect(await $postAsAdmin(time, { time: 1 })).toEqual($422([{ time: expect.any(String) }]))
  })
})
