import { describe, expect, test } from 'vitest'
import { $401, $delete, $get, $patch, $post } from '../utils'

describe('users collection', () => {
  test('requires authentication', async () => {
    expect(await $post('/api/collections/users')).toEqual($401())
    expect(await $get('/api/collections/users')).toEqual($401())
    expect(await $get('/api/collections/users/1')).toEqual($401())
    expect(await $patch('/api/collections/users')).toEqual($401())
    expect(await $patch('/api/collections/users/1')).toEqual($401())
    expect(await $delete('/api/collections/users')).toEqual($401())
    expect(await $delete('/api/collections/users/1')).toEqual($401())

    expect(await $post('/api/collections/users/query/create')).toEqual($401())
    expect(await $post('/api/collections/users/query/read')).toEqual($401())
    expect(await $post('/api/collections/users/query/update')).toEqual($401())
    expect(await $post('/api/collections/users/query/delete')).toEqual($401())

    expect(await $post('/api/collections/users/validate/create')).toEqual($401())
    expect(await $post('/api/collections/users/validate/update')).toEqual($401())
    expect(await $post('/api/collections/users/validate/update/1')).toEqual($401())
  })
})
