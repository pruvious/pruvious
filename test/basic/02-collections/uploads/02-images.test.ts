import { $fetch } from '@nuxt/test-utils'
import fs from 'fs-extra'
import { $fetch as $ofetch } from 'ofetch'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

describe('optimized images', async () => {
  const originalWidth = 6240
  const originalHeight = 4160

  let optimizedJpeg = ''
  let optimizedWebp = ''
  let optimizedPng = ''

  let optimizedJpegUpdated = ''
  let optimizedWebpUpdated = ''
  let optimizedPngUpdated = ''

  it('uploads a test image', async () => {
    const testImage = fs.readFileSync(resolve(process.cwd(), 'test/fixtures/basic/test.jpg'))
    const body = new FormData()
    body.append('$file', new File([testImage], 'test.jpg', { type: 'image/jpeg' }))
    const response = await $fetch('/api/collections/uploads?select=id,size,width,height', {
      method: 'post',
      body,
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      id: expect.any(Number),
      size: testImage.byteLength,
      width: originalWidth,
      height: originalHeight,
    })
  })

  it('optimizes jpeg with default options', async () => {
    const response = await $fetch('/api/optimize-image?format=jpeg', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      result: { success: true, src: expect.any(String) },
      format: 'jpeg',
      width: originalWidth,
      height: originalHeight,
    })
    expect(response.result.src).toMatch(/\.jpg$/)
    optimizedJpeg = response.result.src
  })

  it('optimizes jpeg with custom options', async () => {
    const response = await $fetch(
      '/api/optimize-image?format=jpeg&width=100&height=100&resize=cover&position=center&quality=50',
      {
        method: 'post',
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    expect(response).toEqual({
      result: { success: true, src: expect.any(String) },
      format: 'jpeg',
      width: 100,
      height: 100,
    })
    expect(response.result.src).toMatch(/\.jpg$/)
  })

  it('optimizes webp with default options', async () => {
    const response = await $fetch('/api/optimize-image?format=webp', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      result: { success: true, src: expect.any(String) },
      format: 'webp',
      width: originalWidth,
      height: originalHeight,
    })
    expect(response.result.src).toMatch(/\.webp$/)
    optimizedWebp = response.result.src
  })

  it('optimizes webp with custom options', async () => {
    const response = await $fetch(
      '/api/optimize-image?format=webp&width=100&height=100&resize=cover&position=center&quality=50',
      {
        method: 'post',
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    expect(response).toEqual({
      result: { success: true, src: expect.any(String) },
      format: 'webp',
      width: 100,
      height: 100,
    })
    expect(response.result.src).toMatch(/\.webp$/)
  })

  it('optimizes png with default options', async () => {
    const response = await $fetch('/api/optimize-image?format=png', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      result: { success: true, src: expect.any(String) },
      format: 'png',
      width: originalWidth,
      height: originalHeight,
    })
    expect(response.result.src).toMatch(/\.png$/)
    optimizedPng = response.result.src
  })

  it('optimizes png with custom options', async () => {
    const response = await $fetch(
      '/api/optimize-image?format=png&width=100&height=100&resize=cover&position=center&quality=50',
      {
        method: 'post',
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    expect(response).toEqual({
      result: { success: true, src: expect.any(String) },
      format: 'png',
      width: 100,
      height: 100,
    })
    expect(response.result.src).toMatch(/\.png$/)
  })

  it('updates an image', async () => {
    if (process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3') {
      expect(
        await $ofetch(optimizedJpeg.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
        }),
      ).toHaveProperty('type', 'image/jpeg')

      expect(
        await $ofetch(optimizedWebp.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
        }),
      ).toHaveProperty('type', 'image/webp')

      expect(
        await $ofetch(optimizedPng.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
        }),
      ).toHaveProperty('type', 'image/png')
    } else {
      expect(
        fs.existsSync(resolve(process.cwd(), 'test/fixtures/basic/.uploads', optimizedJpeg.replace('/uploads/', ''))),
      ).toBe(true)

      expect(
        fs.existsSync(resolve(process.cwd(), 'test/fixtures/basic/.uploads', optimizedWebp.replace('/uploads/', ''))),
      ).toBe(true)

      expect(
        fs.existsSync(resolve(process.cwd(), 'test/fixtures/basic/.uploads', optimizedPng.replace('/uploads/', ''))),
      ).toBe(true)
    }

    const response = await $fetch('/api/collections/uploads/?select=directory,filename&where=filename[=][test.jpg]', {
      method: 'patch',
      body: { directory: 'foo', filename: 'test-updated.jpg' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual([{ directory: 'foo/', filename: 'test-updated.jpg' }])

    const responseJpeg = await $fetch('/api/optimize-image?format=jpeg', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const responseWebp = await $fetch('/api/optimize-image?format=webp', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    const responsePng = await $fetch('/api/optimize-image?format=png', {
      method: 'post',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(responseJpeg.result.src).toMatch(/\.jpg$/)
    expect(responseWebp.result.src).toMatch(/\.webp$/)
    expect(responsePng.result.src).toMatch(/\.png$/)

    optimizedJpegUpdated = responseJpeg.result.src
    optimizedWebpUpdated = responseWebp.result.src
    optimizedPngUpdated = responsePng.result.src

    if (process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3') {
      expect(
        await $ofetch(optimizedJpeg.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
          ignoreResponseError: true,
        }),
      ).not.toBeTypeOf('object')

      expect(
        await $ofetch(optimizedWebp.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
          ignoreResponseError: true,
        }),
      ).not.toBeTypeOf('object')

      expect(
        await $ofetch(optimizedPng.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
          ignoreResponseError: true,
        }),
      ).not.toBeTypeOf('object')

      expect(
        await $ofetch(optimizedJpegUpdated.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
        }),
      ).toHaveProperty('type', 'image/jpeg')

      expect(
        await $ofetch(optimizedWebpUpdated.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
        }),
      ).toHaveProperty('type', 'image/webp')

      expect(
        await $ofetch(optimizedPngUpdated.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
        }),
      ).toHaveProperty('type', 'image/png')
    } else {
      expect(
        fs.existsSync(resolve(process.cwd(), 'test/fixtures/basic/.uploads', optimizedJpeg.replace('/uploads/', ''))),
      ).toBe(false)

      expect(
        fs.existsSync(resolve(process.cwd(), 'test/fixtures/basic/.uploads', optimizedWebp.replace('/uploads/', ''))),
      ).toBe(false)

      expect(
        fs.existsSync(resolve(process.cwd(), 'test/fixtures/basic/.uploads', optimizedPng.replace('/uploads/', ''))),
      ).toBe(false)

      expect(
        fs.existsSync(
          resolve(process.cwd(), 'test/fixtures/basic/.uploads', optimizedJpegUpdated.replace('/uploads/', '')),
        ),
      ).toBe(true)

      expect(
        fs.existsSync(
          resolve(process.cwd(), 'test/fixtures/basic/.uploads', optimizedWebpUpdated.replace('/uploads/', '')),
        ),
      ).toBe(true)

      expect(
        fs.existsSync(
          resolve(process.cwd(), 'test/fixtures/basic/.uploads', optimizedPngUpdated.replace('/uploads/', '')),
        ),
      ).toBe(true)
    }
  })

  it('deletes optimized images', async () => {
    const response = await $fetch('/api/collections/uploads?where=filename[=][test-updated.jpg]', {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toHaveLength(1)

    if (process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3') {
      expect(
        await $ofetch(optimizedJpegUpdated.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
          ignoreResponseError: true,
        }),
      ).not.toBeTypeOf('object')

      expect(
        await $ofetch(optimizedWebpUpdated.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
          ignoreResponseError: true,
        }),
      ).not.toBeTypeOf('object')

      expect(
        await $ofetch(optimizedPngUpdated.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
          ignoreResponseError: true,
        }),
      ).not.toBeTypeOf('object')
    } else {
      expect(
        fs.existsSync(
          resolve(process.cwd(), 'test/fixtures/basic/.uploads', optimizedJpegUpdated.replace('/uploads/', '')),
        ),
      ).toBe(false)

      expect(
        fs.existsSync(
          resolve(process.cwd(), 'test/fixtures/basic/.uploads', optimizedWebpUpdated.replace('/uploads/', '')),
        ),
      ).toBe(false)

      expect(
        fs.existsSync(
          resolve(process.cwd(), 'test/fixtures/basic/.uploads', optimizedPngUpdated.replace('/uploads/', '')),
        ),
      ).toBe(false)
    }
  })
})
