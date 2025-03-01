import { expect, test } from 'vitest'
import { isDatabaseIdentifier } from '../../src'

test('is database identifier', () => {
  expect(isDatabaseIdentifier('foo')).toBe(true)
  expect(isDatabaseIdentifier('fooBar')).toBe(true)
  expect(isDatabaseIdentifier('FooBar')).toBe(true)
  expect(isDatabaseIdentifier('foo_bar')).toBe(true)
  expect(isDatabaseIdentifier('_')).toBe(true)
  expect(isDatabaseIdentifier('a'.repeat(63))).toBe(true)
  expect(isDatabaseIdentifier('0foo')).toBe(false)
  expect(isDatabaseIdentifier('$foo')).toBe(false)
  expect(isDatabaseIdentifier('foo bar')).toBe(false)
  expect(isDatabaseIdentifier(' foo')).toBe(false)
  expect(isDatabaseIdentifier('foo ')).toBe(false)
  expect(isDatabaseIdentifier('a'.repeat(64))).toBe(false)
  expect(isDatabaseIdentifier('__')).toBe(false)
  expect(isDatabaseIdentifier('foo__bar')).toBe(false)
})
