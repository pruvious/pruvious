import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('color field', () => {
  const color = '/api/collections/fields?returning=color'
  const colorObjects = '/api/collections/fields?returning=colorObjects'
  const colorGroups = '/api/collections/fields?returning=colorGroups'
  const colorWithAlpha = '/api/collections/fields?returning=colorWithAlpha'
  const colorWithDefault = '/api/collections/fields?returning=colorWithDefault'

  test('create, filter, update with string colors', async () => {
    expect(await $postAsAdmin(color, { color: undefined })).toEqual([{ color: '#ff0000' }])
    expect(await $postAsAdmin(color, { color: '#00ff00' })).toEqual([{ color: '#00ff00' }])
    expect(
      await $getAsAdmin(`/api/collections/fields?select=color&where=color[=][${encodeURIComponent('#00ff00')}]`),
    ).toEqual($paginated([{ color: '#00ff00' }]))
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=color&where=color[=][${encodeURIComponent('#00ff00')}]`, {
        color: '#0000ff',
      }),
    ).toEqual([{ color: '#0000ff' }])
  })

  test('rejects values not in configured colors', async () => {
    expect(await $postAsAdmin(color, { color: '#aabbcc' })).toEqual($422([{ color: expect.any(String) }]))
    expect(await $postAsAdmin(color, { color: 'red' })).toEqual($422([{ color: expect.any(String) }]))
    expect(await $postAsAdmin(color, { color: 1 })).toEqual($422([{ color: expect.any(String) }]))
    expect(await $postAsAdmin(color, { color: null })).toEqual($422([{ color: expect.any(String) }]))
  })

  test('accepts CSS colors with alpha', async () => {
    expect(await $postAsAdmin(colorWithAlpha, { colorWithAlpha: 'rgb(255 0 0 / 0.25)' })).toEqual([
      { colorWithAlpha: 'rgb(255 0 0 / 0.25)' },
    ])
    expect(await $postAsAdmin(colorWithAlpha, { colorWithAlpha: 'hsl(240 100% 50% / 0.75)' })).toEqual([
      { colorWithAlpha: 'hsl(240 100% 50% / 0.75)' },
    ])
  })

  test('default value', async () => {
    expect(await $postAsAdmin(color, { color: undefined })).toEqual([{ color: '#ff0000' }])
    expect(await $postAsAdmin(colorWithDefault, { colorWithDefault: undefined })).toEqual([
      { colorWithDefault: '#0000ff' },
    ])
  })

  test('object form: casted value is the value, populated value uses populate when defined', async () => {
    const created: any = await $postAsAdmin('/api/collections/fields?returning=id,colorObjects', {
      colorObjects: '#0000ff',
    })
    expect(created).toEqual([{ id: expect.any(Number), colorObjects: '#0000ff' }])
    const populateId = created[0].id

    // Populated read returns the `populate` override
    const populated = await $getAsAdmin(
      `/api/collections/fields?select=colorObjects&where=id[=][${populateId}]&populate=t`,
    )
    expect(populated).toEqual($paginated([{ colorObjects: { name: 'blue', rgb: [0, 0, 255] } }]))

    // Choices without populate fall back to the casted value
    const created2: any = await $postAsAdmin('/api/collections/fields?returning=id,colorObjects', {
      colorObjects: '#ff0000',
    })
    const fallbackId = created2[0].id
    const populatedFallback = await $getAsAdmin(
      `/api/collections/fields?select=colorObjects&where=id[=][${fallbackId}]&populate=t`,
    )
    expect(populatedFallback).toEqual($paginated([{ colorObjects: '#ff0000' }]))
  })

  test('grouped colors are accepted', async () => {
    expect(await $postAsAdmin(colorGroups, { colorGroups: 'transparent' })).toEqual([{ colorGroups: 'transparent' }])
    expect(await $postAsAdmin(colorGroups, { colorGroups: '#e11d48' })).toEqual([{ colorGroups: '#e11d48' }])
    expect(await $postAsAdmin(colorGroups, { colorGroups: '#000000' })).toEqual([{ colorGroups: '#000000' }])
    expect(await $postAsAdmin(colorGroups, { colorGroups: '#ffffff' })).toEqual([{ colorGroups: '#ffffff' }])
    // Value not in any group
    expect(await $postAsAdmin(colorGroups, { colorGroups: '#123456' })).toEqual(
      $422([{ colorGroups: expect.any(String) }]),
    )
  })
})
