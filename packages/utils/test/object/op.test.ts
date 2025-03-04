import { expect, test } from 'vitest'
import {
  anonymizeObject,
  cleanMerge,
  clear,
  deepClone,
  deepCompare,
  deleteProperty,
  filterObject,
  getProperty,
  omit,
  pick,
  remap,
  setProperty,
} from '../../src'

test('deep clone', () => {
  const original = { foo: { bar: [1, 2, 3], baz: {} } }
  const clone: any = deepClone(original)
  expect(clone).toEqual({ foo: { bar: [1, 2, 3], baz: {} } })
  expect(original === clone).toBe(false)
  clone.foo.bar.push(4)
  clone.foo.baz.qux = 'quux'
  clone.bar = 'baz'
  expect(original).toEqual({ foo: { bar: [1, 2, 3], baz: {} } })
  const fooSymbol = Symbol('foo')
  expect(deepClone({ [fooSymbol]: 'bar' })).toEqual({ [fooSymbol]: 'bar' })
  const barFunction = () => 'bar'
  expect(deepClone({ foo: barFunction })).toEqual({ foo: barFunction })
})

test('deep compare', () => {
  expect(deepCompare('foo', 'foo')).toBe(true)
  expect(deepCompare('foo', 'FOO')).toBe(false)
  expect(deepCompare(1, 1)).toBe(true)
  expect(deepCompare(1, '1')).toBe(false)
  expect(deepCompare(true, true)).toBe(true)
  expect(deepCompare(false, 0)).toBe(false)
  expect(deepCompare(null, null)).toBe(true)
  expect(deepCompare(undefined, undefined)).toBe(true)
  expect(deepCompare({}, {})).toBe(true)
  expect(deepCompare({ foo: 1 }, { foo: 1 })).toBe(true)
  expect(deepCompare({ foo: 1 }, { foo: 1, bar: 2 })).toBe(false)
  expect(deepCompare({ foo: 1, bar: 2 }, { bar: 2, foo: 1 })).toBe(true)
  expect(deepCompare([], [])).toBe(true)
  expect(deepCompare([1, 2], [1, 2])).toBe(true)
  expect(deepCompare([1, 2], [2, 1])).toBe(false)
  expect(deepCompare([1, 2], [1, 2, 3])).toBe(false)
})

test('pick', () => {
  expect(pick({ foo: 1, bar: 2, baz: 3 }, ['foo', 'baz'])).toEqual({ foo: 1, baz: 3 })
  expect(pick({ foo: 1, bar: 2, baz: 3 }, ['foo'])).toEqual({ foo: 1 })
  expect(pick({ foo: 1, bar: 2, baz: 3 }, [])).toEqual({})
  expect(pick({ foo: 1, bar: 2, baz: 3 }, ['qux' as any])).toEqual({})
  expect(pick({}, [])).toEqual({})
})

test('omit', () => {
  expect(omit({ foo: 1, bar: 2, baz: 3 }, ['foo', 'baz'])).toEqual({ bar: 2 })
  expect(omit({ foo: 1, bar: 2, baz: 3 }, ['foo'])).toEqual({ bar: 2, baz: 3 })
  expect(omit({ foo: 1, bar: 2, baz: 3 }, [])).toEqual({ foo: 1, bar: 2, baz: 3 })
  expect(omit({ foo: 1, bar: 2, baz: 3 }, ['qux' as any])).toEqual({ foo: 1, bar: 2, baz: 3 })
  expect(omit({}, [])).toEqual({})
})

test('gets object property by dot notation', () => {
  expect(getProperty({ foo: { bar: 'baz' } }, 'foo.bar')).toBe('baz')
  expect(getProperty({ foo: { bar: 'baz' } }, 'foo', 'bar')).toBe('baz')
  expect(getProperty({ foo: { bar: 'baz' } }, 'foo.bar.baz')).toBe(undefined)
  expect(getProperty({ foo: { bar: 'baz' } }, 'foo', 'bar', 'baz')).toBe(undefined)
  expect(getProperty({ foo: ['bar', 'baz'] }, 'foo.1')).toBe('baz')
  expect(getProperty({ foo: ['bar', 'baz'] }, 'foo', '1')).toBe('baz')
  expect(getProperty({ foo: ['bar', 'baz'] }, 'foo', '.', 2, '..', 1)).toBe('baz')
  expect(getProperty({ foo: ['bar', 'baz'] }, 'foo', 'bar', '../../foo.1')).toBe('baz')
  expect(getProperty({ foo: { bar: 'baz' } }, 'foo.0')).toBe(undefined)
  expect(getProperty({ foo: { bar: 'baz' } }, 'foo', '0')).toBe(undefined)
  expect(getProperty({ foo: 'bar' }, '')).toEqual({ foo: 'bar' })
  expect(getProperty(['foo'], '')).toEqual(['foo'])
  expect(getProperty(['foo', 'bar'], '0')).toEqual('foo')
  expect(getProperty(['foo', 'bar'], '1')).toEqual('bar')
  expect(getProperty(['foo', ['bar', 'baz']], '1.1')).toEqual('baz')
  expect(getProperty(['foo', [{ bar: 'baz' }]], '1.0.bar')).toEqual('baz')

  const obj = { foo: { bar: 'baz' } }
  const arr = [[obj]]

  expect(getProperty(obj, 'foo')).toBe(obj.foo)
  expect(getProperty(arr, '0.0')).toBe(obj)
})

