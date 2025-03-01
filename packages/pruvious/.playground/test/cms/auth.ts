import { describe, expect, test } from 'vitest'
import { $401, $422, $post } from './utils'

describe('auth', () => {
  test('login', async () => {
    expect(await $post('/api/auth/login')).toEqual(
      $422(
        {
          email: 'This field is required',
          password: 'This field is required',
        },
        'Invalid input',
      ),
    )

    expect(
      await $post('/api/auth/login', {
        email: true,
        password: true,
      }),
    ).toEqual(
      $422(
        {
          email: 'The value must be a string',
          password: 'The value must be a string',
        },
        'Invalid input',
      ),
    )

    expect(
      await $post('/api/auth/login', {
        email: 'foo',
        password: 'foo',
      }),
    ).toEqual(
      $422(
        {
          email: 'Invalid email address',
        },
        'Invalid input',
      ),
    )

    expect(
      await $post('/api/auth/login', {
        email: 'foo@bar.baz',
        password: 'foo',
      }),
    ).toEqual($401('Incorrect credentials'))

    expect(
      await $post('/api/auth/login', {
        email: 'admin@pruvious.com',
        password: '12345678',
      }),
    ).toEqual({
      token: expect.any(String),
    })
  })
})
