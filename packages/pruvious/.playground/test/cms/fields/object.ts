import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('object field', () => {
  const object = '/api/collections/fields?returning=object'
  const objectNested = '/api/collections/fields?returning=objectNested'

  test('create, filter, update', async () => {
    const t1 = { type: 'text', text: 'foo', number: 9001 }
    const t2 = { type: 'number', text: 'bar', number: 1911 }
    expect(await $postAsAdmin(object, { object: undefined })).toEqual([
      { object: { type: 'text', text: '', number: 1337 } },
    ])
    expect(await $postAsAdmin(object, { object: t1 })).toEqual([{ object: t1 }])
    expect(await $getAsAdmin(`/api/collections/fields?select=object&where=object[=][${JSON.stringify(t1)}]`)).toEqual(
      $paginated([{ object: t1 }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=object&where=object[=][${JSON.stringify(t1)}]`, {
        object: { ...t2, qux: false },
      }),
    ).toEqual([{ object: t2 }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(object, { object: '{}' })).toEqual([{ object: { type: 'text', text: '', number: 1337 } }])
    expect(await $postAsAdmin(object, { object: JSON.stringify({ type: 'text', text: 'foo', number: 9001 }) })).toEqual(
      [{ object: { type: 'text', text: 'foo', number: 9001 } }],
    )
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(object, { object: true })).toEqual($422([{ object: expect.any(String) }]))
    expect(await $postAsAdmin(object, { object: null })).toEqual($422([{ object: expect.any(String) }]))

    // required subfield
    expect(await $postAsAdmin(object, { object: { type: 'number' } })).toEqual(
      $422([{ 'object.number': expect.any(String) }]),
    )
    expect(await $postAsAdmin(objectNested, { objectNested: { nested: { type: 'number' } } })).toEqual(
      $422([{ 'objectNested.nested.number': expect.any(String) }]),
    )

    // nested object
    expect(
      await $postAsAdmin(objectNested, {
        objectNested: { foo: 'foo', nested: { type: 'text', text: 'bar' } },
      }),
    ).toEqual([{ objectNested: { foo: 'foo', nested: { type: 'text', text: 'bar', number: 1337 } } }])
  })
})
