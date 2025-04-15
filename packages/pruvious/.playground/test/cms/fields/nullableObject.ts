import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('nullableObject field', () => {
  const nullableObject = '/api/collections/fields?returning=nullableObject'
  const nullableObjectNested = '/api/collections/fields?returning=nullableObjectNested'

  test('create, filter, update', async () => {
    const t1 = { type: 'text', text: 'foo', number: 9001 }
    const t2 = { type: 'number', text: 'bar', number: 1911 }
    expect(await $postAsAdmin(nullableObject, { nullableObject: undefined })).toEqual([{ nullableObject: null }])
    expect(await $postAsAdmin(nullableObject, { nullableObject: t1 })).toEqual([{ nullableObject: t1 }])
    expect(
      await $getAsAdmin(`/api/collections/fields?select=nullableObject&where=nullableObject[=][${JSON.stringify(t1)}]`),
    ).toEqual($paginated([{ nullableObject: t1 }]))
    expect(
      await $patchAsAdmin(
        `/api/collections/fields?returning=nullableObject&where=nullableObject[=][${JSON.stringify(t1)}]`,
        {
          nullableObject: t2,
        },
      ),
    ).toEqual([{ nullableObject: t2 }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(nullableObject, { nullableObject: '{}' })).toEqual([
      { nullableObject: { type: 'text', text: '', number: 1337 } },
    ])
    expect(
      await $postAsAdmin(nullableObject, {
        nullableObject: JSON.stringify({ type: 'text', text: 'foo', number: 9001 }),
      }),
    ).toEqual([{ nullableObject: { type: 'text', text: 'foo', number: 9001 } }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(nullableObject, { nullableObject: true })).toEqual(
      $422([{ nullableObject: expect.any(String) }]),
    )

    // nullable
    expect(await $postAsAdmin(nullableObject, { nullableObject: null })).toEqual([{ nullableObject: null }])

    // required subfield
    expect(await $postAsAdmin(nullableObject, { nullableObject: { type: 'number' } })).toEqual(
      $422([{ 'nullableObject.number': expect.any(String) }]),
    )
    expect(await $postAsAdmin(nullableObjectNested, { nullableObjectNested: { nested: { type: 'number' } } })).toEqual(
      $422([{ 'nullableObjectNested.nested.number': expect.any(String) }]),
    )

    // nested nullableObject
    expect(
      await $postAsAdmin(nullableObjectNested, {
        nullableObjectNested: { foo: 'foo', nested: { type: 'text', text: 'bar' } },
      }),
    ).toEqual([
      {
        nullableObjectNested: {
          foo: 'foo',
          nested: { type: 'text', text: 'bar', number: 1337 },
          nestedDefault: { foo: 'BAR' },
        },
      },
    ])
    expect(await $postAsAdmin(nullableObjectNested, { nullableObjectNested: { foo: 'foo' } })).toEqual([
      { nullableObjectNested: { foo: 'foo', nested: null, nestedDefault: { foo: 'BAR' } } },
    ])
    expect(
      await $postAsAdmin(nullableObjectNested, {
        nullableObjectNested: { foo: 'foo', nested: null, nestedDefault: null },
      }),
    ).toEqual([{ nullableObjectNested: { foo: 'foo', nested: null, nestedDefault: null } }])
  })
})
