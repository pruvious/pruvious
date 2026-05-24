import fs from 'node:fs'
import { describe, expect, test } from 'vitest'
import { $422, $deleteAsAdmin, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin, $postFormData } from '../utils'

describe('file field', () => {
  const file = '/api/collections/relation-fields?returning=file'
  const fileCasted = '/api/collections/relation-fields?returning=fileCasted'
  const fileAllowedTypesMime = '/api/collections/relation-fields?returning=fileAllowedTypesMime'
  const fileAllowedTypesCategory = '/api/collections/relation-fields?returning=fileAllowedTypesCategory'
  const fileMinSize = '/api/collections/relation-fields?returning=fileMinSize'
  const fileMaxSize = '/api/collections/relation-fields?returning=fileMaxSize'
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
    expect(await $postAsAdmin(file, { file: undefined })).toEqual([{ file: null }])
    expect(await $postAsAdmin(file, { file: txtFileId })).toEqual([{ file: txtFileId }])
    expect(await $getAsAdmin(`/api/collections/relation-fields?select=file&where=file[=][${txtFileId}]`)).toEqual(
      $paginated([{ file: txtFileId }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/relation-fields?returning=file&where=file[=][${txtFileId}]`, {
        file: svgFileId,
      }),
    ).toEqual([{ file: svgFileId }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(file, { file: txtFileId.toString() })).toEqual([{ file: txtFileId }])
    expect(await $postAsAdmin(file, { file: `00${txtFileId}.00` })).toEqual([{ file: txtFileId }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(file, { file: true })).toEqual($422([{ file: expect.any(String) }]))
    expect(await $postAsAdmin(file, { file: [] })).toEqual($422([{ file: expect.any(String) }]))
    expect(await $postAsAdmin(file, { file: {} })).toEqual($422([{ file: expect.any(String) }]))

    // non-existent file
    expect(await $postAsAdmin(file, { file: 9001 })).toEqual($422([{ file: expect.any(String) }]))

    // populate (default)
    expect(await $postAsAdmin(`${file}&populate=t`, { file: txtFileId })).toEqual([
      {
        file: {
          id: txtFileId,
          path: expect.any(String),
          mime: 'text/plain',
          size: expect.any(Number),
          description: expect.any(String),
        },
      },
    ])

    // populate (with casted uploads fields)
    expect(await $postAsAdmin(`${fileCasted}&populate=t`, { fileCasted: txtFileId })).toEqual([
      {
        fileCasted: {
          id: txtFileId,
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
      },
    ])

    // allowed types
    expect(await $postAsAdmin(fileAllowedTypesMime, { fileAllowedTypesMime: txtFileId })).toEqual([
      { fileAllowedTypesMime: txtFileId },
    ])
    expect(await $postAsAdmin(fileAllowedTypesMime, { fileAllowedTypesMime: svgFileId })).toEqual(
      $422([{ fileAllowedTypesMime: expect.any(String) }]),
    )
    expect(await $postAsAdmin(fileAllowedTypesCategory, { fileAllowedTypesCategory: txtFileId })).toEqual(
      $422([{ fileAllowedTypesCategory: expect.any(String) }]),
    )
    expect(await $postAsAdmin(fileAllowedTypesCategory, { fileAllowedTypesCategory: svgFileId })).toEqual([
      { fileAllowedTypesCategory: svgFileId },
    ])

    // min size
    expect(await $postAsAdmin(fileMinSize, { fileMinSize: svgFileId })).toEqual([{ fileMinSize: svgFileId }])
    expect(await $postAsAdmin(fileMinSize, { fileMinSize: txtFileId })).toEqual(
      $422([{ fileMinSize: expect.any(String) }]),
    )

    // max size
    expect(await $postAsAdmin(fileMaxSize, { fileMaxSize: txtFileId })).toEqual([{ fileMaxSize: txtFileId }])
    expect(await $postAsAdmin(fileMaxSize, { fileMaxSize: svgFileId })).toEqual(
      $422([{ fileMaxSize: expect.any(String) }]),
    )
  })

  test('recovery', async () => {
    const result = (await $postAsAdmin(`${file},id`, { file: txtFileId })) as [{ file: number; id: number }]
    expect(result).toEqual([{ file: txtFileId, id: expect.any(Number) }])
    expect(await $deleteAsAdmin(`/api/uploads/${txtFileId}`)).toEqual([
      { success: true, data: expect.any(Object), details: expect.any(Object) },
    ])
    expect(await $getAsAdmin(`/api/collections/relation-fields/${result[0].id}?select=file`)).toEqual({ file: null })
    expect(await $getAsAdmin(`/api/collections/relation-fields/${result[0].id}?select=file&populate=1`)).toEqual({
      file: null,
    })
  })
})
