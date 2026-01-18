import fs from 'node:fs'
import { describe, expect, test } from 'vitest'
import { $422, $deleteAsAdmin, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin, $postFormData } from '../utils'

describe('image field', () => {
  const image = '/api/collections/relation-fields?returning=image'
  const imageCasted = '/api/collections/relation-fields?returning=imageCasted'
  const imageAllowedTypesMime = '/api/collections/relation-fields?returning=imageAllowedTypesMime'
  const imageMinSize = '/api/collections/relation-fields?returning=imageMinSize'
  const imageMaxSize = '/api/collections/relation-fields?returning=imageMaxSize'
  const imageMinWidth = '/api/collections/relation-fields?returning=imageMinWidth'
  const imageMaxWidth = '/api/collections/relation-fields?returning=imageMaxWidth'
  const imageMinHeight = '/api/collections/relation-fields?returning=imageMinHeight'
  const imageMaxHeight = '/api/collections/relation-fields?returning=imageMaxHeight'
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
    expect(await $postAsAdmin(image, { image: undefined })).toEqual([{ image: null }])
    expect(await $postAsAdmin(image, { image: pngId })).toEqual([{ image: pngId }])
    expect(await $getAsAdmin(`/api/collections/relation-fields?select=image&where=image[=][${pngId}]`)).toEqual(
      $paginated([{ image: pngId }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/relation-fields?returning=image&where=image[=][${pngId}]`, {
        image: svgId,
      }),
    ).toEqual([{ image: svgId }])
  })

  test('sanitizers', async () => {
    expect(await $postAsAdmin(image, { image: pngId.toString() })).toEqual([{ image: pngId }])
    expect(await $postAsAdmin(image, { image: `00${pngId}.00` })).toEqual([{ image: pngId }])
  })

  test('validators', async () => {
    // wrong type
    expect(await $postAsAdmin(image, { image: true })).toEqual($422([{ image: expect.any(String) }]))
    expect(await $postAsAdmin(image, { image: [] })).toEqual($422([{ image: expect.any(String) }]))
    expect(await $postAsAdmin(image, { image: {} })).toEqual($422([{ image: expect.any(String) }]))

    // non-existent image
    expect(await $postAsAdmin(image, { image: 9001 })).toEqual($422([{ image: expect.any(String) }]))

    // populate (default)
    expect(await $postAsAdmin(`${image}&populate=t`, { image: pngId })).toEqual([
      {
        image: {
          id: pngId,
          path: expect.any(String),
          mime: 'image/png',
          size: expect.any(Number),
          description: expect.any(String),
          imageWidth: 340,
          imageHeight: 80,
        },
      },
    ])

    // populate (with casted uploads fields)
    expect(await $postAsAdmin(`${imageCasted}&populate=t`, { imageCasted: pngId })).toEqual([
      {
        imageCasted: {
          id: pngId,
          path: expect.any(String),
          author: 1,
          description: { en: expect.any(String), de: expect.any(String), bs: expect.any(String) },
          images: [],
          isLocked: false,
        },
      },
    ])

    // allowed types
    expect(await $postAsAdmin(imageAllowedTypesMime, { imageAllowedTypesMime: pngId })).toEqual([
      { imageAllowedTypesMime: pngId },
    ])
    expect(await $postAsAdmin(imageAllowedTypesMime, { imageAllowedTypesMime: svgId })).toEqual(
      $422([{ imageAllowedTypesMime: expect.any(String) }]),
    )
    expect(await $postAsAdmin(imageAllowedTypesMime, { imageAllowedTypesMime: txtId })).toEqual(
      $422([{ imageAllowedTypesMime: expect.any(String) }]),
    )
    expect(await $postAsAdmin(image, { image: txtId })).toEqual($422([{ image: expect.any(String) }]))

    // min size
    expect(await $postAsAdmin(imageMinSize, { imageMinSize: svgId })).toEqual([{ imageMinSize: svgId }])
    expect(await $postAsAdmin(imageMinSize, { imageMinSize: pngId })).toEqual(
      $422([{ imageMinSize: expect.any(String) }]),
    )

    // max size
    expect(await $postAsAdmin(imageMaxSize, { imageMaxSize: pngId })).toEqual([{ imageMaxSize: pngId }])
    expect(await $postAsAdmin(imageMaxSize, { imageMaxSize: svgId })).toEqual(
      $422([{ imageMaxSize: expect.any(String) }]),
    )

    // min width
    expect(await $postAsAdmin(imageMinWidth, { imageMinWidth: pngId })).toEqual([{ imageMinWidth: pngId }])
    expect(await $postAsAdmin(imageMinWidth, { imageMinWidth: svgId })).toEqual([{ imageMinWidth: svgId }])
    expect(await $postAsAdmin(imageMinWidth, { imageMinWidth: svgRotatedId })).toEqual(
      $422([{ imageMinWidth: expect.any(String) }]),
    )

    // max width
    expect(await $postAsAdmin(imageMaxWidth, { imageMaxWidth: svgRotatedId })).toEqual([
      { imageMaxWidth: svgRotatedId },
    ])
    expect(await $postAsAdmin(imageMaxWidth, { imageMaxWidth: svgId })).toEqual(
      $422([{ imageMaxWidth: expect.any(String) }]),
    )
    expect(await $postAsAdmin(imageMaxWidth, { imageMaxWidth: pngId })).toEqual(
      $422([{ imageMaxWidth: expect.any(String) }]),
    )

    // min height
    expect(await $postAsAdmin(imageMinHeight, { imageMinHeight: svgRotatedId })).toEqual([
      { imageMinHeight: svgRotatedId },
    ])
    expect(await $postAsAdmin(imageMinHeight, { imageMinHeight: svgId })).toEqual(
      $422([{ imageMinHeight: expect.any(String) }]),
    )
    expect(await $postAsAdmin(imageMinHeight, { imageMinHeight: pngId })).toEqual(
      $422([{ imageMinHeight: expect.any(String) }]),
    )

    // max height
    expect(await $postAsAdmin(imageMaxHeight, { imageMaxHeight: pngId })).toEqual([{ imageMaxHeight: pngId }])
    expect(await $postAsAdmin(imageMaxHeight, { imageMaxHeight: svgId })).toEqual([{ imageMaxHeight: svgId }])
    expect(await $postAsAdmin(imageMaxHeight, { imageMaxHeight: svgRotatedId })).toEqual(
      $422([{ imageMaxHeight: expect.any(String) }]),
    )
  })

  test('recovery', async () => {
    const result = (await $postAsAdmin(`${image},id`, { image: pngId })) as [{ image: number; id: number }]
    expect(result).toEqual([{ image: pngId, id: expect.any(Number) }])
    expect(await $deleteAsAdmin(`/api/uploads/${pngId}`)).toEqual([
      { success: true, data: expect.any(Object), details: expect.any(Object) },
    ])
    expect(await $getAsAdmin(`/api/collections/relation-fields/${result[0].id}?select=image`)).toEqual({ image: null })
    expect(await $getAsAdmin(`/api/collections/relation-fields/${result[0].id}?select=image&populate=1`)).toEqual({
      image: null,
    })
  })
})
