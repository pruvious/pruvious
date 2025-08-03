import { describe, expect, test } from 'vitest'
import {
  $401,
  $422,
  $delete,
  $get,
  $patch,
  $post,
  $postAsAdmin,
  setAuthorToken,
  setEditorToken,
  setManagerToken,
  setUserToken,
} from '../utils'

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

  test('create users', async () => {
    expect(
      await $postAsAdmin('/api/collections/users', [
        { email: 'user@pruvious.com', password: '12345678', isActive: true },
      ]),
    ).toEqual(1)
    const userLoginResponse: any = await $post('/api/auth/login', { email: 'user@pruvious.com', password: '12345678' })
    expect(userLoginResponse).toEqual({ token: expect.any(String) })
    setUserToken(userLoginResponse.token)

    expect(
      await $postAsAdmin('/api/collections/users', [
        { email: 'author@pruvious.com', password: '12345678', isActive: true, roles: [1] },
      ]),
    ).toEqual(1)
    const authorLoginResponse: any = await $post('/api/auth/login', {
      email: 'author@pruvious.com',
      password: '12345678',
    })
    expect(authorLoginResponse).toEqual({ token: expect.any(String) })
    setAuthorToken(authorLoginResponse.token)

    expect(
      await $postAsAdmin('/api/collections/users', [
        { email: 'editor@pruvious.com', password: '12345678', isActive: true, roles: [2] },
      ]),
    ).toEqual(1)

    const editorLoginResponse: any = await $post('/api/auth/login', {
      email: 'editor@pruvious.com',
      password: '12345678',
    })
    expect(editorLoginResponse).toEqual({ token: expect.any(String) })
    setEditorToken(editorLoginResponse.token)

    expect(
      await $postAsAdmin('/api/collections/users', [
        { email: 'manager@pruvious.com', password: '12345678', isActive: true, roles: [3] },
      ]),
    ).toEqual(1)
    const managerLoginResponse: any = await $post('/api/auth/login', {
      email: 'manager@pruvious.com',
      password: '12345678',
    })
    expect(managerLoginResponse).toEqual({ token: expect.any(String) })
    setManagerToken(managerLoginResponse.token)
  })

  test('validate email', async () => {
    expect(await $postAsAdmin('/api/collections/users', [{ password: '12345678' }])).toEqual(
      $422([{ email: expect.any(String) }]),
    )
    expect(await $postAsAdmin('/api/collections/users', [{ email: 'foo', password: '12345678' }])).toEqual(
      $422([{ email: expect.any(String) }]),
    )
  })

  test('validate password', async () => {
    expect(await $postAsAdmin('/api/collections/users', [{ email: 'foo@pruvious.com' }])).toEqual(
      $422([{ password: expect.any(String) }]),
    )
    expect(await $postAsAdmin('/api/collections/users', [{ email: 'foo@pruvious.com', password: '1234567' }])).toEqual(
      $422([{ password: expect.any(String) }]),
    )
  })
})
