import fs from 'node:fs'
import { describe, expect, test } from 'vitest'
import { $get, $getAsAdmin, $paginated, $postAsAdmin, $postFormData } from '../utils'

describe('create uploads', () => {
  const txtFile = new File([fs.readFileSync('packages/pruvious/.playground/test/files/test.txt')], 'test.txt')

  test('uploads txt file', async () => {
    expect(await $postFormData('/api/uploads', { '': txtFile, 'path': 'foo.txt' })).toEqual([
      {
        success: true,
        data: {
          id: 1,
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
    expect(await $postFormData('/api/uploads?returning=path', { path: 'bar' })).toEqual([
      {
        success: true,
        data: { path: '/bar' },
        details: { id: 6, path: '/bar', type: 'directory' },
      },
    ])
  })

  test('create many directories', async () => {
    expect(
      await $postAsAdmin('/api/uploads?returning=id,path,level', [
        { path: 'baz' },
        { path: 'qux/nested', author: 2, editors: [3] },
      ]),
    ).toEqual([
      {
        success: true,
        data: { id: 7, path: '/baz', level: 0 },
        details: { id: 7, path: '/baz', type: 'directory' },
      },
      {
        success: true,
        data: { id: 8, path: '/qux/nested', level: 1 },
        details: { id: 8, path: '/qux/nested', type: 'directory' },
      },
      // {
      //   success: true,
      //   data: { id: 9, path: '/qux', level: 0 },
      //   details: { id: 9, path: '/qux', type: 'directory' },
      // },
    ])
    expect(await $getAsAdmin('/api/collections/uploads?select=level&where=path[=][/qux]')).toEqual(
      $paginated([{ level: 0 }]),
    )
    expect(
      await $postAsAdmin('/api/uploads?returning=id,path,level', [
        { path: 'bar' },
        { path: 'baz' },
        { path: 'qux/nested', author: 2, editors: [3] },
        { path: 'quux' },
      ]),
    ).toEqual([
      { success: false, inputErrors: { path: expect.any(String) }, details: { path: '/bar', type: 'directory' } },
      { success: false, inputErrors: { path: expect.any(String) }, details: { path: '/baz', type: 'directory' } },
      {
        success: false,
        inputErrors: { path: expect.any(String) },
        details: { path: '/qux/nested', type: 'directory' },
      },
      { success: false, details: { path: '/quux', type: 'directory' } },
    ])
    expect(await $getAsAdmin('/api/collections/uploads?where=path[=][/quux]')).toEqual($paginated([]))
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

  test('creates duplicate file', async () => {
    expect(await $postFormData('/api/uploads?returning=id', { '': txtFile, 'path': 'foo.txt' })).toEqual([
      {
        success: true,
        data: { id: expect.any(Number) },
        details: { id: expect.any(Number), path: '/foo-1.txt', type: 'file' },
      },
    ])
  })

  test('overwrites existing file', async () => {
    const oldTxtFile = new File(['bar'], 'bar.txt')
    const newTxtFile = new File(['BAR'], 'bar.txt')
    expect(await $postFormData('/api/uploads?returning=id&overwrite=true', { '': oldTxtFile })).toEqual([
      {
        success: true,
        data: { id: expect.any(Number) },
        details: { id: expect.any(Number), path: '/bar.txt', type: 'file' },
      },
    ])
    expect(await $get('/uploads/bar.txt')).toBe('bar')
    expect(await $postFormData('/api/uploads?returning=id&overwrite=true', { '': newTxtFile })).toEqual([
      {
        success: true,
        data: { id: expect.any(Number) },
        details: { id: expect.any(Number), path: '/bar.txt', type: 'file' },
      },
    ])
    expect(await $get('/uploads/bar.txt')).toBe('BAR')
  })
})
