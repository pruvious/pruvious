import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('structure field', () => {
  const structure = '/api/collections/fields?returning=structure'
  const structureMinMax = '/api/collections/fields?returning=structureMinMax'
  const structureUnique = '/api/collections/fields?returning=structureUnique'
  const structureDeduplicate = '/api/collections/fields?returning=structureDeduplicate'
  const structureNested = '/api/collections/fields?returning=structureNested'

  test('create, filter, update', async () => {
    const t1 = [
      { $key: 'image', src: 'foo', alt: 'bar' },
      { $key: 'image', src: 'baz', alt: 'qux' },
      { $key: 'video', src: 'quux', autoplay: true },
    ]
    const t2 = [{ $key: 'video', src: 'foo', autoplay: false }]
    expect(await $postAsAdmin(structure, { structure: undefined })).toEqual([{ structure: [] }])
    expect(await $postAsAdmin(structure, { structure: t1 })).toEqual([{ structure: t1 }])
    expect(
      await $getAsAdmin(
        `/api/collections/fields?select=structure&where=structure[=][${JSON.stringify(t1).replaceAll('$', '$$$')}]`,
      ),
    ).toEqual($paginated([{ structure: t1 }]))
    expect(
      await $patchAsAdmin(
        `/api/collections/fields?returning=structure&where=structure[=][${JSON.stringify(t1).replaceAll('$', '$$$')}]`,
        { structure: t2 },
      ),
    ).toEqual([{ structure: t2 }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(structure, { structure: '[]' })).toEqual([{ structure: [] }])
    expect(await $postAsAdmin(structure, { structure: JSON.stringify([{ $key: 'video', src: 'foo' }]) })).toEqual([
      { structure: [{ $key: 'video', src: 'foo', autoplay: false }] },
    ])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(structure, { structure: true })).toEqual($422([{ structure: expect.any(String) }]))
    expect(await $postAsAdmin(structure, { structure: null })).toEqual($422([{ structure: expect.any(String) }]))

    // required subfield
    expect(await $postAsAdmin(structure, { structure: [{ $key: 'video' }] })).toEqual(
      $422([{ 'structure.0.src': expect.any(String) }]),
    )
    expect(
      await $postAsAdmin(structureNested, {
        structureNested: [{ $key: 'foo', nested: [{}, { $key: 'repeater', repeater: [{}] }] }],
      }),
    ).toEqual(
      $422([
        {
          'structureNested.0.nested.0': expect.any(String),
          'structureNested.0.nested.1.repeater.0.text': expect.any(String),
        },
      ]),
    )

    // min/max
    expect(await $postAsAdmin(structureMinMax, {})).toEqual([
      {
        structureMinMax: [
          { $key: 'foo', bar: 'BAR' },
          { $key: 'baz', qux: 1337 },
        ],
      },
    ])
    expect(
      await $postAsAdmin(structureMinMax, {
        structureMinMax: [
          { $key: 'foo', bar: '' },
          { $key: 'foo', bar: '' },
          { $key: 'foo', bar: '' },
        ],
      }),
    ).toEqual([
      {
        structureMinMax: [
          { $key: 'foo', bar: '' },
          { $key: 'foo', bar: '' },
          { $key: 'foo', bar: '' },
        ],
      },
    ])
    expect(await $postAsAdmin(structureMinMax, { structureMinMax: [] })).toEqual(
      $422([{ structureMinMax: expect.any(String) }]),
    )
    expect(await $postAsAdmin(structureMinMax, { structureMinMax: [{ $key: 'foo', bar: '' }] })).toEqual(
      $422([{ structureMinMax: expect.any(String) }]),
    )
    expect(
      await $postAsAdmin(structureMinMax, {
        structureMinMax: [
          { $key: 'foo', bar: '' },
          { $key: 'foo', bar: '' },
          { $key: 'foo', bar: '' },
          { $key: 'foo', bar: '' },
        ],
      }),
    ).toEqual($422([{ structureMinMax: expect.any(String) }]))

    // unique items
    expect(await $postAsAdmin(structureUnique, {})).toEqual([{ structureUnique: [] }])
    expect(
      await $postAsAdmin(structureUnique, {
        structureUnique: [
          { $key: 'foo', bar: 'BAR' },
          { $key: 'foo', bar: 'BAZ' },
        ],
      }),
    ).toEqual([
      {
        structureUnique: [
          { $key: 'foo', bar: 'BAR' },
          { $key: 'foo', bar: 'BAZ' },
        ],
      },
    ])
    expect(
      await $postAsAdmin(structureUnique, {
        structureUnique: [
          { $key: 'foo', bar: 'BAR' },
          { $key: 'foo', bar: 'BAR' },
        ],
      }),
    ).toEqual($422([{ 'structureUnique': expect.any(String), 'structureUnique.1': expect.any(String) }]))

    // deduplicate items
    expect(
      await $postAsAdmin(structureDeduplicate, {
        structureDeduplicate: [
          { $key: 'foo', bar: 'BAR' },
          { $key: 'foo', bar: 'bar' },
        ],
      }),
    ).toEqual([
      {
        structureDeduplicate: [
          { $key: 'foo', bar: 'BAR' },
          { $key: 'foo', bar: 'bar' },
        ],
      },
    ])
    expect(
      await $postAsAdmin(structureDeduplicate, {
        structureDeduplicate: [
          { $key: 'foo', bar: 'BAR' },
          { $key: 'foo', bar: 'BAR' },
        ],
      }),
    ).toEqual([{ structureDeduplicate: [{ $key: 'foo', bar: 'BAR' }] }])

    // nested structure
    expect(
      await $postAsAdmin(structureNested, {
        structureNested: [{ $key: 'foo', nested: [{ $key: 'repeater', repeater: [] }] }],
      }),
    ).toEqual([{ structureNested: [{ $key: 'foo', nested: [{ $key: 'repeater', repeater: [] }] }] }])
    expect(
      await $postAsAdmin(structureNested, {
        structureNested: [{ $key: 'foo', nested: [{ $key: 'repeater', repeater: [{}] }] }],
      }),
    ).toEqual($422([{ 'structureNested.0.nested.0.repeater.0.text': expect.any(String) }]))
  })
})
