import { describe, expect, test } from 'vitest'
import { $404, $get, $getAsAdmin, $patchAsAdmin, $postFormData } from '../utils'

describe('move uploads', () => {
  test('move file by id', async () => {
    expect(await $patchAsAdmin('/api/uploads/move/1?returning=path,category,mime', { path: 'new-dir/bar' })).toEqual([
      {
        success: true,
        data: { path: '/new-dir/bar.txt', category: 'text', mime: 'text/plain' },
        details: { id: 1, newPath: '/new-dir/bar.txt', oldPath: '/foo.txt', type: 'file' },
      },
    ])
    expect(await $get('/uploads/foo.txt')).toEqual($404('File not found'))
    expect(await $get('/uploads/new-dir/bar.txt')).toBe('foo\n')
  })

  test('move file by path', async () => {
    expect(await $patchAsAdmin('/api/uploads/move/path/new-dir/bar.txt?returning=path', { path: 'foo.txt' })).toEqual([
      {
        success: true,
        data: { path: '/foo.txt' },
        details: { id: 1, newPath: '/foo.txt', oldPath: '/new-dir/bar.txt', type: 'file' },
      },
    ])
    expect(await $get('/uploads/new-dir/bar.txt')).toEqual($404('File not found'))
    expect(await $get('/uploads/foo.txt')).toBe('foo\n')
  })

  test('move directory by id', async () => {
    // 6 = /bar
    // 7 = /baz
    expect(await $patchAsAdmin('/api/uploads/move/6?returning=path', { path: '/baz-2' })).toEqual([
      {
        success: true,
        data: { path: '/baz-2' },
        details: { id: 6, newPath: '/baz-2', oldPath: '/bar', type: 'directory' },
      },
    ])
    expect(await $getAsAdmin('/api/collections/uploads/6?select=path')).toEqual({ path: '/baz-2' })
    expect(await $patchAsAdmin('/api/uploads/move/6?returning=path', { path: '/baz' })).toEqual([
      {
        success: true,
        data: { path: '/baz' },
        details: { id: 6, newPath: '/baz', oldPath: '/baz-2', type: 'directory' },
      },
    ])
    // 6 is deleted because 7 exists
    expect(await $getAsAdmin('/api/collections/uploads/6')).toEqual($404('Resource not found'))
  })

  test('move directory by path', async () => {
    expect(await $patchAsAdmin('/api/uploads/move/path/baz?returning=path', { path: '/baz-2' })).toEqual([
      {
        success: true,
        data: { path: '/baz-2' },
        details: { id: 7, newPath: '/baz-2', oldPath: '/baz', type: 'directory' },
      },
    ])
    expect(await $patchAsAdmin('/api/uploads/move/path/baz-2/?returning=path', { path: '/baz' })).toEqual([
      {
        success: true,
        data: { path: '/baz' },
        details: { id: 7, newPath: '/baz', oldPath: '/baz-2', type: 'directory' },
      },
    ])
  })

  test('move directory with nested files', async () => {
    expect(
      await $patchAsAdmin('/api/uploads/move/path/qux/nested?returning=path', { path: '/qux-2/nested-2' }),
    ).toEqual([
      {
        success: true,
        data: { path: '/qux-2/nested-2/bar.txt' },
        details: { id: 10, newPath: '/qux-2/nested-2/bar.txt', oldPath: '/qux/nested/bar.txt', type: 'file' },
      },
      {
        success: true,
        data: { path: '/qux-2/nested-2' },
        details: { id: 8, newPath: '/qux-2/nested-2', oldPath: '/qux/nested', type: 'directory' },
      },
    ])
    expect(await $get('/uploads/qux/nested/bar.txt')).toEqual($404('File not found'))
    expect(await $get('/uploads/qux-2/nested-2/bar.txt')).toBe('foo\n')
    expect(await $patchAsAdmin('/api/uploads/move/path/qux-2?returning=path', { path: '/qux' })).toEqual([
      {
        success: true,
        data: { path: '/qux/nested-2/bar.txt' },
        details: { id: 10, newPath: '/qux/nested-2/bar.txt', oldPath: '/qux-2/nested-2/bar.txt', type: 'file' },
      },
      {
        success: true,
        data: { path: '/qux/nested-2' },
        details: { id: expect.any(Number), newPath: '/qux/nested-2', oldPath: '/qux-2/nested-2', type: 'directory' },
      },
      {
        success: true,
        data: { path: '/qux' },
        details: { id: expect.any(Number), newPath: '/qux', oldPath: '/qux-2', type: 'directory' },
      },
    ])
    expect(await $get('/uploads/qux-2/nested-2/bar.txt')).toEqual($404('File not found'))
    expect(await $get('/uploads/qux/nested-2/bar.txt')).toBe('foo\n')
    expect(await $patchAsAdmin('/api/uploads/move/path/qux/nested-2?returning=path', { path: '/qux/nested' })).toEqual([
      {
        success: true,
        data: { path: '/qux/nested/bar.txt' },
        details: { id: 10, newPath: '/qux/nested/bar.txt', oldPath: '/qux/nested-2/bar.txt', type: 'file' },
      },
      {
        success: true,
        data: { path: '/qux/nested' },
        details: { id: expect.any(Number), newPath: '/qux/nested', oldPath: '/qux/nested-2', type: 'directory' },
      },
    ])
    expect(await $get('/uploads/qux/nested-2/bar.txt')).toEqual($404('File not found'))
    expect(await $get('/uploads/qux/nested/bar.txt')).toBe('foo\n')
  })

  test('move to same path', async () => {
    expect(await $patchAsAdmin('/api/uploads/move/path/qux/nested/bar.txt', { path: '/qux/nested/bar.txt' })).toEqual([
      {
        success: false,
        inputErrors: { path: 'The new path must be different from the current path' },
        details: {
          id: expect.any(Number),
          newPath: '/qux/nested/bar.txt',
          oldPath: '/qux/nested/bar.txt',
          type: 'file',
        },
      },
    ])
  })

  test('set as root directory', async () => {
    expect(await $patchAsAdmin('/api/uploads/move/path/qux/nested', { path: '/' })).toEqual([
      {
        success: false,
        inputErrors: { path: 'The new path cannot be the root directory' },
        details: { id: expect.any(Number), newPath: '/', oldPath: '/qux/nested', type: 'directory' },
      },
    ])
  })

  test('overwrite file', async () => {
    const foo = new File(['foo'], 'foo.txt')
    const bar = new File(['bar'], 'bar.txt')
    expect(await $postFormData('/api/uploads', { '': foo })).toMatchObject([{ success: true }])
    expect(await $postFormData('/api/uploads', { '': bar })).toMatchObject([{ success: true }])
    expect(await $patchAsAdmin('/api/uploads/move/path/foo.txt', { path: 'bar.txt' })).toEqual([
      {
        success: false,
        inputErrors: { path: 'The path must be unique' },
        details: { id: 1, newPath: '/bar.txt', oldPath: '/foo.txt', type: 'file' },
      },
    ])
  })

  test('move non-existing upload', async () => {
    expect(await $patchAsAdmin('/api/uploads/move/9001', { path: '/baz' })).toEqual($404('Resource not found'))
    expect(await $patchAsAdmin('/api/uploads/move/path', { path: '/baz' })).toMatchObject({ statusCode: 404 })
    expect(await $patchAsAdmin('/api/uploads/move/path/nope', { path: '/baz' })).toEqual($404('Resource not found'))
  })
})
