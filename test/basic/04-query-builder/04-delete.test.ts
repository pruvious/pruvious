import { $fetch } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('query builder: delete', () => {
  it('deletes a product', async () => {
    const response = await $fetch('/api/query-builder/delete-products/2', { method: 'delete' })
    expect(response).toEqual({ id: 2 })

    const verifyResponse = await $fetch('/api/query-builder/get-product/2')
    expect(verifyResponse).toBeFalsy()
  })

  it('deletes many products', async () => {
    const response = await $fetch('/api/query-builder/delete-many-products', {
      method: 'delete',
      query: { ids: [2, 3, 4] },
    })

    expect(response.map(({ id }: any) => id).sort()).toEqual([3, 4].sort())

    const verifyResponse1 = await $fetch('/api/query-builder/get-product/3')
    expect(verifyResponse1).toBeFalsy()

    const verifyResponse2 = await $fetch('/api/query-builder/get-product/4')
    expect(verifyResponse2).toBeFalsy()

    const verifyResponse3 = await $fetch('/api/query-builder/get-product/5')
    expect(verifyResponse3).toBeTypeOf('object')
  })
})