test('sets object property by dot notation', () => {
  expect(setProperty({ foo: { bar: 'baz' } }, 'foo.bar', 'qux')).toEqual({ foo: { bar: 'qux' } })
  expect(setProperty({ foo: { bar: 'baz' } }, 'foo.bar.baz', 'qux')).toEqual({ foo: { bar: { baz: 'qux' } } })
  expect(setProperty({ foo: ['bar', 'baz'] }, 'foo.1', 'qux')).toEqual({ foo: ['bar', 'qux'] })
  expect(setProperty({ foo: ['bar', 'baz'] }, 'foo', ['foo'])).toEqual({ foo: ['foo'] })
})

test('deletes object property by dot notation', () => {
  const a = { foo: { bar: 'baz' } }
  const b = { foo: { bar: 'baz' } }
  const c = { foo: ['bar', 'baz'] }

  expect(deleteProperty(a, 'foo.bar')).toBe(true)
  expect(deleteProperty(b, 'foo.bar.baz')).toBe(false)
  expect(deleteProperty(c, 'foo.1')).toBe(true)

  expect(a).toEqual({ foo: {} })
  expect(b).toEqual({ foo: { bar: 'baz' } })
  expect(c).toEqual({ foo: ['bar'] })
})

test('anonymize object', () => {
  expect(anonymizeObject({ foo: 'bar' })).toEqual({ foo: 'string' })
  expect(anonymizeObject({ foo: 'bar', baz: 1 })).toEqual({ foo: 'string', baz: 'number' })
  expect(anonymizeObject({ foo: 1 })).toEqual({ foo: 'number' })
  expect(anonymizeObject({ foo: true })).toEqual({ foo: 'boolean' })
  expect(anonymizeObject({ foo: null })).toEqual({ foo: 'object' })
  expect(anonymizeObject({ foo: undefined })).toEqual({ foo: 'undefined' })
  expect(anonymizeObject({ foo: { bar: 'baz' } })).toEqual({ foo: { bar: 'string' } })
  expect(anonymizeObject({ foo: [1, 2, 3] })).toEqual({ foo: ['number', 'number', 'number'] })
  expect(anonymizeObject({ foo: ['foo', 1, true] })).toEqual({ foo: ['string', 'number', 'boolean'] })
  expect(anonymizeObject({ foo: [{ bar: 'baz' }] })).toEqual({ foo: [{ bar: 'string' }] })
  expect(anonymizeObject(1)).toBe(1)
  expect(anonymizeObject('foo')).toBe('foo')
})

test('clean merge', () => {
  expect(cleanMerge({ foo: 'bar' }, { bar: 'baz' })).toEqual({ foo: 'bar', bar: 'baz' })
  expect(cleanMerge({ foo: 'bar' }, { foo: 'baz' })).toEqual({ foo: 'baz' })
  expect(cleanMerge({ foo: 'bar' }, { bar: undefined })).toEqual({ foo: 'bar' })
  expect(cleanMerge({ foo: [1] }, { foo: [2] })).toEqual({ foo: [2] })
  expect(cleanMerge({ foo: undefined }, { foo: 'bar' }, { foo: undefined })).toEqual({ foo: 'bar' })
})

test('clear', () => {
  expect(clear({ foo: 'bar' })).toEqual({})
  expect(clear({ foo: 'bar', baz: 'qux' })).toEqual({})
  expect(clear({ foo: { bar: 'baz' } })).toEqual({})
  expect(clear({})).toEqual({})
  expect(clear(['foo', 'bar'])).toEqual([])
  expect(clear([])).toEqual([])
  expect(clear(null)).toEqual(null)
})

test('remap', () => {
  expect(remap({ a: 1, b: 2 }, (key, value) => [key, value * value])).toEqual({ a: 1, b: 4 })
  expect(remap({ foo: { bar: 'baz' } }, (key, { bar }) => [key, bar.toUpperCase()])).toEqual({ foo: 'BAZ' })
})

test('filter object', () => {
  expect(filterObject({ a: 1, b: 2 }, (_, value) => value % 2 === 0)).toEqual({ b: 2 })
  expect(filterObject({ foo: 'bar', baz: 'qux' }, (key) => key === 'foo')).toEqual({ foo: 'bar' })
})
