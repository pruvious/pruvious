import { expect, test } from 'vitest'
import { defu } from '../../src'

test('defu', async () => {
  expect(defu({ foo: { bar: 1 } }, { foo: { baz: 2 } })).toEqual({ foo: { bar: 1, baz: 2 } })
  expect(defu({ foo: [1] }, { foo: [2] })).toEqual({ foo: [1] })
  expect(defu({ settings: { theme: 'dark' } }, { settings: { language: 'en' } })).toEqual({
    settings: { theme: 'dark', language: 'en' },
  })
  expect(defu({ items: [1, 2] }, { items: [3, 4] })).toEqual({ items: [1, 2] })
})
