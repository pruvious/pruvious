import { expect, test } from 'vitest'
import { castToNumericString, castToString } from '../../src'

test('cast to string', () => {
  expect(castToString('foo')).toEqual('foo')
  expect(castToString(1)).toEqual('1')
  expect(castToString(NaN)).toEqual(NaN)
  expect(castToString(true)).toEqual(true)
  expect(castToString(undefined)).toEqual(undefined)
  expect(castToString(null)).toEqual(null)
  expect(castToString({})).toEqual({})
})

test('cast to numeric string', () => {
  expect(castToNumericString(1)).toBe('1')
  expect(castToNumericString('1')).toBe('1')
  expect(castToNumericString(10)).toBe('10')
  expect(castToNumericString(0)).toBe('0')
  expect(castToNumericString(0.5)).toBe('0.5')
  expect(castToNumericString('1.0')).toBe('1')
  expect(castToNumericString('1,0')).toBe('1')
  expect(castToNumericString('01.50')).toBe('1.5')
  expect(castToNumericString('01,50')).toBe('1.5')
  expect(castToNumericString(-1)).toBe('-1')
  expect(castToNumericString('-1')).toBe('-1')
  expect(castToNumericString(-1.5)).toBe('-1.5')
  expect(castToNumericString('-01.50')).toBe('-1.5')
  expect(castToNumericString('-01,50')).toBe('-1.5')
  expect(castToNumericString('-001')).toBe('-1')

  expect(castToNumericString('')).toBe('')
  expect(castToNumericString('foo')).toBe('foo')
  expect(castToNumericString('f00')).toBe('f00')
  expect(castToNumericString(true)).toBe(true)
  expect(castToNumericString(undefined)).toBe(undefined)
  expect(castToNumericString(null)).toBe(null)
  expect(castToNumericString(1n)).toBe(1n)
  expect(castToNumericString({})).toEqual({})
})
