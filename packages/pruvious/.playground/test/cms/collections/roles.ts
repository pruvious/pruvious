import { describe, expect, test } from 'vitest'
import { $401, $delete, $get, $patch, $post, $postAsAdmin } from '../utils'

describe('roles collection', () => {
  test('requires authentication', async () => {
    expect(await $post('/api/collections/roles')).toEqual($401())
    expect(await $get('/api/collections/roles')).toEqual($401())
    expect(await $get('/api/collections/roles/1')).toEqual($401())
    expect(await $patch('/api/collections/roles')).toEqual($401())
    expect(await $patch('/api/collections/roles/1')).toEqual($401())
    expect(await $delete('/api/collections/roles')).toEqual($401())
    expect(await $delete('/api/collections/roles/1')).toEqual($401())

    expect(await $post('/api/collections/roles/query/create')).toEqual($401())
    expect(await $post('/api/collections/roles/query/read')).toEqual($401())
    expect(await $post('/api/collections/roles/query/update')).toEqual($401())
    expect(await $post('/api/collections/roles/query/delete')).toEqual($401())

    expect(await $post('/api/collections/roles/validate/create')).toEqual($401())
    expect(await $post('/api/collections/roles/validate/update')).toEqual($401())
    expect(await $post('/api/collections/roles/validate/update/1')).toEqual($401())
  })

  test('create roles', async () => {
    expect(
      await $postAsAdmin('/api/collections/roles', [
        {
          name: 'Author',
          permissions: [
            'access-dashboard',
            'collection:bookmarks:create',
            'collection:bookmarks:read',
            'collection:bookmarks:update',
            'collection:bookmarks:delete',
            'collection:pages:create',
            'collection:pages:read',
            'collection:pages:update',
            'collection:pages:delete',
            'collection:uploads:create',
            'collection:uploads:read',
            'collection:uploads:update',
            'collection:uploads:delete',
          ],
        },
        {
          name: 'Editor',
          permissions: [
            'access-dashboard',
            'update-account',
            'collection:bookmarks:create',
            'collection:bookmarks:read',
            'collection:bookmarks:update',
            'collection:bookmarks:delete',
            'collection:pages:create',
            'collection:pages:read',
            'collection:pages:update',
            'collection:pages:delete',
            'collection:uploads:create',
            'collection:uploads:read',
            'collection:uploads:update',
            'collection:uploads:delete',
            'collection:routes:create',
            'collection:routes:read',
            'collection:routes:update',
            'collection:routes:delete',
          ],
        },
        {
          name: 'Manager',
          permissions: [
            'access-dashboard',
            'update-account',
            'collection:bookmarks:create',
            'collection:bookmarks:read',
            'collection:bookmarks:update',
            'collection:bookmarks:delete',
            'collection:bookmarks:manage',
            'collection:pages:create',
            'collection:pages:read',
            'collection:pages:update',
            'collection:pages:delete',
            'collection:pages:manage',
            'collection:uploads:create',
            'collection:uploads:read',
            'collection:uploads:update',
            'collection:uploads:delete',
            'collection:uploads:manage',
            'collection:routes:create',
            'collection:routes:read',
            'collection:routes:update',
            'collection:routes:delete',
            'collection:routes:manage',
            'singleton:seo:read',
            'singleton:seo:update',
          ],
        },
      ]),
    ).toEqual(3)
  })
})
