import { describe, expect, test } from 'vitest'
import { $400, $get, $getAsAdmin, $postAsAdmin, $postFormData, $putFormData } from '../utils'

describe('multipart uploads', () => {
  const contents = new Uint8Array(20 * 1024 * 1024).fill('a'.charCodeAt(0))
  let key = ''

  test('creates multipart upload', async () => {
    const result: any = await $postAsAdmin('/api/uploads/multipart', { path: 'multipart.txt', author: 2, editors: [3] })
    expect(result).toEqual({ success: true, key: expect.any(String), path: '/multipart.txt' })
    key = result.key
  })

  test('uploads part 1', async () => {
    const result: any = await $putFormData(`/api/uploads/multipart/${key}?partNumber=1`, {
      file: new File([contents.subarray(0, 8 * 1024 * 1024)], 'part'),
      partNumber: 1,
    })
    expect(result).toEqual({ success: true, part: { partNumber: 1, etag: expect.any(String) } })
  })

  test('uploads part 2', async () => {
    const result: any = await $putFormData(`/api/uploads/multipart/${key}?partNumber=2`, {
      file: new File([contents.subarray(8 * 1024 * 1024, 16 * 1024 * 1024)], 'part'),
      partNumber: 2,
    })
    expect(result).toEqual({ success: true, part: { partNumber: 2, etag: expect.any(String) } })
  })

  test('get parts', async () => {
    const result: any = await $getAsAdmin(`/api/uploads/multipart/${key}`)
    expect(result).toEqual({
      success: true,
      key,
      path: '/multipart.txt',
      parts: [
        { partNumber: 1, etag: expect.any(String) },
        { partNumber: 2, etag: expect.any(String) },
      ],
    })
  })

  test('uploads part 3', async () => {
    const result: any = await $putFormData(`/api/uploads/multipart/${key}?partNumber=3`, {
      file: new File([contents.subarray(16 * 1024 * 1024)], 'part'),
      partNumber: 3,
    })
    expect(result).toEqual({ success: true, part: { partNumber: 3, etag: expect.any(String) } })
  })

  test('uploads part 3 again', async () => {
    const result: any = await $putFormData(`/api/uploads/multipart/${key}?partNumber=3`, {
      file: new File([contents.subarray(16 * 1024 * 1024)], 'part'),
      partNumber: 3,
    })
    expect(result).toEqual($400('The file part has already been uploaded'))
  })

  test('complete upload', async () => {
    const result: any = await $postFormData(`/api/uploads/multipart/${key}?returning=size,author,editors`)
    expect(result).toEqual({ success: true, data: { size: 20 * 1024 * 1024, author: 2, editors: [3] } })
    expect(await $get('/uploads/multipart.txt').then((v) => String(v).slice(0, 3))).toBe('aaa')
  })
})
