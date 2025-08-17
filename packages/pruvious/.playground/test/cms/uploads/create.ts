import fs from 'node:fs'
import { describe, expect, test } from 'vitest'
import { $422, $get, $getAsAdmin, $paginated, $postAsAdmin, $postFormData } from '../utils'

describe('create uploads', () => {
  const txtFile = new File([fs.readFileSync('packages/pruvious/.playground/test/files/test.txt')], 'test.txt')

  test('uploads txt file', async () => {
    expect(await $postFormData('/api/uploads', { '': txtFile, 'path': 'foo.txt' })).toEqual([
      {
        success: true,
        data: {
          id: expect.any(Number),
          path: '/foo.txt',
          type: 'file',
          level: 0,
          category: 'text',
          mime: 'text/plain',
          size: txtFile.size,
          etag: expect.any(String),
          images: [],
          multipart: {},
          isLocked: false,
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
          author: 1,
          editors: [],
        },
        details: {
          id: 1,
          path: '/foo.txt',
          type: 'file',
        },
      },
    ])
    expect(await $get('/uploads/foo.txt')).toBe('foo\n')
    expect(await $postFormData('/api/uploads?returning=path', { '': txtFile })).toEqual([
      {
        success: true,
        data: { path: '/test.txt' },
        details: { id: 2, path: '/test.txt', type: 'file' },
      },
    ])
    expect(await $get('/uploads/test.txt')).toBe('foo\n')
  })

  test('uploads txt file in non-existing directory', async () => {
    expect(await $postFormData('/api/uploads?returning=path', { baz: txtFile, path: 'foo/bar.txt' })).toEqual([
      {
        success: true,
        data: { path: '/foo/bar.txt' },
        details: { id: 3, path: '/foo/bar.txt', type: 'file' },
      },
    ])
    expect(await $get('/uploads/foo/bar.txt')).toBe('foo\n')
    expect(await $postFormData('/api/uploads?returning=path', { foo: txtFile })).toEqual([
      {
        success: true,
        data: { path: '/foo/test.txt' },
        details: { id: 5, path: '/foo/test.txt', type: 'file' },
      },
    ])
    expect(await $get('/uploads/foo/test.txt')).toBe('foo\n')
  })

  test('create directory', async () => {
    expect(await $postFormData('/api/uploads', { path: 'bar' })).toEqual({
      success: true,
      data: [
        {
          id: 6,
          path: '/bar',
          type: 'directory',
          level: 0,
          category: '',
          mime: '',
          size: 0,
          etag: '',
          images: [],
          multipart: {},
          isLocked: false,
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
          author: 1,
          editors: [],
        },
      ],
    })
  })

  test('create many directories', async () => {
    expect(
      await $postAsAdmin('/api/uploads?returning=id,path,level', [
        { path: 'baz' },
        { path: 'qux/nested', author: 2, editors: [3] },
      ]),
    ).toEqual({
      success: true,
      data: [
        { id: 7, path: '/baz', level: 0 },
        { id: 8, path: '/qux/nested', level: 1 },
        // { id: 9, path: '/qux', level: 0 },
      ],
    })
    expect(await $getAsAdmin('/api/collections/uploads?select=level&where=path[=][/qux]')).toEqual(
      $paginated([{ level: 0 }]),
    )
    expect(
      await $postAsAdmin('/api/uploads?returning=id,path,level', [
        { path: 'bar' },
        { path: 'baz' },
        { path: 'qux/nested', author: 2, editors: [3] },
      ]),
    ).toEqual($422([{ path: expect.any(String) }, { path: expect.any(String) }, { path: expect.any(String) }]))
  })

  test('uploads txt file in existing directory', async () => {
    expect(await $postFormData('/api/uploads?returning=path', { baz: txtFile, path: 'qux/nested/bar.txt' })).toEqual([
      {
        success: true,
        data: { path: '/qux/nested/bar.txt' },
        details: { id: 10, path: '/qux/nested/bar.txt', type: 'file' },
      },
    ])
    expect(await $get('/uploads/qux/nested/bar.txt')).toBe('foo\n')
    expect(
      await $getAsAdmin('/api/collections/uploads?select=id,path,type&where=path[like][/qux%]&orderBy=id'),
    ).toEqual(
      $paginated([
        { id: 8, path: '/qux/nested', type: 'directory' },
        { id: 9, path: '/qux', type: 'directory' },
        { id: 10, path: '/qux/nested/bar.txt', type: 'file' },
      ]),
    )
  })
})
