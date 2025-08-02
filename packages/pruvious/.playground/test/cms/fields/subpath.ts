import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('subpath field', () => {
  const subpath = '/api/collections/fields?returning=subpath'
  const subpathAllowNesting = '/api/collections/fields?returning=subpathAllowNesting'
  const subpathForceLowercase = '/api/collections/fields?returning=subpathForceLowercase'
  const subpathMinMax = '/api/collections/fields?returning=subpathMinMax'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(subpath, { subpath: undefined })).toEqual([{ subpath: null }])
    expect(await $postAsAdmin(subpath, { subpath: null })).toEqual([{ subpath: null }])
    expect(await $postAsAdmin(subpath, { subpath: '' })).toEqual([{ subpath: '' }])
    expect(await $postAsAdmin(subpath, { subpath: 'foo' })).toEqual([{ subpath: 'foo' }])
    expect(await $getAsAdmin('/api/collections/fields?select=subpath&where=subpath[=][foo]')).toEqual(
      $paginated([{ subpath: 'foo' }]),
    )
    expect(
      await $patchAsAdmin('/api/collections/fields?returning=subpath&where=subpath[=][foo]', { subpath: 'bar' }),
    ).toEqual([{ subpath: 'bar' }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(subpath, { subpath: 1 })).toEqual([{ subpath: '1' }])
    expect(await $postAsAdmin(subpath, { subpath: '---' })).toEqual([{ subpath: '---' }])
    expect(await $postAsAdmin(subpath, { subpath: '//leading-trailing//' })).toEqual([{ subpath: 'leading-trailing' }])
    expect(await $postAsAdmin(subpathAllowNesting, { subpathAllowNesting: '//leading//trailing//' })).toEqual([
      { subpathAllowNesting: 'leading/trailing' },
    ])
    expect(await $postAsAdmin(subpath, { subpath: 'Slugify  This' })).toEqual([{ subpath: 'Slugify-This' }])
    expect(await $postAsAdmin(subpathForceLowercase, { subpathForceLowercase: 'Slugify  This' })).toEqual([
      { subpathForceLowercase: 'slugify-this' },
    ])
    expect(await $postAsAdmin(subpath, { subpath: ' trim ' })).toEqual([{ subpath: 'trim' }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(subpath, { subpath: true })).toEqual($422([{ subpath: expect.any(String) }]))

    // invalid path
    expect(await $postAsAdmin(subpath, { subpath: 'Slügify  This' })).toEqual($422([{ subpath: expect.any(String) }]))

    // uniqueness
    expect(await $postAsAdmin(subpath, { subpath: '' })).toEqual($422([{ subpath: expect.any(String) }]))
    expect(await $postAsAdmin(subpath, { subpath: 'bar' })).toEqual($422([{ subpath: expect.any(String) }]))
    expect(await $postAsAdmin(subpath, { subpath: 'BAR' })).toEqual($422([{ subpath: expect.any(String) }]))
    expect(await $postAsAdmin(subpath, { subpath: ' //bar// ' })).toEqual($422([{ subpath: expect.any(String) }]))
    expect(await $postAsAdmin(subpath, { subpath: 'baz' })).toEqual([{ subpath: 'baz' }])

    // nesting
    expect(await $postAsAdmin(subpath, { subpath: 'foo/bar' })).toEqual($422([{ subpath: expect.any(String) }]))
    expect(await $postAsAdmin(subpathAllowNesting, { subpathAllowNesting: 'foo/bar' })).toEqual([
      { subpathAllowNesting: 'foo/bar' },
    ])

    // min/max
    expect(await $postAsAdmin(subpathMinMax, { subpathMinMax: 'fo' })).toEqual(
      $422([{ subpathMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(subpathMinMax, { subpathMinMax: 'foobarb' })).toEqual(
      $422([{ subpathMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(subpathMinMax, { subpathMinMax: 'foo' })).toEqual([{ subpathMinMax: 'foo' }])
    expect(await $postAsAdmin(subpathMinMax, { subpathMinMax: 'foobar' })).toEqual([{ subpathMinMax: 'foobar' }])
  })
})
