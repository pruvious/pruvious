import { $fetch } from '@nuxt/test-utils'
import fs from 'fs-extra'
import { $fetch as $ofetch } from 'ofetch'
import { describe, expect, it } from 'vitest'

describe('collection: uploads', async () => {
  it('creates an upload in the root directory', async () => {
    const body = new FormData()
    body.append('$file', new File(['test'], 'test.txt', { type: 'text/plain' }))
    body.append('size', '9001')
    body.append('width', '9001')
    body.append('height', '9001')
    body.append('language', 'en')
    const response = await $fetch('/api/collections/uploads', {
      method: 'post',
      body,
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({
      id: expect.any(Number),
      language: '',
      translations: expect.any(String),
      filename: 'test.txt',
      directory: '',
      type: 'text/plain',
      size: 4,
      width: 0,
      height: 0,
      description: '',
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    })

    if (process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3') {
      expect(await $ofetch('/test.txt', { baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL })).toBe('test')
    } else {
      expect(fs.readFileSync('test/fixtures/basic/public/uploads/test.txt', 'utf-8')).toBe('test')
    }
  })

  it('creates an upload in a nested directory', async () => {
    const body = new FormData()
    body.append('$file', new File(['test'], 'test.txt', { type: 'text/plain' }))
    body.append('directory', '/foo/bar/')
    body.append('filename', 'baz.txt')
    body.append('size', 'foo')
    body.append('type', 'foo')
    body.append('description', 'foo')
    const response = await $fetch(
      '/api/collections/uploads?select=filename,directory,size,width,height,type,description',
      {
        method: 'post',
        body,
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    expect(response).toEqual({
      filename: 'baz.txt',
      directory: 'foo/bar/',
      type: 'text/plain',
      size: 4,
      width: 0,
      height: 0,
      description: 'foo',
    })

    if (process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3') {
      expect(await $ofetch('/foo/bar/baz.txt', { baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL })).toBe(
        'test',
      )
    } else {
      expect(fs.readFileSync('test/fixtures/basic/public/uploads/foo/bar/baz.txt', 'utf-8')).toBe('test')
    }
  })

  it('validates input data when creating', async () => {
    const response = await $fetch('/api/collections/uploads', {
      method: 'post',
      body: { directory: 'foo bar', filename: '?' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      $file: 'This field is required',
      directory: 'The directory must be a URL-safe string',
      filename: 'The filename must be a URL-safe string',
    })
  })

  it('validates filenames ending with a period', async () => {
    const response = await $fetch('/api/collections/uploads', {
      method: 'post',
      body: { filename: 'foo.' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      $file: 'This field is required',
      filename: 'The filename must not end with a period',
    })
  })

  it('requires filename when updating directory', async () => {
    const response = await $fetch('/api/collections/uploads/1', {
      method: 'patch',
      body: { directory: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      filename: 'This field is required',
    })
  })

  it('requires directory when updating filename', async () => {
    const response = await $fetch('/api/collections/uploads/1', {
      method: 'patch',
      body: { filename: 'foo' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      directory: 'This field is required',
      filename: 'The file extension cannot be changed',
    })
  })

  it('validates unique upload path when updating', async () => {
    const response = await $fetch('/api/collections/uploads/1?select=directory,filename', {
      method: 'patch',
      body: { directory: '/foo/bar/', filename: 'baz.txt' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({
      filename: 'The file path must be unique',
    })

    if (process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3') {
      expect(await $ofetch('/foo/bar/baz.txt', { baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL })).toBe(
        'test',
      )
    } else {
      expect(fs.readFileSync('test/fixtures/basic/public/uploads/foo/bar/baz.txt', 'utf-8')).toBe('test')
    }
  })

  it('updates an upload', async () => {
    const response = await $fetch(
      '/api/collections/uploads/1?select=directory,filename,size,width,height&where=language[=][]',
      {
        method: 'patch',
        body: { directory: '/FOO//', filename: 'BAR.txt', size: 9001, width: 9001, height: 9001 },
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      },
    )

    expect(response).toEqual({
      directory: 'foo/',
      filename: 'bar.txt',
      size: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    })
    expect(response.size).not.toBe(9001)
    expect(response.width).not.toBe(9001)
    expect(response.height).not.toBe(9001)

    if (process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3') {
      expect(await $ofetch('/foo/bar.txt', { baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL })).toBe('test')
    } else {
      expect(fs.readFileSync('test/fixtures/basic/public/uploads/foo/bar.txt', 'utf-8')).toBe('test')
    }
  })

  it('updates many uploads', async () => {
    const response = await $fetch('/api/collections/uploads?select=directory,filename&order=filename&populate=1', {
      method: 'patch',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual([
      { directory: 'foo/', filename: 'bar.txt' },
      { directory: 'foo/bar/', filename: 'baz.txt' },
    ])

    if (process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3') {
      expect(await $ofetch('/foo/bar/baz.txt', { baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL })).toBe(
        'test',
      )
    } else {
      expect(fs.readFileSync('test/fixtures/basic/public/uploads/foo/bar/baz.txt', 'utf-8')).toBe('test')
    }
  })

  it('validates unique upload path when updating many', async () => {
    const response = await $fetch('/api/collections/uploads?select=directory,filename&where=language[=][]', {
      method: 'patch',
      body: { directory: '/foo/bar/', filename: 'baz.txt' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ filename: 'The file path must be unique' })
  })

  it('does not allow changing file extension (1)', async () => {
    const response = await $fetch('/api/collections/uploads?where=filename[=][baz.txt]', {
      method: 'patch',
      body: { directory: '', filename: 'baz.md' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ filename: 'The file extension cannot be changed' })
  })

  it('does not allow changing file extension (2)', async () => {
    const response = await $fetch('/api/collections/uploads?where=filename[=][baz.txt]', {
      method: 'patch',
      body: { directory: '', filename: 'baz' },
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
      ignoreResponseError: true,
    })

    expect(response).toEqual({ filename: 'The file extension cannot be changed' })
  })

  it('deletes an upload', async () => {
    const response = await $fetch('/api/collections/uploads/1?select=directory,filename', {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual({ directory: 'foo/', filename: 'bar.txt' })

    if (process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3') {
      expect(
        await $ofetch('/foo/bar.txt', {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
          ignoreResponseError: true,
        }),
      ).not.toBe('test')
    } else {
      expect(fs.existsSync('/uploads/foo/bar.txt')).toBe(false)
    }
  })

  it('deletes many uploads', async () => {
    const response = await $fetch('/api/collections/uploads?select=directory,filename', {
      method: 'delete',
      headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    })

    expect(response).toEqual([{ directory: 'foo/bar/', filename: 'baz.txt' }])

    if (process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE === 's3') {
      expect(
        await $ofetch('/foo/bar/baz.txt', {
          baseURL: process.env.NUXT_PRUVIOUS_UPLOADS_DRIVE_BASE_URL,
          ignoreResponseError: true,
        }),
      ).not.toBe('test')
    } else {
      expect(fs.existsSync('/uploads/foo/bar/baz.txt')).toBe(false)
    }
  })
})
