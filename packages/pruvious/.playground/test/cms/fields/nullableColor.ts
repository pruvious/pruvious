import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('nullable color field', () => {
  const nullableColor = '/api/collections/fields?returning=nullableColor'
  const nullableColorObjects = '/api/collections/fields?returning=nullableColorObjects'
  const nullableColorWithDefault = '/api/collections/fields?returning=nullableColorWithDefault'
  const nullableColorGroups = '/api/collections/fields?returning=nullableColorGroups'

  test('defaults to null when no default configured', async () => {
    expect(await $postAsAdmin(nullableColor, { nullableColor: undefined })).toEqual([{ nullableColor: null }])
  })

  test('accepts null and configured values', async () => {
    expect(await $postAsAdmin(nullableColor, { nullableColor: null })).toEqual([{ nullableColor: null }])
    expect(await $postAsAdmin(nullableColor, { nullableColor: '#ff0000' })).toEqual([{ nullableColor: '#ff0000' }])
    expect(await $postAsAdmin(nullableColor, { nullableColor: '#0000ff' })).toEqual([{ nullableColor: '#0000ff' }])
  })

  test('rejects values not in configured colors', async () => {
    expect(await $postAsAdmin(nullableColor, { nullableColor: '#aabbcc' })).toEqual(
      $422([{ nullableColor: expect.any(String) }]),
    )
    expect(await $postAsAdmin(nullableColor, { nullableColor: 'red' })).toEqual(
      $422([{ nullableColor: expect.any(String) }]),
    )
    expect(await $postAsAdmin(nullableColor, { nullableColor: 1 })).toEqual(
      $422([{ nullableColor: expect.any(String) }]),
    )
  })

  test('supports default value', async () => {
    expect(await $postAsAdmin(nullableColorWithDefault, { nullableColorWithDefault: undefined })).toEqual([
      { nullableColorWithDefault: '#00ff00' },
    ])
    // Still nullable: explicit null is accepted
    expect(await $postAsAdmin(nullableColorWithDefault, { nullableColorWithDefault: null })).toEqual([
      { nullableColorWithDefault: null },
    ])
  })

  test('clearing: patch to null deselects', async () => {
    const created: any = await $postAsAdmin('/api/collections/fields?returning=id,nullableColor', {
      nullableColor: '#ff0000',
    })
    const id = created[0].id
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=nullableColor&where=id[=][${id}]`, {
        nullableColor: null,
      }),
    ).toEqual([{ nullableColor: null }])
    // Verify the row in the table reads back as null
    expect(await $getAsAdmin(`/api/collections/fields?select=nullableColor&where=id[=][${id}]`)).toEqual(
      $paginated([{ nullableColor: null }]),
    )
  })

  test('object form: populated value uses populate, null stays null', async () => {
    // Choice with `populate` override
    const created: any = await $postAsAdmin('/api/collections/fields?returning=id,nullableColorObjects', {
      nullableColorObjects: '#0000ff',
    })
    const populateId = created[0].id
    const populated = await $getAsAdmin(
      `/api/collections/fields?select=nullableColorObjects&where=id[=][${populateId}]&populate=t`,
    )
    expect(populated).toEqual($paginated([{ nullableColorObjects: { name: 'blue', rgb: [0, 0, 255] } }]))

    // Choice without populate falls back to casted value
    const created2: any = await $postAsAdmin('/api/collections/fields?returning=id,nullableColorObjects', {
      nullableColorObjects: '#ff0000',
    })
    const fallbackId = created2[0].id
    const populatedFallback = await $getAsAdmin(
      `/api/collections/fields?select=nullableColorObjects&where=id[=][${fallbackId}]&populate=t`,
    )
    expect(populatedFallback).toEqual($paginated([{ nullableColorObjects: '#ff0000' }]))

    // Null value populates to null
    const created3: any = await $postAsAdmin('/api/collections/fields?returning=id,nullableColorObjects', {
      nullableColorObjects: null,
    })
    const nullId = created3[0].id
    const populatedNull = await $getAsAdmin(
      `/api/collections/fields?select=nullableColorObjects&where=id[=][${nullId}]&populate=t`,
    )
    expect(populatedNull).toEqual($paginated([{ nullableColorObjects: null }]))
  })

  test('grouped colors are accepted', async () => {
    expect(await $postAsAdmin(nullableColorGroups, { nullableColorGroups: 'transparent' })).toEqual([
      { nullableColorGroups: 'transparent' },
    ])
    expect(await $postAsAdmin(nullableColorGroups, { nullableColorGroups: '#e11d48' })).toEqual([
      { nullableColorGroups: '#e11d48' },
    ])
    expect(await $postAsAdmin(nullableColorGroups, { nullableColorGroups: null })).toEqual([
      { nullableColorGroups: null },
    ])
    expect(await $postAsAdmin(nullableColorGroups, { nullableColorGroups: '#123456' })).toEqual(
      $422([{ nullableColorGroups: expect.any(String) }]),
    )
  })
})
