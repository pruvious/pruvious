import { expect, test } from 'vitest'
import { isEmpty, isPrimitive } from '../../src'

test('is primitive', async () => {
  expect(isPrimitive('foo')).toBe(true)
  expect(isPrimitive('')).toBe(true)
  expect(isPrimitive(1)).toBe(true)
  expect(isPrimitive(0)).toBe(true)
  expect(isPrimitive(-1)).toBe(true)
  expect(isPrimitive(true)).toBe(true)
  expect(isPrimitive(false)).toBe(true)
  expect(isPrimitive(null)).toBe(true)
  expect(isPrimitive(undefined)).toBe(true)
  expect(isPrimitive({})).toBe(false)
  expect(isPrimitive([])).toBe(false)
  expect(isPrimitive(NaN)).toBe(false)
  expect(isPrimitive(Infinity)).toBe(false)
})

test('is empty', async () => {
  expect(isEmpty(0)).toBe(true)
  expect(isEmpty('')).toBe(true)
  expect(isEmpty(false)).toBe(true)
  expect(isEmpty(null)).toBe(true)
  expect(isEmpty(undefined)).toBe(true)
  expect(isEmpty([])).toBe(true)
  expect(isEmpty({})).toBe(true)
  expect(isEmpty(' ')).toBe(false)
  expect(isEmpty({ a: 1 })).toBe(false)
  expect(isEmpty([0])).toBe(false)
})
