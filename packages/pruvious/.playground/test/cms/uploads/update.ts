import { describe, expect, test } from 'vitest'
import { $getAsAdmin, $patchAsAdmin } from '../utils'

describe('update uploads', () => {
  test('update file by id', async () => {
    expect(
      await $patchAsAdmin('/api/uploads/1', {
        path: 'nope.txt',
        type: 'directory',
        level: 1,
        category: 'images',
        mime: 'image/png',
        size: 9001,
        images: [1],
        isLocked: true,
        author: 2,
        editors: [3],
      }),
    ).toEqual({
      success: true,
      data: [
        {
          id: expect.any(Number),
          path: '/foo.txt',
          type: 'file',
          level: 0,
          category: 'text',
          mime: 'text/plain',
          size: expect.not.toBeOneOf([9001]),
          etag: expect.any(String),
          images: [],
          multipart: {},
          isLocked: false,
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
          author: 2,
          editors: [3],
        },
      ],
    })
  })

  test('update file by path', async () => {
    expect(
      await $patchAsAdmin('/api/uploads/path/foo.txt', {
        path: 'nope.txt',
        type: 'directory',
        level: 1,
        category: 'images',
        mime: 'image/png',
        size: 9001,
        images: [1],
        isLocked: true,
        author: 1,
        editors: [2],
      }),
    ).toEqual({
      success: true,
      data: [
        {
          id: expect.any(Number),
          path: '/foo.txt',
          type: 'file',
          level: 0,
          category: 'text',
          mime: 'text/plain',
          size: expect.not.toBeOneOf([9001]),
          etag: expect.any(String),
          images: [],
          multipart: {},
          isLocked: false,
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
          author: 1,
          editors: [2],
        },
      ],
    })
  })

  test('update directory', async () => {
    expect(
      await $patchAsAdmin('/api/uploads/6', {
        path: 'nope',
        type: 'file',
        level: 2,
        category: 'images',
        mime: 'image/png',
        isLocked: true,
        author: 2,
        editors: [3],
      }),
    ).toEqual({
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
          author: 2,
          editors: [3],
        },
      ],
    })
  })

  test('update directory by path', async () => {
    expect(
      await $patchAsAdmin('/api/uploads/path/bar', {
        path: 'nope',
        type: 'file',
        level: 2,
        category: 'images',
        mime: 'image/png',
        isLocked: true,
        author: 1,
        editors: [2],
      }),
    ).toEqual({
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
          editors: [2],
        },
      ],
    })
  })

  test('update recursively', async () => {
    expect(await $patchAsAdmin('/api/uploads/path/qux/nested?returning=path,editors', { editors: [2] })).toEqual({
      success: true,
      data: [{ path: '/qux/nested', editors: [2] }],
    })
    expect(await $getAsAdmin('/api/collections/uploads/10?select=path,editors')).toEqual({
      path: '/qux/nested/bar.txt',
      editors: [],
    })
    expect(
      await $patchAsAdmin('/api/uploads/path/qux/nested?returning=path,editors&recursive=1', { editors: [2] }),
    ).toEqual({
      success: true,
      data: [
        { path: '/qux/nested', editors: [2] },
        { path: '/qux/nested/bar.txt', editors: [2] },
      ],
    })
    expect(await $getAsAdmin('/api/collections/uploads/10?select=path,editors')).toEqual({
      path: '/qux/nested/bar.txt',
      editors: [2],
    })
  })
})
