import { describe, expect, test } from 'vitest'
import { $delete, $get, $paginated, $patch, $post } from '../utils'

describe('public collection', () => {
  test('does not require authentication', async () => {
    expect(await $post('/api/collections/public', [{ subpath: 1 }, { subpath: 2 }, { subpath: 3 }])).toBe(3)
    expect(await $get('/api/collections/public')).toEqual(
      $paginated([
        { id: 1, foo: '', subpath: '1' },
        { id: 2, foo: '', subpath: '2' },
        { id: 3, foo: '', subpath: '3' },
      ]),
    )
    expect(await $get('/api/collections/public/1')).toEqual({ id: 1, foo: '', subpath: '1' })
    expect(await $patch('/api/collections/public', { foo: 'foo' })).toBe(3)
    expect(await $patch('/api/collections/public/2', { foo: 'bar' })).toBe(1)
    expect(await $delete('/api/collections/public', { query: { where: 'id[=][3]' } })).toBe(1)
    expect(await $delete('/api/collections/public/2')).toBe(1)

    expect(await $post('/api/collections/public/query/create', { data: [{ subpath: 4 }, { subpath: 5 }] })).toBe(2)
    expect(await $post('/api/collections/public/query/read')).toEqual(
      $paginated([
        { id: 1, foo: 'foo', subpath: '1' },
        { id: 4, foo: '', subpath: '4' },
        { id: 5, foo: '', subpath: '5' },
      ]),
    )
    expect(await $post('/api/collections/public/query/update', { data: { foo: 'bar' } })).toBe(3)
    expect(await $post('/api/collections/public/query/delete', { query: { where: 'id[>][1]' } })).toBe(2)

    expect(await $post('/api/collections/public/validate/create', { subpath: 6 })).toBe(true)
    expect(await $post('/api/collections/public/validate/update')).toBe(true)
    expect(await $post('/api/collections/public/validate/update/1', { foo: 'baz' })).toBe(true)
  })
})
