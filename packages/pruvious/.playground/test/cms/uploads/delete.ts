import fs from 'node:fs'
import { describe, expect, test } from 'vitest'
import { $404, $deleteAsAdmin, $get, $postFormData } from '../utils'

describe('delete uploads', () => {
  const txtFile = new File([fs.readFileSync('packages/pruvious/.playground/test/files/test.txt')], 'tmp.txt')

  test('delete file by id', async () => {
    const id = await $postFormData('/api/uploads', { '': txtFile }).then((res: any) => res[0]?.data.id)
    expect(await $get('/uploads/tmp.txt')).toBe('foo\n')
    expect(await $deleteAsAdmin(`/api/uploads/${id}?returning=id`)).toEqual([
      { success: true, data: { id }, details: { id, path: '/tmp.txt', type: 'file' } },
    ])
    expect(await $get('/uploads/tmp.txt')).toEqual($404('File not found'))
    expect(await $deleteAsAdmin(`/api/uploads/${id}`)).toMatchObject($404('Resource not found'))
  })

  test('delete file by path', async () => {
    const id = await $postFormData('/api/uploads', { '': txtFile }).then((res: any) => res[0]?.data.id)
    expect(await $get('/uploads/tmp.txt')).toBe('foo\n')
    expect(await $deleteAsAdmin('/api/uploads/path/tmp.txt?returning=id')).toEqual([
      { success: true, data: { id }, details: { id, path: '/tmp.txt', type: 'file' } },
    ])
    expect(await $get('/uploads/tmp.txt')).toEqual($404('File not found'))
    expect(await $deleteAsAdmin('/api/uploads/path/tmp.txt')).toMatchObject($404('Resource not found'))
  })

  test('delete directory by id', async () => {
    const id = await $postFormData('/api/uploads', { path: 'tmp' }).then((res: any) => res.data[0]?.id)
    expect(await $deleteAsAdmin(`/api/uploads/${id}?returning=id`)).toEqual([
      { success: true, data: { id }, details: { id, path: '/tmp', type: 'directory' } },
    ])
    expect(await $deleteAsAdmin(`/api/uploads/${id}`)).toMatchObject($404('Resource not found'))
  })

  test('delete directory by path', async () => {
    const id = await $postFormData('/api/uploads', { path: 'tmp' }).then((res: any) => res.data[0]?.id)
    expect(await $deleteAsAdmin('/api/uploads/path/tmp?returning=id')).toEqual([
      { success: true, data: { id }, details: { id, path: '/tmp', type: 'directory' } },
    ])
    expect(await $deleteAsAdmin('/api/uploads/path/tmp')).toMatchObject($404('Resource not found'))
  })

  test('delete recursively', async () => {
    const id = await $postFormData('/api/uploads', { 'tmp-dir': txtFile }).then((res: any) => res[0]?.data.id)
    expect(await $deleteAsAdmin('/api/uploads/path/tmp-dir')).toEqual([
      {
        success: false,
        runtimeError: 'This directory contains nested files or directories that cannot be deleted',
        details: { id: expect.any(Number), path: '/tmp-dir', type: 'directory' },
      },
    ])
    expect(await $get('/uploads/tmp-dir/tmp.txt')).toBe('foo\n')
    expect(await $deleteAsAdmin('/api/uploads/path/tmp-dir?returning=id&recursive=1')).toEqual([
      {
        success: true,
        data: { id },
        details: { id, path: '/tmp-dir/tmp.txt', type: 'file' },
      },
      {
        success: true,
        data: { id: expect.any(Number) },
        details: { id: expect.any(Number), path: '/tmp-dir', type: 'directory' },
      },
    ])
    expect(await $get('/uploads/tmp-dir/tmp.txt')).toEqual($404('File not found'))
  })
})
