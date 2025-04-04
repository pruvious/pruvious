import { expect, test } from 'vitest'
import { clamp, countDecimals, leadingZeros, parseId } from '../../src'

test('clamp', () => {
  expect(clamp(1, 0, 2)).toEqual(1)
  expect(clamp(0, 0, 2)).toEqual(0)
  expect(clamp(2, 0, 2)).toEqual(2)
  expect(clamp(3, 0, 2)).toEqual(2)
  expect(clamp(-1, 0, 2)).toEqual(0)
  expect(clamp(0, 0, 0)).toEqual(0)
})

test('count decimals', () => {
  expect(countDecimals(1.5)).toBe(1)
  expect(countDecimals(1.25)).toBe(2)
  expect(countDecimals(1.123456789)).toBe(9)
  expect(countDecimals(1)).toBe(0)
  expect(countDecimals(0)).toBe(0)
  expect(countDecimals(-1)).toBe(0)
  expect(countDecimals(NaN)).toBe(0)
  expect(countDecimals(Infinity)).toBe(0)
})

test('parse id', () => {
  expect(parseId(1)).toEqual(1)
  expect(parseId(2)).toEqual(2)
  expect(parseId('1')).toEqual(1)
  expect(parseId('2')).toEqual(2)
  expect(parseId(0)).toEqual(null)
  expect(parseId('0')).toEqual(null)
  expect(parseId('')).toEqual(null)
  expect(parseId(1.5)).toEqual(null)
  expect(parseId('1.5')).toEqual(null)
  expect(parseId(true)).toEqual(null)
  expect(parseId({})).toEqual(null)
  expect(parseId([])).toEqual(null)
  expect(parseId(null)).toEqual(null)
  expect(parseId(undefined)).toEqual(null)
})

test('leading zeros', () => {
  expect(leadingZeros(1, 3)).toEqual('001')
  expect(leadingZeros(1.5, 3)).toEqual('001.5')
  expect(leadingZeros(-1, 3)).toEqual('-001')
  expect(leadingZeros(1, 0)).toEqual('1')
  expect(leadingZeros(1.5, 0)).toEqual('1.5')
  expect(leadingZeros(-1, 0)).toEqual('-1')
  expect(leadingZeros(1, -1)).toEqual('1')
})
