import { describe, expect, test } from 'vitest'
import { $delete, $get, $paginated, $patch, $post } from '../utils'

describe('public collection', () => {
  test('does not require authentication', async () => {
    expect(await $post('/api/collections/public', [{}, {}, {}])).toBe(3)
    expect(await $get('/api/collections/public')).toEqual(
      $paginated([
        { id: 1, test: '' },
        { id: 2, test: '' },
        { id: 3, test: '' },
      ]),
    )
    expect(await $get('/api/collections/public/1')).toEqual({ id: 1, test: '' })
    expect(await $patch('/api/collections/public', { test: 'foo' })).toBe(3)
    expect(await $patch('/api/collections/public/2', { test: 'bar' })).toBe(1)
    expect(await $delete('/api/collections/public', { query: { where: 'id[=][3]' } })).toBe(1)
    expect(await $delete('/api/collections/public/2')).toBe(1)

    expect(await $post('/api/collections/public/query/create', { data: [{}, {}] })).toBe(2)
    expect(await $post('/api/collections/public/query/read')).toEqual(
      $paginated([
        { id: 1, test: 'foo' },
        { id: 4, test: '' },
        { id: 5, test: '' },
      ]),
    )
    expect(await $post('/api/collections/public/query/update', { data: { test: 'bar' } })).toBe(3)
    expect(await $post('/api/collections/public/query/delete', { query: { where: 'id[>][1]' } })).toBe(2)

    expect(await $post('/api/collections/public/validate/create')).toBe(true)
    expect(await $post('/api/collections/public/validate/update')).toBe(true)
    expect(await $post('/api/collections/public/validate/update/1', { test: 'baz' })).toBe(true)
  })
})
