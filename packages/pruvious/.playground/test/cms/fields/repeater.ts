import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('repeater field', () => {
  const repeater = '/api/collections/fields?returning=repeater'
  const repeaterMinMax = '/api/collections/fields?returning=repeaterMinMax'
  const repeaterUnique = '/api/collections/fields?returning=repeaterUnique'
  const repeaterDeduplicate = '/api/collections/fields?returning=repeaterDeduplicate'
  const repeaterNested = '/api/collections/fields?returning=repeaterNested'

  test('create, filter, update', async () => {
    const t1 = [{ type: 'text', text: 'foo', number: 9001 }]
    const t2 = [{ type: 'number', text: 'bar', number: 1911 }]
    expect(await $postAsAdmin(repeater, { repeater: undefined })).toEqual([{ repeater: [] }])
    expect(await $postAsAdmin(repeater, { repeater: t1 })).toEqual([{ repeater: t1 }])
    expect(
      await $getAsAdmin(`/api/collections/fields?select=repeater&where=repeater[=][${JSON.stringify(t1)}]`),
    ).toEqual($paginated([{ repeater: t1 }]))
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=repeater&where=repeater[=][${JSON.stringify(t1)}]`, {
        repeater: t2,
      }),
    ).toEqual([{ repeater: t2 }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(repeater, { repeater: '[]' })).toEqual([{ repeater: [] }])
    expect(
      await $postAsAdmin(repeater, { repeater: JSON.stringify([{ type: 'text', text: 'foo', number: 9001 }]) }),
    ).toEqual([{ repeater: [{ type: 'text', text: 'foo', number: 9001 }] }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(repeater, { repeater: true })).toEqual($422([{ repeater: expect.any(String) }]))
    expect(await $postAsAdmin(repeater, { repeater: null })).toEqual($422([{ repeater: expect.any(String) }]))

    // required subfield
    expect(await $postAsAdmin(repeater, { repeater: [{}] })).toEqual($422([{ 'repeater.0.text': expect.any(String) }]))
    expect(await $postAsAdmin(repeaterNested, { repeaterNested: [{ nested: [{}] }] })).toEqual(
      $422([{ 'repeaterNested.0.foo': expect.any(String), 'repeaterNested.0.nested.0.text': expect.any(String) }]),
    )

    // min/max
    expect(await $postAsAdmin(repeaterMinMax, {})).toEqual([{ repeaterMinMax: [{ foo: 'FOO' }, { foo: 'BAR' }] }])
    expect(await $postAsAdmin(repeaterMinMax, { repeaterMinMax: [{ foo: '' }, { foo: '' }, { foo: '' }] })).toEqual([
      { repeaterMinMax: [{ foo: '' }, { foo: '' }, { foo: '' }] },
    ])
    expect(await $postAsAdmin(repeaterMinMax, { repeaterMinMax: [] })).toEqual(
      $422([{ repeaterMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(repeaterMinMax, { repeaterMinMax: [{ foo: '' }] })).toEqual(
      $422([{ repeaterMinMax: expect.any(String) }]),
    )
    expect(
      await $postAsAdmin(repeaterMinMax, { repeaterMinMax: [{ foo: '' }, { foo: '' }, { foo: '' }, { foo: '' }] }),
    ).toEqual($422([{ repeaterMinMax: expect.any(String) }]))

    // unique items
    expect(await $postAsAdmin(repeaterUnique, {})).toEqual([{ repeaterUnique: [] }])
    expect(await $postAsAdmin(repeaterUnique, { repeaterUnique: [{ foo: 'foo' }, { foo: 'bar' }] })).toEqual([
      { repeaterUnique: [{ foo: 'foo' }, { foo: 'bar' }] },
    ])
    expect(await $postAsAdmin(repeaterUnique, { repeaterUnique: [{ foo: 'foo' }, { foo: 'foo' }] })).toEqual(
      $422([{ 'repeaterUnique': expect.any(String), 'repeaterUnique.1': expect.any(String) }]),
    )

    // deduplicate items
    expect(await $postAsAdmin(repeaterDeduplicate, { repeaterDeduplicate: [{ foo: 'foo' }, { foo: 'bar' }] })).toEqual([
      { repeaterDeduplicate: [{ foo: 'foo' }, { foo: 'bar' }] },
    ])
    expect(await $postAsAdmin(repeaterDeduplicate, { repeaterDeduplicate: [{ foo: 'foo' }, { foo: 'foo' }] })).toEqual([
      { repeaterDeduplicate: [{ foo: 'foo' }] },
    ])

    // nested repeater
    expect(
      await $postAsAdmin(repeaterNested, {
        repeaterNested: [{ foo: 'foo', nested: [{ type: 'text', text: 'bar' }] }],
      }),
    ).toEqual([{ repeaterNested: [{ foo: 'foo', nested: [{ type: 'text', text: 'bar', number: 1337 }] }] }])
    expect(
      await $postAsAdmin(repeaterNested, { repeaterNested: [{ foo: 'foo', nested: [{ type: 'text' }] }] }),
    ).toEqual($422([{ 'repeaterNested.0.nested.0.text': expect.any(String) }]))
  })
})
