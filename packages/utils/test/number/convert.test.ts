import { expect, test } from 'vitest'
import { castToNumber } from '../../src'

test('cast to number', () => {
  expect(castToNumber(1)).toBe(1)
  expect(castToNumber('1')).toBe(1)
  expect(castToNumber(0)).toBe(0)
  expect(castToNumber(0.5)).toBe(0.5)
  expect(castToNumber('1.0')).toBe(1)
  expect(castToNumber('1,0')).toBe(1)
  expect(castToNumber('01.50')).toBe(1.5)
  expect(castToNumber('01,50')).toBe(1.5)
  expect(castToNumber(-1)).toBe(-1)
  expect(castToNumber('-1')).toBe(-1)

  expect(castToNumber('')).toBe('')
  expect(castToNumber('foo')).toBe('foo')
  expect(castToNumber('f00')).toBe('f00')
  expect(castToNumber(true)).toBe(true)
  expect(castToNumber(undefined)).toBe(undefined)
  expect(castToNumber(null)).toBe(null)
  expect(castToNumber(1n)).toBe(1n)
  expect(castToNumber({})).toEqual({})
})
