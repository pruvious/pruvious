import { $fetch } from '@nuxt/test-utils'
import fs from 'fs-extra'
import { $fetch as $ofetch } from 'ofetch'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

describe('image field', () => {
  let imageId = 0

  it('creates temp image', async () => {
    const testImage = fs.readFileSync(resolve(process.cwd(), 'test/fixtures/basic/test.jpg'))
    const body = new FormData()
    body.append('$file', new File([testImage], 'image-field.jpg', { type: 'image/jpeg' }))
    body.append('directory', 'image-test')
    body.append('description', 'foo')
    const response = await $fetch('/api/collections/uploads?select=id,size,description', {
      method: 'post',
      body,
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ id: expect.any(Number), size: testImage.byteLength, description: 'foo' })
    imageId = response.id
  })

  it('creates record', async () => {
    const response = await $fetch('/api/fields/create-image-fields', {
      method: 'post',
      body: { required: imageId, png: null },
    })

    expect(response.record).toEqual({
      id: expect.any(Number),
      language: expect.any(String),
      translations: expect.any(String),
      regular: null,
      required: { uploadId: imageId, alt: '' },
      png: null,
      minW9001: null,
      optimized: null,
    })
  })

  it('accepts only images', async () => {
    const body = new FormData()
    body.append('$file', new File(['test'], 'test.txt', { type: 'text/plain' }))
    const response1 = await $fetch('/api/collections/uploads?select=id', {
      method: 'post',
      body,
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({ id: expect.any(Number) })

    const response = await $fetch('/api/fields/create-image-fields', {
      method: 'post',
      body: { required: response1.id },
    })

    expect(response.success).toBe(false)
    expect(response.errors).toEqual({
      required:
        'The image type must be one of the following: image/apng, image/avif, image/bmp, image/gif, image/heic, image/jpeg, image/png, image/svg+xml, image/tiff, image/webp, image/x-icon',
    })
  })

  it('does not accept negative id', async () => {
    const response1 = await $fetch('/api/fields/create-image-fields', { method: 'post', body: { required: -1 } })
    expect(response1.success).toBe(false)
    expect(response1.errors).toEqual({ required: 'Invalid input type' })

    const response2 = await $fetch('/api/fields/create-image-fields', {
      method: 'post',
      body: { required: { uploadId: -1, alt: '' } },
    })
    expect(response2.success).toBe(false)
    expect(response2.errors).toEqual({ required: 'Invalid input type' })
  })

  it('does not accept nonexistent id', async () => {
    const response = await $fetch('/api/fields/create-image-fields', { method: 'post', body: { required: 9001 } })
    expect(response.success).toBe(false)
    expect(response.errors).toEqual({ required: 'The upload does not exist' })
  })

  it('does not accept invalid object', async () => {
    const response = await $fetch('/api/fields/create-image-fields', {
      method: 'post',
      body: { required: { uploadId: imageId } },
    })
    expect(response.success).toBe(false)
    expect(response.errors).toEqual({ required: 'Invalid input type' })
  })

  it('does not accept other values', async () => {
    const response = await $fetch('/api/fields/create-image-fields', { method: 'post', body: { required: true } })
    expect(response.success).toBe(false)
    expect(response.errors).toEqual({ required: 'Invalid input type' })
  })

  it('fails required validation with undefined', async () => {
    const response = await $fetch('/api/fields/create-image-fields', { method: 'post' })
    expect(response.success).toBe(false)
    expect(response.errors).toEqual({ required: 'This field is required' })
  })

  it('fails required validation with null', async () => {
    const response = await $fetch('/api/fields/create-image-fields', { method: 'post', body: { required: null } })
    expect(response.success).toBe(false)
    expect(response.errors).toEqual({ required: 'This field is required' })
  })

  it('fails allowedTypes validation', async () => {
    const response = await $fetch('/api/fields/create-image-fields', { method: 'post', body: { png: imageId } })
    expect(response.success).toBe(false)
    expect(response.errors.png).toBe('The image type must be one of the following: png')
  })

  it('fails minWidth validation', async () => {
    const response = await $fetch('/api/fields/create-image-fields', { method: 'post', body: { minW9001: imageId } })
    expect(response.success).toBe(false)
    expect(response.errors.minW9001).toBe('The minimum allowed image width is 9001 pixels')
  })

  it('creates optimized image sources', async () => {
    const response1 = await $fetch('/api/fields/create-image-fields', {
      method: 'post',
      body: { required: imageId, optimized: { uploadId: imageId, alt: 'bar' } },
    })

    expect(response1.record).toEqual({
      id: expect.any(Number),
      language: expect.any(String),
      translations: expect.any(String),
      regular: null,
      required: { uploadId: imageId, alt: '' },
      png: null,
      minW9001: null,
      optimized: { uploadId: imageId, alt: 'bar' },
    })

    const response2 = await $fetch(
      `/api/collections/image-fields/${response1.record.id}?select=required,optimized&populate=T`,
      {
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    expect(response2).toEqual({
      required: {
        src:
          process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3'
            ? new URL(
                'image-test/image-field.jpg',
                process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL!.replace(/\/*$/, '/'),
              ).href
            : '/uploads/image-test/image-field.jpg',
        alt: 'foo',
        width: 6240,
        height: 4160,
        type: 'image/jpeg',
        sources: [],
      },
      optimized: {
        src:
          process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3'
            ? new URL(
                'image-test/image-field.jpg',
                process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL!.replace(/\/*$/, '/'),
              ).href
            : '/uploads/image-test/image-field.jpg',
        alt: 'bar',
        width: 6240,
        height: 4160,
        type: 'image/jpeg',
        sources: [
          { srcset: expect.any(String), width: 1024, height: 1024, type: 'image/webp', media: '(max-width: 768px)' },
          { srcset: expect.any(String), width: 1024, height: 1024, type: 'image/jpeg', media: '(max-width: 768px)' },
          { srcset: expect.any(String), width: 1600, height: 1600, type: 'image/webp', media: null },
          { srcset: expect.any(String), width: 1600, height: 1600, type: 'image/jpeg', media: null },
        ],
      },
    })

    if (process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3') {
      expect(
        await $ofetch(response2.optimized.sources[0].srcset.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
          ignoreResponseError: true,
        }),
      ).toHaveProperty('type', 'image/webp')

      expect(
        await $ofetch(response2.optimized.sources[1].srcset.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
          ignoreResponseError: true,
        }),
      ).toHaveProperty('type', 'image/jpeg')

      expect(
        await $ofetch(response2.optimized.sources[2].srcset.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
          ignoreResponseError: true,
        }),
      ).toHaveProperty('type', 'image/webp')

      expect(
        await $ofetch(response2.optimized.sources[3].srcset.replace('/uploads', ''), {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
        }),
      ).toHaveProperty('type', 'image/jpeg')
    } else {
      expect(
        fs.existsSync(
          resolve(
            process.cwd(),
            'test/fixtures/basic/.uploads',
            response2.optimized.sources[0].srcset.replace('/uploads/', ''),
          ),
        ),
      ).toBe(true)

      expect(
        fs.existsSync(
          resolve(
            process.cwd(),
            'test/fixtures/basic/.uploads',
            response2.optimized.sources[1].srcset.replace('/uploads/', ''),
          ),
        ),
      ).toBe(true)

      expect(
        fs.existsSync(
          resolve(
            process.cwd(),
            'test/fixtures/basic/.uploads',
            response2.optimized.sources[2].srcset.replace('/uploads/', ''),
          ),
        ),
      ).toBe(true)

      expect(
        fs.existsSync(
          resolve(
            process.cwd(),
            'test/fixtures/basic/.uploads',
            response2.optimized.sources[3].srcset.replace('/uploads/', ''),
          ),
        ),
      ).toBe(true)
    }
  })

  it('does not create sources for svg images', async () => {
    const body = new FormData()
    body.append(
      '$file',
      new File(
        [
          '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="100%" height="100%" fill="#e0e0e0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" fill="#333">Pruvious</text></svg>',
        ],
        'test.svg',
        { type: 'image/svg+xml' },
      ),
    )
    const response1 = await $fetch('/api/collections/uploads?select=id', {
      method: 'post',
      body,
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response1).toEqual({ id: expect.any(Number) })

    const response2 = await $fetch('/api/fields/create-image-fields', {
      method: 'post',
      body: { required: response1.id, optimized: response1.id },
    })

    expect(response2.record).toEqual({
      id: expect.any(Number),
      language: expect.any(String),
      translations: expect.any(String),
      regular: null,
      required: { uploadId: response1.id, alt: '' },
      png: null,
      minW9001: null,
      optimized: { uploadId: response1.id, alt: '' },
    })

    const response3 = await $fetch(`/api/collections/image-fields/${response2.record.id}?select=optimized&populate=T`, {
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response3).toEqual({
      optimized: {
        src:
          process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3'
            ? new URL('test.svg', process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL!.replace(/\/*$/, '/')).href
            : '/uploads/test.svg',
        alt: '',
        width: 200,
        height: 200,
        type: 'image/svg+xml',
        sources: [],
      },
    })
  })

  it('fallbacks to default value', async () => {
    const response1 = await $fetch('/api/fields/create-invalid-image-fields', { method: 'post' })
    const response2 = await $fetch(
      `/api/collections/image-fields/${response1.id}?select=regular,required,png,minW9001,optimized`,
      { headers: { Authorization: `Bearer ${process.env.TOKEN}` } },
    )

    expect(response2).toEqual({
      regular: null,
      required: null,
      png: null,
      minW9001: null,
      optimized: null,
    })
  })

  it('deletes temp image', async () => {
    const response = await $fetch(`/api/collections/uploads/${imageId}`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response.id).toBe(imageId)
  })
})
