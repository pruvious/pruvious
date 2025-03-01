import { expect, test } from 'vitest'
import { castToBoolean } from '../../src'

test('cast to boolean', () => {
  expect(castToBoolean(true)).toBe(true)
  expect(castToBoolean(1)).toBe(true)
  expect(castToBoolean('1')).toBe(true)
  expect(castToBoolean('true')).toBe(true)
  expect(castToBoolean('TRUE')).toBe(true)
  expect(castToBoolean('t')).toBe(true)
  expect(castToBoolean('yes')).toBe(true)
  expect(castToBoolean('Yes')).toBe(true)
  expect(castToBoolean('y')).toBe(true)

  expect(castToBoolean(false)).toBe(false)
  expect(castToBoolean(0)).toBe(false)
  expect(castToBoolean('0')).toBe(false)
  expect(castToBoolean('false')).toBe(false)
  expect(castToBoolean('FALSE')).toBe(false)
  expect(castToBoolean('f')).toBe(false)
  expect(castToBoolean('no')).toBe(false)
  expect(castToBoolean('No')).toBe(false)
  expect(castToBoolean('n')).toBe(false)

  expect(castToBoolean('')).toBe('')
  expect(castToBoolean('foo')).toBe('foo')
  expect(castToBoolean(undefined)).toBe(undefined)
  expect(castToBoolean(null)).toBe(null)
  expect(castToBoolean({})).toEqual({})
})
