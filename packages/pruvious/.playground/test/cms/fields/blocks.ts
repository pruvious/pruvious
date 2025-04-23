import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('blocks field', () => {
  const blocks = '/api/collections/fields?returning=blocks'
  const blocksMinMax = '/api/collections/fields?returning=blocksMinMax'
  const blocksUnique = '/api/collections/fields?returning=blocksUnique'
  const blocksDeduplicate = '/api/collections/fields?returning=blocksDeduplicate'
  const blocksAllowedRoot = '/api/collections/fields?returning=blocksAllowedRoot'

  test('create, filter, update', async () => {
    const t1 = [
      { $key: 'Button', label: 'foo' },
      { $key: 'Button', label: 'bar' },
    ]
    const t2 = [{ $key: 'Button', label: 'baz' }]
    expect(await $postAsAdmin(blocks, { blocks: undefined })).toEqual([{ blocks: [] }])
    expect(await $postAsAdmin(blocks, { blocks: t1 })).toEqual([{ blocks: t1 }])
    expect(
      await $getAsAdmin(
        `/api/collections/fields?select=blocks&where=blocks[=][${JSON.stringify(t1).replaceAll('$', '$$$')}]`,
      ),
    ).toEqual($paginated([{ blocks: t1 }]))
    expect(
      await $patchAsAdmin(
        `/api/collections/fields?returning=blocks&where=blocks[=][${JSON.stringify(t1).replaceAll('$', '$$$')}]`,
        { blocks: t2.map((item) => ({ ...item, qux: false })) },
      ),
    ).toEqual([{ blocks: t2 }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(blocks, { blocks: '[]' })).toEqual([{ blocks: [] }])
    expect(await $postAsAdmin(blocks, { blocks: JSON.stringify([{ $key: 'Button', label: 'foo' }]) })).toEqual([
      { blocks: [{ $key: 'Button', label: 'foo' }] },
    ])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(blocks, { blocks: true })).toEqual($422([{ blocks: expect.any(String) }]))
    expect(await $postAsAdmin(blocks, { blocks: null })).toEqual($422([{ blocks: expect.any(String) }]))

    // required subfield
    expect(await $postAsAdmin(blocks, { blocks: [{ $key: 'Button' }] })).toEqual(
      $422([{ 'blocks.0.label': expect.any(String) }]),
    )
    expect(
      await $postAsAdmin(blocks, {
        blocks: [{ $key: 'Nesting', slot: [{}, { $key: 'Button' }, { $key: 'Foo' }] }],
      }),
    ).toEqual(
      $422([
        {
          'blocks.0.slot.0': expect.any(String),
          'blocks.0.slot.1.label': expect.any(String),
          'blocks.0.slot.2': expect.any(String),
        },
      ]),
    )

    // min/max
    expect(await $postAsAdmin(blocksMinMax, {})).toEqual([
      {
        blocksMinMax: [
          { $key: 'Button', label: 'Foo' },
          { $key: 'Button', label: 'Bar' },
        ],
      },
    ])
    expect(
      await $postAsAdmin(blocksMinMax, {
        blocksMinMax: [
          { $key: 'Button', label: 'Baz' },
          { $key: 'Button', label: 'Baz' },
          { $key: 'Button', label: 'Baz' },
        ],
      }),
    ).toEqual([
      {
        blocksMinMax: [
          { $key: 'Button', label: 'Baz' },
          { $key: 'Button', label: 'Baz' },
          { $key: 'Button', label: 'Baz' },
        ],
      },
    ])
    expect(await $postAsAdmin(blocksMinMax, { blocksMinMax: [] })).toEqual($422([{ blocksMinMax: expect.any(String) }]))
    expect(await $postAsAdmin(blocksMinMax, { blocksMinMax: [{ $key: 'Button', label: 'Baz' }] })).toEqual(
      $422([{ blocksMinMax: expect.any(String) }]),
    )
    expect(
      await $postAsAdmin(blocksMinMax, {
        blocksMinMax: [
          { $key: 'Button', label: 'Baz' },
          { $key: 'Button', label: 'Baz' },
          { $key: 'Button', label: 'Baz' },
          { $key: 'Button', label: 'Baz' },
        ],
      }),
    ).toEqual($422([{ blocksMinMax: expect.any(String) }]))

    // unique items
    expect(await $postAsAdmin(blocksUnique, {})).toEqual([{ blocksUnique: [] }])
    expect(
      await $postAsAdmin(blocksUnique, {
        blocksUnique: [
          { $key: 'Button', label: 'BAR' },
          { $key: 'Button', label: 'BAZ' },
        ],
      }),
    ).toEqual([
      {
        blocksUnique: [
          { $key: 'Button', label: 'BAR' },
          { $key: 'Button', label: 'BAZ' },
        ],
      },
    ])
    expect(
      await $postAsAdmin(blocksUnique, {
        blocksUnique: [
          { $key: 'Button', label: 'BAR' },
          { $key: 'Button', label: 'BAR' },
        ],
      }),
    ).toEqual($422([{ 'blocksUnique': expect.any(String), 'blocksUnique.1': expect.any(String) }]))

    // deduplicate items
    expect(
      await $postAsAdmin(blocksDeduplicate, {
        blocksDeduplicate: [
          { $key: 'Button', label: 'BAR' },
          { $key: 'Button', label: 'bar' },
        ],
      }),
    ).toEqual([
      {
        blocksDeduplicate: [
          { $key: 'Button', label: 'BAR' },
          { $key: 'Button', label: 'bar' },
        ],
      },
    ])
    expect(
      await $postAsAdmin(blocksDeduplicate, {
        blocksDeduplicate: [
          { $key: 'Button', label: 'BAR' },
          { $key: 'Button', label: 'BAR' },
        ],
      }),
    ).toEqual([{ blocksDeduplicate: [{ $key: 'Button', label: 'BAR' }] }])

    // nested blocks
    expect(
      await $postAsAdmin(blocks, {
        blocks: [{ $key: 'Nesting', slot: [{ $key: 'Nesting' }] }],
      }),
    ).toEqual([{ blocks: [{ $key: 'Nesting', slot: [{ $key: 'Nesting', slot: [], page: null }], page: null }] }])
    expect(
      await $postAsAdmin(blocks, {
        blocks: [{ $key: 'Nesting', slot: [{ $key: 'Nesting', slot: [{}] }] }],
      }),
    ).toEqual($422([{ 'blocks.0.slot.0.slot.0': expect.any(String) }]))

    // allowed root blocks
    expect(
      await $postAsAdmin(blocksAllowedRoot, {
        blocksAllowedRoot: [
          {
            $key: 'Container',
            blocks: [
              { $key: 'Button', label: 'Foo' },
              { $key: 'Gallery', blocks: [{ $key: 'Image' }] },
            ],
          },
        ],
      }),
    ).toEqual([
      {
        blocksAllowedRoot: [
          {
            $key: 'Container',
            spacing: 'md',
            blocks: [
              { $key: 'Button', label: 'Foo' },
              { $key: 'Gallery', blocks: [{ $key: 'Image' }] },
            ],
          },
        ],
      },
    ])
    expect(await $postAsAdmin(blocksAllowedRoot, { blocksAllowedRoot: [{ $key: 'Nesting' }] })).toEqual([
      { blocksAllowedRoot: [{ $key: 'Nesting', slot: [], page: null }] },
    ])
    expect(await $postAsAdmin(blocksAllowedRoot, { blocksAllowedRoot: [{ $key: 'Button', label: 'Foo' }] })).toEqual(
      $422([{ 'blocksAllowedRoot.0': expect.any(String) }]),
    )
    expect(await $postAsAdmin(blocksAllowedRoot, { blocksAllowedRoot: [{ $key: 'Button', label: 'Foo' }] })).toEqual(
      $422([{ 'blocksAllowedRoot.0': expect.any(String) }]),
    )
    expect(
      await $postAsAdmin(blocksAllowedRoot, {
        blocksAllowedRoot: [
          {
            $key: 'Container',
            blocks: [
              { $key: 'Button', label: 'Foo' },
              { $key: 'Gallery', blocks: [{ $key: 'Image' }] },
              { $key: 'Image' },
              {
                $key: 'Container',
                blocks: [{ $key: 'Button' }, { $key: 'Gallery', blocks: [{ $key: 'Image' }] }, { $key: 'Image' }],
              },
            ],
          },
        ],
      }),
    ).toEqual(
      $422([
        {
          'blocksAllowedRoot.0.blocks.2': expect.any(String),
          'blocksAllowedRoot.0.blocks.3.blocks.0.label': expect.any(String),
          'blocksAllowedRoot.0.blocks.3.blocks.1': expect.any(String),
          'blocksAllowedRoot.0.blocks.3.blocks.2': expect.any(String),
        },
      ]),
    )
  })
})
