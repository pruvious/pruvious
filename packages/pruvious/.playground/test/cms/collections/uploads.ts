import { describe, expect, test } from 'vitest'
import { $401, $404, $deleteAsAdmin, $get, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('uploads collection', () => {
  test('available api', async () => {
    expect(await $postAsAdmin('/api/collections/uploads')).toEqual($404('Collection not found'))
    expect(await $getAsAdmin('/api/collections/uploads')).toEqual($paginated([]))
    expect(await $patchAsAdmin('/api/collections/uploads')).toEqual($404('Collection not found'))
    expect(await $deleteAsAdmin('/api/collections/uploads')).toEqual($404('Collection not found'))
  })

  test('requires authentication', async () => {
    expect(await $get('/api/collections/uploads')).toEqual($401())
    expect(await $get('/api/collections/uploads/1')).toEqual($401())
  })
})
