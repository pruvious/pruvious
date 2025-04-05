import { expect, test } from 'vitest'
import { deleteProperty, getProperty, setProperty } from '../../src'

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
