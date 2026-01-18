import fs from 'node:fs'
import { describe, expect, test } from 'vitest'
import { $422, $deleteAsAdmin, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin, $postFormData } from '../utils'

describe('files field', () => {
  const files = '/api/collections/relation-fields?returning=files'
  const filesCasted = '/api/collections/relation-fields?returning=filesCasted'
  const filesMinMax = '/api/collections/relation-fields?returning=filesMinMax'
  const filesAllowedTypesMime = '/api/collections/relation-fields?returning=filesAllowedTypesMime'
  const filesAllowedTypesCategory = '/api/collections/relation-fields?returning=filesAllowedTypesCategory'
  const filesMinSize = '/api/collections/relation-fields?returning=filesMinSize'
  const filesMaxSize = '/api/collections/relation-fields?returning=filesMaxSize'

  const filesRepeater = '/api/collections/relation-fields?returning=filesRepeater'
  const filesRepeaterCasted = '/api/collections/relation-fields?returning=filesRepeaterCasted'
  const filesRepeaterMinMax = '/api/collections/relation-fields?returning=filesRepeaterMinMax'
  const filesRepeaterAllowedTypesMime = '/api/collections/relation-fields?returning=filesRepeaterAllowedTypesMime'
  const filesRepeaterAllowedTypesCategory =
    '/api/collections/relation-fields?returning=filesRepeaterAllowedTypesCategory'
  const filesRepeaterMinSize = '/api/collections/relation-fields?returning=filesRepeaterMinSize'
  const filesRepeaterMaxSize = '/api/collections/relation-fields?returning=filesRepeaterMaxSize'

  let txtFileId = 0
  let svgFileId = 0

  test('create uploads', async () => {
    const txtFile = new File([fs.readFileSync('packages/pruvious/.playground/test/files/test.txt')], 'test.txt')
    const svgFile = new File([fs.readFileSync('packages/pruvious/.playground/test/files/test.svg')], 'test.svg')
    const txtFileResult: any = await $postFormData('/api/uploads', { '': txtFile })
    const svgFileResult: any = await $postFormData('/api/uploads', { '': svgFile })

    expect(txtFileResult).toEqual([{ success: true, data: expect.any(Object), details: expect.any(Object) }])
    expect(svgFileResult).toEqual([{ success: true, data: expect.any(Object), details: expect.any(Object) }])

    txtFileId = txtFileResult[0].details.id
    svgFileId = svgFileResult[0].details.id
  })

  test('create, filter, update', async () => {
    // Junction
    expect(await $postAsAdmin(files, { files: undefined })).toEqual([{ files: [] }])
    expect(await $postAsAdmin(files, { files: [txtFileId] })).toEqual([{ files: [txtFileId] }])
    expect(
      await $getAsAdmin(`/api/collections/relation-fields?select=files&where=files[includes][${txtFileId}]`),
    ).toEqual($paginated([{ files: [txtFileId] }]))
    expect(
      await $getAsAdmin(
        `/api/collections/relation-fields?select=files&where=files[includes][${txtFileId},${svgFileId}]`,
      ),
    ).toEqual($paginated([]))
    expect(
      await $getAsAdmin(
        `/api/collections/relation-fields?select=files&where=files[includesAny][${txtFileId},${svgFileId}]`,
      ),
    ).toEqual($paginated([{ files: [txtFileId] }]))
    expect(
      await $patchAsAdmin(`/api/collections/relation-fields?returning=files&where=files[includes][${txtFileId}]`, {
        files: [svgFileId],
      }),
    ).toEqual([{ files: [svgFileId] }])

    // Matrix
    expect(await $postAsAdmin(filesRepeater, { filesRepeater: [{ files: undefined }] })).toEqual([
      { filesRepeater: [{ files: [] }] },
    ])
    expect(await $postAsAdmin(filesRepeater, { filesRepeater: [{ files: [txtFileId] }] })).toEqual([
      { filesRepeater: [{ files: [txtFileId] }] },
    ])
    expect(
      await $getAsAdmin(
        `/api/collections/relation-fields?select=filesRepeater&where=filesRepeater[like][%{"files":$[${txtFileId}$]}%]`,
      ),
    ).toEqual($paginated([{ filesRepeater: [{ files: [txtFileId] }] }]))
    expect(
      await $patchAsAdmin(
        `/api/collections/relation-fields?returning=filesRepeater&where=filesRepeater[like][%{"files":$[${txtFileId}$]}%]`,
        { filesRepeater: [{ files: [svgFileId] }] },
      ),
    ).toEqual([{ filesRepeater: [{ files: [svgFileId] }] }])
  })

  test('sanitizers', async () => {
    // Junction
    expect(await $postAsAdmin(files, { files: '[]' })).toEqual([{ files: [] }])
    expect(await $postAsAdmin(files, { files: [`${txtFileId}`] })).toEqual([{ files: [txtFileId] }])
    expect(await $postAsAdmin(files, { files: [`00${txtFileId}.00`] })).toEqual([{ files: [txtFileId] }])

    // Matrix
    expect(await $postAsAdmin(filesRepeater, { filesRepeater: '[{"files":"[]"}]' })).toEqual([
      { filesRepeater: [{ files: [] }] },
    ])
    expect(await $postAsAdmin(filesRepeater, { filesRepeater: [{ files: [`${txtFileId}`] }] })).toEqual([
      { filesRepeater: [{ files: [txtFileId] }] },
    ])
    expect(await $postAsAdmin(filesRepeater, { filesRepeater: [{ files: [`00${txtFileId}.00`] }] })).toEqual([
      { filesRepeater: [{ files: [txtFileId] }] },
    ])
  })

  test('validators (junction)', async () => {
    // wrong type
    expect(await $postAsAdmin(files, { files: 1 })).toEqual($422([{ files: expect.any(String) }]))
    expect(await $postAsAdmin(files, { files: true })).toEqual($422([{ files: expect.any(String) }]))
    expect(await $postAsAdmin(files, { files: {} })).toEqual($422([{ files: expect.any(String) }]))

    // non-existent files
    expect(await $postAsAdmin(files, { files: [9001] })).toEqual(
      $422([{ 'files': expect.any(String), 'files.0': expect.any(String) }]),
    )

    // min/max
    expect(await $postAsAdmin(filesMinMax, { filesMinMax: undefined })).toEqual([{ filesMinMax: [] }])
    expect(await $postAsAdmin(filesMinMax, { filesMinMax: [txtFileId] })).toEqual([{ filesMinMax: [txtFileId] }])
    expect(await $postAsAdmin(filesMinMax, { filesMinMax: [txtFileId, svgFileId] })).toEqual(
      $422([{ filesMinMax: expect.any(String) }]),
    )

    // deduplicate
    expect(await $postAsAdmin(files, { files: [txtFileId, svgFileId, svgFileId] })).toEqual([
      { files: [txtFileId, svgFileId] },
    ])

    // populate (default)
    expect(await $postAsAdmin(`${files}&populate=t`, { files: [txtFileId] })).toEqual([
      {
        files: [
          {
            id: txtFileId,
            path: expect.any(String),
            mime: 'text/plain',
            size: expect.any(Number),
            description: expect.any(String),
          },
        ],
      },
    ])

    // populate (with casted uploads fields)
    expect(await $postAsAdmin(`${filesCasted}&populate=t`, { filesCasted: [txtFileId] })).toEqual([
      {
        filesCasted: [
          {
            id: txtFileId,
            path: expect.any(String),
            author: 1,
            description: { en: expect.any(String), de: expect.any(String), bs: expect.any(String) },
            images: [],
            isLocked: false,
          },
        ],
      },
    ])

    // allowed types
    expect(await $postAsAdmin(filesAllowedTypesMime, { filesAllowedTypesMime: [txtFileId] })).toEqual([
      { filesAllowedTypesMime: [txtFileId] },
    ])
    expect(await $postAsAdmin(filesAllowedTypesMime, { filesAllowedTypesMime: [svgFileId] })).toEqual(
      $422([{ 'filesAllowedTypesMime': expect.any(String), 'filesAllowedTypesMime.0': expect.any(String) }]),
    )
    expect(await $postAsAdmin(filesAllowedTypesCategory, { filesAllowedTypesCategory: [txtFileId] })).toEqual(
      $422([{ 'filesAllowedTypesCategory': expect.any(String), 'filesAllowedTypesCategory.0': expect.any(String) }]),
    )
    expect(await $postAsAdmin(filesAllowedTypesCategory, { filesAllowedTypesCategory: [svgFileId] })).toEqual([
      { filesAllowedTypesCategory: [svgFileId] },
    ])

    // min size
    expect(await $postAsAdmin(filesMinSize, { filesMinSize: [svgFileId] })).toEqual([{ filesMinSize: [svgFileId] }])
    expect(await $postAsAdmin(filesMinSize, { filesMinSize: [txtFileId] })).toEqual(
      $422([{ 'filesMinSize': expect.any(String), 'filesMinSize.0': expect.any(String) }]),
    )

    // max size
    expect(await $postAsAdmin(filesMaxSize, { filesMaxSize: [txtFileId] })).toEqual([{ filesMaxSize: [txtFileId] }])
    expect(await $postAsAdmin(filesMaxSize, { filesMaxSize: [svgFileId] })).toEqual(
      $422([{ 'filesMaxSize': expect.any(String), 'filesMaxSize.0': expect.any(String) }]),
    )
  })

  test('validators (matrix)', async () => {
    // wrong type
    expect(await $postAsAdmin(filesRepeater, { filesRepeater: [{ files: 1 }] })).toEqual(
      $422([{ 'filesRepeater.0.files': expect.any(String) }]),
    )
    expect(await $postAsAdmin(filesRepeater, { filesRepeater: [{ files: true }] })).toEqual(
      $422([{ 'filesRepeater.0.files': expect.any(String) }]),
    )
    expect(await $postAsAdmin(filesRepeater, { filesRepeater: [{ files: {} }] })).toEqual(
      $422([{ 'filesRepeater.0.files': expect.any(String) }]),
    )

    // non-existent files
    expect(await $postAsAdmin(filesRepeater, { filesRepeater: [{ files: [9001] }] })).toEqual(
      $422([{ 'filesRepeater.0.files': expect.any(String), 'filesRepeater.0.files.0': expect.any(String) }]),
    )

    // min/max
    expect(await $postAsAdmin(filesRepeaterMinMax, { filesRepeaterMinMax: [{ files: undefined }] })).toEqual([
      { filesRepeaterMinMax: [{ files: [] }] },
    ])
    expect(await $postAsAdmin(filesRepeaterMinMax, { filesRepeaterMinMax: [{ files: [txtFileId] }] })).toEqual([
      { filesRepeaterMinMax: [{ files: [txtFileId] }] },
    ])
    expect(
      await $postAsAdmin(filesRepeaterMinMax, { filesRepeaterMinMax: [{ files: [txtFileId, svgFileId] }] }),
    ).toEqual($422([{ 'filesRepeaterMinMax.0.files': expect.any(String) }]))

    // deduplicate
    expect(
      await $postAsAdmin(filesRepeater, { filesRepeater: [{ files: [txtFileId, svgFileId, svgFileId] }] }),
    ).toEqual([{ filesRepeater: [{ files: [txtFileId, svgFileId] }] }])

    // populate (default)
    expect(
      await $postAsAdmin(`${filesRepeater}&populate=t`, {
        filesRepeater: [{ files: [txtFileId] }],
      }),
    ).toEqual([
      {
        filesRepeater: [
          {
            files: [
              {
                id: txtFileId,
                path: expect.any(String),
                mime: 'text/plain',
                size: expect.any(Number),
                description: expect.any(String),
              },
            ],
          },
        ],
      },
    ])

    // populate (with casted uploads fields)
    expect(
      await $postAsAdmin(`${filesRepeaterCasted}&populate=t`, {
        filesRepeaterCasted: [{ files: [txtFileId] }],
      }),
    ).toEqual([
      {
        filesRepeaterCasted: [
          {
            files: [
              {
                id: txtFileId,
                path: expect.any(String),
                author: 1,
                description: { en: expect.any(String), de: expect.any(String), bs: expect.any(String) },
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
      await $postAsAdmin(filesRepeaterAllowedTypesMime, { filesRepeaterAllowedTypesMime: [{ files: [txtFileId] }] }),
    ).toEqual([{ filesRepeaterAllowedTypesMime: [{ files: [txtFileId] }] }])
    expect(
      await $postAsAdmin(filesRepeaterAllowedTypesMime, { filesRepeaterAllowedTypesMime: [{ files: [svgFileId] }] }),
    ).toEqual(
      $422([
        {
          'filesRepeaterAllowedTypesMime.0.files': expect.any(String),
          'filesRepeaterAllowedTypesMime.0.files.0': expect.any(String),
        },
      ]),
    )
    expect(
      await $postAsAdmin(filesRepeaterAllowedTypesCategory, {
        filesRepeaterAllowedTypesCategory: [{ files: [txtFileId] }],
      }),
    ).toEqual(
      $422([
        {
          'filesRepeaterAllowedTypesCategory.0.files': expect.any(String),
          'filesRepeaterAllowedTypesCategory.0.files.0': expect.any(String),
        },
      ]),
    )
    expect(
      await $postAsAdmin(filesRepeaterAllowedTypesCategory, {
        filesRepeaterAllowedTypesCategory: [{ files: [svgFileId] }],
      }),
    ).toEqual([{ filesRepeaterAllowedTypesCategory: [{ files: [svgFileId] }] }])

    // min size
    expect(await $postAsAdmin(filesRepeaterMinSize, { filesRepeaterMinSize: [{ files: [svgFileId] }] })).toEqual([
      { filesRepeaterMinSize: [{ files: [svgFileId] }] },
    ])
    expect(await $postAsAdmin(filesRepeaterMinSize, { filesRepeaterMinSize: [{ files: [txtFileId] }] })).toEqual(
      $422([
        { 'filesRepeaterMinSize.0.files': expect.any(String), 'filesRepeaterMinSize.0.files.0': expect.any(String) },
      ]),
    )

    // max size
    expect(await $postAsAdmin(filesRepeaterMaxSize, { filesRepeaterMaxSize: [{ files: [txtFileId] }] })).toEqual([
      { filesRepeaterMaxSize: [{ files: [txtFileId] }] },
    ])
    expect(await $postAsAdmin(filesRepeaterMaxSize, { filesRepeaterMaxSize: [{ files: [svgFileId] }] })).toEqual(
      $422([
        { 'filesRepeaterMaxSize.0.files': expect.any(String), 'filesRepeaterMaxSize.0.files.0': expect.any(String) },
      ]),
    )
  })

  test('recovery', async () => {
    // Create junction
    const junction = (await $postAsAdmin(`${files},id`, { files: [txtFileId, svgFileId] })) as [
      { files: number[]; id: number },
    ]
    expect(junction).toEqual([{ files: [txtFileId, svgFileId], id: expect.any(Number) }])

    // Create matrix
    const matrix = (await $postAsAdmin(`${filesRepeater},id`, {
      filesRepeater: [{ files: [txtFileId, svgFileId] }],
    })) as [{ filesRepeater: { files: number[] }[]; id: number }]
    expect(matrix).toEqual([{ filesRepeater: [{ files: [txtFileId, svgFileId] }], id: expect.any(Number) }])

    // Delete txtFile
    expect(await $deleteAsAdmin(`/api/uploads/${txtFileId}`)).toEqual([
      { success: true, data: expect.any(Object), details: expect.any(Object) },
    ])

    // Check junction recovery
    expect(await $getAsAdmin(`/api/collections/relation-fields/${junction[0].id}?select=files`)).toEqual({
      files: [svgFileId],
    })
    expect(await $getAsAdmin(`/api/collections/relation-fields/${junction[0].id}?select=files&populate=1`)).toEqual({
      files: [
        {
          id: svgFileId,
          path: expect.any(String),
          mime: 'image/svg+xml',
          size: expect.any(Number),
          description: expect.any(String),
        },
      ],
    })

    // Check matrix recovery
    expect(await $getAsAdmin(`/api/collections/relation-fields/${matrix[0].id}?select=filesRepeater`)).toEqual({
      filesRepeater: [{ files: [txtFileId, svgFileId] }],
    })
    expect(
      await $getAsAdmin(`/api/collections/relation-fields/${matrix[0].id}?select=filesRepeater&populate=1`),
    ).toEqual({
      filesRepeater: [
        {
          files: [
            {
              id: svgFileId,
              path: expect.any(String),
              mime: 'image/svg+xml',
              size: expect.any(Number),
              description: expect.any(String),
            },
          ],
        },
      ],
    })
  })
})
