import { expect, test } from 'vitest'
import { $400, $422, $get, $post, setAdminToken } from './utils'

test('installation', async () => {
  expect(await $get('/api/pruvious')).toEqual({
    installed: false,
    version: expect.any(String),
  })

  expect(await $post('/api/pruvious/install')).toEqual(
    $422({
      email: 'This field is required',
      password: 'This field is required',
    }),
  )

  expect(
    await $post('/api/pruvious/install', {
      email: 'admin@pruvious.com',
      password: '1234567',
    }),
  ).toEqual(
    $422({
      password: 'The password must be at least 8 characters long',
    }),
  )

  const installResponse: any = await $post('/api/pruvious/install', {
    email: 'admin@pruvious.com',
    password: '12345678',
  })

  expect(installResponse).toEqual({ token: expect.any(String) })
  setAdminToken(installResponse.token)

  expect(
    await $post('/api/pruvious/install', {
      email: 'admin@pruvious.com',
      password: '12345678',
    }),
  ).toEqual($400('Pruvious is already installed'))

  expect(await $get('/api/pruvious')).toEqual({
    installed: true,
    version: expect.any(String),
  })
})
