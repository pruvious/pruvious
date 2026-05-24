import fs from 'node:fs'
import { describe, expect, test } from 'vitest'
import { $422, $deleteAsAdmin, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin, $postFormData } from '../utils'

describe('images field', () => {
  const images = '/api/collections/relation-fields?returning=images'
  const imagesCasted = '/api/collections/relation-fields?returning=imagesCasted'
  const imagesMinMax = '/api/collections/relation-fields?returning=imagesMinMax'
  const imagesAllowedTypesMime = '/api/collections/relation-fields?returning=imagesAllowedTypesMime'
  const imagesMinSize = '/api/collections/relation-fields?returning=imagesMinSize'
  const imagesMaxSize = '/api/collections/relation-fields?returning=imagesMaxSize'
  const imagesMinWidth = '/api/collections/relation-fields?returning=imagesMinWidth'
  const imagesMaxWidth = '/api/collections/relation-fields?returning=imagesMaxWidth'
  const imagesMinHeight = '/api/collections/relation-fields?returning=imagesMinHeight'
  const imagesMaxHeight = '/api/collections/relation-fields?returning=imagesMaxHeight'

  const imagesRepeater = '/api/collections/relation-fields?returning=imagesRepeater'
  const imagesRepeaterCasted = '/api/collections/relation-fields?returning=imagesRepeaterCasted'
  const imagesRepeaterMinMax = '/api/collections/relation-fields?returning=imagesRepeaterMinMax'
  const imagesRepeaterAllowedTypesMime = '/api/collections/relation-fields?returning=imagesRepeaterAllowedTypesMime'
  const imagesRepeaterMinSize = '/api/collections/relation-fields?returning=imagesRepeaterMinSize'
  const imagesRepeaterMaxSize = '/api/collections/relation-fields?returning=imagesRepeaterMaxSize'
  const imagesRepeaterMinWidth = '/api/collections/relation-fields?returning=imagesRepeaterMinWidth'
  const imagesRepeaterMaxWidth = '/api/collections/relation-fields?returning=imagesRepeaterMaxWidth'
  const imagesRepeaterMinHeight = '/api/collections/relation-fields?returning=imagesRepeaterMinHeight'
  const imagesRepeaterMaxHeight = '/api/collections/relation-fields?returning=imagesRepeaterMaxHeight'

  let pngId = 0
  let svgId = 0
  let svgRotatedId = 0
  let txtId = 0

  test('create uploads', async () => {
    const png = new File([fs.readFileSync('packages/pruvious/.playground/test/files/test.png')], 'test.png')
    const svg = new File([fs.readFileSync('packages/pruvious/.playground/test/files/test.svg')], 'test.svg')
    const svgRotated = new File(
      [fs.readFileSync('packages/pruvious/.playground/test/files/test-rotated.svg')],
      'test-rotated.svg',
    )
    const txt = new File([fs.readFileSync('packages/pruvious/.playground/test/files/test.txt')], 'test.txt')
    const pngResult: any = await $postFormData('/api/uploads', { '': png })
    const svgResult: any = await $postFormData('/api/uploads', { '': svg })
    const svgRotatedResult: any = await $postFormData('/api/uploads', { '': svgRotated })
    const txtResult: any = await $postFormData('/api/uploads', { '': txt })

    expect(pngResult).toEqual([{ success: true, data: expect.any(Object), details: expect.any(Object) }])
    expect(svgResult).toEqual([{ success: true, data: expect.any(Object), details: expect.any(Object) }])
    expect(svgRotatedResult).toEqual([{ success: true, data: expect.any(Object), details: expect.any(Object) }])
    expect(txtResult).toEqual([{ success: true, data: expect.any(Object), details: expect.any(Object) }])

    pngId = pngResult[0].details.id
    svgId = svgResult[0].details.id
    svgRotatedId = svgRotatedResult[0].details.id
    txtId = txtResult[0].details.id
  })

  test('create, filter, update', async () => {
    // Junction
    expect(await $postAsAdmin(images, { images: undefined })).toEqual([{ images: [] }])
    expect(await $postAsAdmin(images, { images: [pngId] })).toEqual([{ images: [pngId] }])
    expect(
      await $getAsAdmin(`/api/collections/relation-fields?select=images&where=images[includes][${pngId}]`),
    ).toEqual($paginated([{ images: [pngId] }]))
    expect(
      await $getAsAdmin(`/api/collections/relation-fields?select=images&where=images[includes][${pngId},${svgId}]`),
    ).toEqual($paginated([]))
    expect(
      await $getAsAdmin(`/api/collections/relation-fields?select=images&where=images[includesAny][${pngId},${svgId}]`),
    ).toEqual($paginated([{ images: [pngId] }]))
    expect(
      await $patchAsAdmin(`/api/collections/relation-fields?returning=images&where=images[includes][${pngId}]`, {
        images: [svgId],
      }),
    ).toEqual([{ images: [svgId] }])

    // Matrix
    expect(await $postAsAdmin(imagesRepeater, { imagesRepeater: [{ images: undefined }] })).toEqual([
      { imagesRepeater: [{ images: [] }] },
    ])
    expect(await $postAsAdmin(imagesRepeater, { imagesRepeater: [{ images: [pngId] }] })).toEqual([
      { imagesRepeater: [{ images: [pngId] }] },
    ])
    expect(
      await $getAsAdmin(
        `/api/collections/relation-fields?select=imagesRepeater&where=imagesRepeater[like][%{"images":$[${pngId}$]}%]`,
      ),
    ).toEqual($paginated([{ imagesRepeater: [{ images: [pngId] }] }]))
    expect(
      await $patchAsAdmin(
        `/api/collections/relation-fields?returning=imagesRepeater&where=imagesRepeater[like][%{"images":$[${pngId}$]}%]`,
        { imagesRepeater: [{ images: [svgId] }] },
      ),
    ).toEqual([{ imagesRepeater: [{ images: [svgId] }] }])
  })

  test('sanitizers', async () => {
    // Junction
    expect(await $postAsAdmin(images, { images: '[]' })).toEqual([{ images: [] }])
    expect(await $postAsAdmin(images, { images: [`${pngId}`] })).toEqual([{ images: [pngId] }])
    expect(await $postAsAdmin(images, { images: [`00${pngId}.00`] })).toEqual([{ images: [pngId] }])

    // Matrix
    expect(await $postAsAdmin(imagesRepeater, { imagesRepeater: '[{"images":"[]"}]' })).toEqual([
      { imagesRepeater: [{ images: [] }] },
    ])
    expect(await $postAsAdmin(imagesRepeater, { imagesRepeater: [{ images: [`${pngId}`] }] })).toEqual([
      { imagesRepeater: [{ images: [pngId] }] },
    ])
    expect(await $postAsAdmin(imagesRepeater, { imagesRepeater: [{ images: [`00${pngId}.00`] }] })).toEqual([
      { imagesRepeater: [{ images: [pngId] }] },
    ])
  })

  test('validators (junction)', async () => {
    // wrong type
    expect(await $postAsAdmin(images, { images: 1 })).toEqual($422([{ images: expect.any(String) }]))
    expect(await $postAsAdmin(images, { images: true })).toEqual($422([{ images: expect.any(String) }]))
    expect(await $postAsAdmin(images, { images: {} })).toEqual($422([{ images: expect.any(String) }]))

    // non-existent files
    expect(await $postAsAdmin(images, { images: [9001] })).toEqual(
      $422([{ 'images': expect.any(String), 'images.0': expect.any(String) }]),
    )

    // min/max
    expect(await $postAsAdmin(imagesMinMax, { imagesMinMax: undefined })).toEqual([{ imagesMinMax: [] }])
    expect(await $postAsAdmin(imagesMinMax, { imagesMinMax: [pngId] })).toEqual([{ imagesMinMax: [pngId] }])
    expect(await $postAsAdmin(imagesMinMax, { imagesMinMax: [pngId, svgId] })).toEqual(
      $422([{ imagesMinMax: expect.any(String) }]),
    )

    // deduplicate
    expect(await $postAsAdmin(images, { images: [pngId, svgId, svgId] })).toEqual([{ images: [pngId, svgId] }])

    // populate (default)
    expect(await $postAsAdmin(`${images}&populate=t`, { images: [pngId] })).toEqual([
      {
        images: [
          {
            id: pngId,
            path: expect.any(String),
            mime: 'image/png',
            size: expect.any(Number),
            description: expect.any(String),
            imageWidth: 340,
            imageHeight: 80,
          },
        ],
      },
    ])

    // populate (with casted uploads fields)
    expect(await $postAsAdmin(`${imagesCasted}&populate=t`, { imagesCasted: [pngId] })).toEqual([
      {
        imagesCasted: [
          {
            id: pngId,
            path: expect.any(String),
            author: 1,
            description: {
              'en': expect.any(String),
              'de': expect.any(String),
              'de-AT': expect.any(String),
              'bs': expect.any(String),
            },
            images: [],
            isLocked: false,
          },
        ],
      },
    ])

    // allowed types
    expect(await $postAsAdmin(imagesAllowedTypesMime, { imagesAllowedTypesMime: [pngId] })).toEqual([
      { imagesAllowedTypesMime: [pngId] },
    ])
    expect(await $postAsAdmin(imagesAllowedTypesMime, { imagesAllowedTypesMime: [svgId] })).toEqual(
      $422([{ 'imagesAllowedTypesMime': expect.any(String), 'imagesAllowedTypesMime.0': expect.any(String) }]),
    )
    expect(await $postAsAdmin(imagesAllowedTypesMime, { imagesAllowedTypesMime: [txtId] })).toEqual(
      $422([{ 'imagesAllowedTypesMime': expect.any(String), 'imagesAllowedTypesMime.0': expect.any(String) }]),
    )
    expect(await $postAsAdmin(images, { images: [txtId] })).toEqual(
      $422([{ 'images': expect.any(String), 'images.0': expect.any(String) }]),
    )

    // min size
    expect(await $postAsAdmin(imagesMinSize, { imagesMinSize: [svgId] })).toEqual([{ imagesMinSize: [svgId] }])
    expect(await $postAsAdmin(imagesMinSize, { imagesMinSize: [pngId] })).toEqual(
      $422([{ 'imagesMinSize': expect.any(String), 'imagesMinSize.0': expect.any(String) }]),
    )

    // max size
    expect(await $postAsAdmin(imagesMaxSize, { imagesMaxSize: [pngId] })).toEqual([{ imagesMaxSize: [pngId] }])
    expect(await $postAsAdmin(imagesMaxSize, { imagesMaxSize: [svgId] })).toEqual(
      $422([{ 'imagesMaxSize': expect.any(String), 'imagesMaxSize.0': expect.any(String) }]),
    )

    // min width
    expect(await $postAsAdmin(imagesMinWidth, { imagesMinWidth: [pngId] })).toEqual([{ imagesMinWidth: [pngId] }])
    expect(await $postAsAdmin(imagesMinWidth, { imagesMinWidth: [svgId] })).toEqual([{ imagesMinWidth: [svgId] }])
    expect(await $postAsAdmin(imagesMinWidth, { imagesMinWidth: [svgRotatedId] })).toEqual(
      $422([{ 'imagesMinWidth': expect.any(String), 'imagesMinWidth.0': expect.any(String) }]),
    )

    // max width
    expect(await $postAsAdmin(imagesMaxWidth, { imagesMaxWidth: [svgRotatedId] })).toEqual([
      { imagesMaxWidth: [svgRotatedId] },
    ])
    expect(await $postAsAdmin(imagesMaxWidth, { imagesMaxWidth: [svgId] })).toEqual(
      $422([{ 'imagesMaxWidth': expect.any(String), 'imagesMaxWidth.0': expect.any(String) }]),
    )
    expect(await $postAsAdmin(imagesMaxWidth, { imagesMaxWidth: [pngId] })).toEqual(
      $422([{ 'imagesMaxWidth': expect.any(String), 'imagesMaxWidth.0': expect.any(String) }]),
    )

    // min height
    expect(await $postAsAdmin(imagesMinHeight, { imagesMinHeight: [svgRotatedId] })).toEqual([
      { imagesMinHeight: [svgRotatedId] },
    ])
    expect(await $postAsAdmin(imagesMinHeight, { imagesMinHeight: [svgId] })).toEqual(
      $422([{ 'imagesMinHeight': expect.any(String), 'imagesMinHeight.0': expect.any(String) }]),
    )
    expect(await $postAsAdmin(imagesMinHeight, { imagesMinHeight: [pngId] })).toEqual(
      $422([{ 'imagesMinHeight': expect.any(String), 'imagesMinHeight.0': expect.any(String) }]),
    )

    // max height
    expect(await $postAsAdmin(imagesMaxHeight, { imagesMaxHeight: [pngId] })).toEqual([{ imagesMaxHeight: [pngId] }])
    expect(await $postAsAdmin(imagesMaxHeight, { imagesMaxHeight: [svgId] })).toEqual([{ imagesMaxHeight: [svgId] }])
    expect(await $postAsAdmin(imagesMaxHeight, { imagesMaxHeight: [svgRotatedId] })).toEqual(
      $422([{ 'imagesMaxHeight': expect.any(String), 'imagesMaxHeight.0': expect.any(String) }]),
    )
  })

  test('validators (matrix)', async () => {
    // wrong type
    expect(await $postAsAdmin(imagesRepeater, { imagesRepeater: [{ images: 1 }] })).toEqual(
      $422([{ 'imagesRepeater.0.images': expect.any(String) }]),
    )
    expect(await $postAsAdmin(imagesRepeater, { imagesRepeater: [{ images: true }] })).toEqual(
      $422([{ 'imagesRepeater.0.images': expect.any(String) }]),
    )
    expect(await $postAsAdmin(imagesRepeater, { imagesRepeater: [{ images: {} }] })).toEqual(
      $422([{ 'imagesRepeater.0.images': expect.any(String) }]),
    )

    // non-existent files
    expect(await $postAsAdmin(imagesRepeater, { imagesRepeater: [{ images: [9001] }] })).toEqual(
      $422([{ 'imagesRepeater.0.images': expect.any(String), 'imagesRepeater.0.images.0': expect.any(String) }]),
    )

    // min/max
    expect(await $postAsAdmin(imagesRepeaterMinMax, { imagesRepeaterMinMax: [{ images: undefined }] })).toEqual([
      { imagesRepeaterMinMax: [{ images: [] }] },
    ])
    expect(await $postAsAdmin(imagesRepeaterMinMax, { imagesRepeaterMinMax: [{ images: [pngId] }] })).toEqual([
      { imagesRepeaterMinMax: [{ images: [pngId] }] },
    ])
    expect(await $postAsAdmin(imagesRepeaterMinMax, { imagesRepeaterMinMax: [{ images: [pngId, svgId] }] })).toEqual(
      $422([{ 'imagesRepeaterMinMax.0.images': expect.any(String) }]),
    )

    // deduplicate
    expect(await $postAsAdmin(imagesRepeater, { imagesRepeater: [{ images: [pngId, svgId, svgId] }] })).toEqual([
      { imagesRepeater: [{ images: [pngId, svgId] }] },
    ])

    // populate (default)
    expect(
      await $postAsAdmin(`${imagesRepeater}&populate=t`, {
        imagesRepeater: [{ images: [pngId] }],
      }),
    ).toEqual([
      {
        imagesRepeater: [
          {
            images: [
              {
                id: pngId,
                path: expect.any(String),
                mime: 'image/png',
                size: expect.any(Number),
                description: expect.any(String),
                imageWidth: 340,
                imageHeight: 80,
              },
            ],
          },
        ],
      },
    ])

    // populate (with casted uploads fields)
    expect(
      await $postAsAdmin(`${imagesRepeaterCasted}&populate=t`, {
        imagesRepeaterCasted: [{ images: [pngId] }],
      }),
    ).toEqual([
      {
        imagesRepeaterCasted: [
          {
            images: [
              {
                id: pngId,
                path: expect.any(String),
                author: 1,
                description: {
                  'en': expect.any(String),
                  'de': expect.any(String),
                  'de-AT': expect.any(String),
                  'bs': expect.any(String),
                },
                images: [],
                isLocked: false,
              },
            ],
          },
        ],
      },
    ])

    // allowed types
    expect(
      await $postAsAdmin(imagesRepeaterAllowedTypesMime, { imagesRepeaterAllowedTypesMime: [{ images: [pngId] }] }),
    ).toEqual([{ imagesRepeaterAllowedTypesMime: [{ images: [pngId] }] }])
    expect(
      await $postAsAdmin(imagesRepeaterAllowedTypesMime, { imagesRepeaterAllowedTypesMime: [{ images: [svgId] }] }),
    ).toEqual(
      $422([
        {
          'imagesRepeaterAllowedTypesMime.0.images': expect.any(String),
          'imagesRepeaterAllowedTypesMime.0.images.0': expect.any(String),
        },
      ]),
    )
    expect(
      await $postAsAdmin(imagesRepeaterAllowedTypesMime, { imagesRepeaterAllowedTypesMime: [{ images: [txtId] }] }),
    ).toEqual(
      $422([
        {
          'imagesRepeaterAllowedTypesMime.0.images': expect.any(String),
          'imagesRepeaterAllowedTypesMime.0.images.0': expect.any(String),
        },
      ]),
    )
    expect(await $postAsAdmin(imagesRepeater, { imagesRepeater: [{ images: [txtId] }] })).toEqual(
      $422([
        {
          'imagesRepeater.0.images': expect.any(String),
          'imagesRepeater.0.images.0': expect.any(String),
        },
      ]),
    )

    // min size
    expect(await $postAsAdmin(imagesRepeaterMinSize, { imagesRepeaterMinSize: [{ images: [svgId] }] })).toEqual([
      { imagesRepeaterMinSize: [{ images: [svgId] }] },
    ])
    expect(await $postAsAdmin(imagesRepeaterMinSize, { imagesRepeaterMinSize: [{ images: [pngId] }] })).toEqual(
      $422([
        {
          'imagesRepeaterMinSize.0.images': expect.any(String),
          'imagesRepeaterMinSize.0.images.0': expect.any(String),
        },
      ]),
    )

    // max size
    expect(await $postAsAdmin(imagesRepeaterMaxSize, { imagesRepeaterMaxSize: [{ images: [pngId] }] })).toEqual([
      { imagesRepeaterMaxSize: [{ images: [pngId] }] },
    ])
    expect(await $postAsAdmin(imagesRepeaterMaxSize, { imagesRepeaterMaxSize: [{ images: [svgId] }] })).toEqual(
      $422([
        {
          'imagesRepeaterMaxSize.0.images': expect.any(String),
          'imagesRepeaterMaxSize.0.images.0': expect.any(String),
        },
      ]),
    )

    // min width
    expect(await $postAsAdmin(imagesRepeaterMinWidth, { imagesRepeaterMinWidth: [{ images: [pngId] }] })).toEqual([
      { imagesRepeaterMinWidth: [{ images: [pngId] }] },
    ])
    expect(await $postAsAdmin(imagesRepeaterMinWidth, { imagesRepeaterMinWidth: [{ images: [svgId] }] })).toEqual([
      { imagesRepeaterMinWidth: [{ images: [svgId] }] },
    ])
    expect(
      await $postAsAdmin(imagesRepeaterMinWidth, { imagesRepeaterMinWidth: [{ images: [svgRotatedId] }] }),
    ).toEqual(
      $422([
        {
          'imagesRepeaterMinWidth.0.images': expect.any(String),
          'imagesRepeaterMinWidth.0.images.0': expect.any(String),
        },
      ]),
    )

    // max width
    expect(
      await $postAsAdmin(imagesRepeaterMaxWidth, { imagesRepeaterMaxWidth: [{ images: [svgRotatedId] }] }),
    ).toEqual([{ imagesRepeaterMaxWidth: [{ images: [svgRotatedId] }] }])
    expect(await $postAsAdmin(imagesRepeaterMaxWidth, { imagesRepeaterMaxWidth: [{ images: [svgId] }] })).toEqual(
      $422([
        {
          'imagesRepeaterMaxWidth.0.images': expect.any(String),
          'imagesRepeaterMaxWidth.0.images.0': expect.any(String),
        },
      ]),
    )
    expect(await $postAsAdmin(imagesRepeaterMaxWidth, { imagesRepeaterMaxWidth: [{ images: [pngId] }] })).toEqual(
      $422([
        {
          'imagesRepeaterMaxWidth.0.images': expect.any(String),
          'imagesRepeaterMaxWidth.0.images.0': expect.any(String),
        },
      ]),
    )

    // min height
    expect(
      await $postAsAdmin(imagesRepeaterMinHeight, { imagesRepeaterMinHeight: [{ images: [svgRotatedId] }] }),
    ).toEqual([{ imagesRepeaterMinHeight: [{ images: [svgRotatedId] }] }])
    expect(await $postAsAdmin(imagesRepeaterMinHeight, { imagesRepeaterMinHeight: [{ images: [svgId] }] })).toEqual(
      $422([
        {
          'imagesRepeaterMinHeight.0.images': expect.any(String),
          'imagesRepeaterMinHeight.0.images.0': expect.any(String),
        },
      ]),
    )
    expect(await $postAsAdmin(imagesRepeaterMinHeight, { imagesRepeaterMinHeight: [{ images: [pngId] }] })).toEqual(
      $422([
        {
          'imagesRepeaterMinHeight.0.images': expect.any(String),
          'imagesRepeaterMinHeight.0.images.0': expect.any(String),
        },
      ]),
    )

    // max height
    expect(await $postAsAdmin(imagesRepeaterMaxHeight, { imagesRepeaterMaxHeight: [{ images: [pngId] }] })).toEqual([
      { imagesRepeaterMaxHeight: [{ images: [pngId] }] },
    ])
    expect(await $postAsAdmin(imagesRepeaterMaxHeight, { imagesRepeaterMaxHeight: [{ images: [svgId] }] })).toEqual([
      { imagesRepeaterMaxHeight: [{ images: [svgId] }] },
    ])
    expect(
      await $postAsAdmin(imagesRepeaterMaxHeight, { imagesRepeaterMaxHeight: [{ images: [svgRotatedId] }] }),
    ).toEqual(
      $422([
        {
          'imagesRepeaterMaxHeight.0.images': expect.any(String),
          'imagesRepeaterMaxHeight.0.images.0': expect.any(String),
        },
      ]),
    )
  })

  test('recovery', async () => {
    // Create junction
    const junction = (await $postAsAdmin(`${images},id`, { images: [pngId, svgId] })) as [
      { images: number[]; id: number },
    ]
    expect(junction).toEqual([{ images: [pngId, svgId], id: expect.any(Number) }])

    // Create matrix
    const matrix = (await $postAsAdmin(`${imagesRepeater},id`, {
      imagesRepeater: [{ images: [pngId, svgId] }],
    })) as [{ imagesRepeater: { images: number[] }[]; id: number }]
    expect(matrix).toEqual([{ imagesRepeater: [{ images: [pngId, svgId] }], id: expect.any(Number) }])

    // Delete txtFile
    expect(await $deleteAsAdmin(`/api/uploads/${pngId}`)).toEqual([
      { success: true, data: expect.any(Object), details: expect.any(Object) },
    ])

    // Check junction recovery
    expect(await $getAsAdmin(`/api/collections/relation-fields/${junction[0].id}?select=images`)).toEqual({
      images: [svgId],
    })
    expect(await $getAsAdmin(`/api/collections/relation-fields/${junction[0].id}?select=images&populate=1`)).toEqual({
      images: [
        {
          id: svgId,
          path: expect.any(String),
          mime: 'image/svg+xml',
          size: expect.any(Number),
          description: expect.any(String),
          imageWidth: 340,
          imageHeight: 80,
        },
      ],
    })

    // Check matrix recovery
    expect(await $getAsAdmin(`/api/collections/relation-fields/${matrix[0].id}?select=imagesRepeater`)).toEqual({
      imagesRepeater: [{ images: [pngId, svgId] }],
    })
    expect(
      await $getAsAdmin(`/api/collections/relation-fields/${matrix[0].id}?select=imagesRepeater&populate=1`),
    ).toEqual({
      imagesRepeater: [
        {
          images: [
            {
              id: svgId,
              path: expect.any(String),
              mime: 'image/svg+xml',
              size: expect.any(Number),
              description: expect.any(String),
              imageWidth: 340,
              imageHeight: 80,
            },
          ],
        },
      ],
    })
  })
})
