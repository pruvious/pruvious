import { expect, test } from 'vitest'
import { isSerializable } from '../../src'

test('is serializable', async () => {
  const circularObj: any = {}
  circularObj.self = circularObj

  expect(isSerializable('foo')).toBe(true)
  expect(isSerializable('')).toBe(true)
  expect(isSerializable({})).toBe(true)
  expect(isSerializable({ foo: 'bar' })).toBe(true)
  expect(isSerializable([])).toBe(true)
  expect(isSerializable(['foo'])).toBe(true)
  expect(isSerializable(1)).toBe(true)
  expect(isSerializable(null)).toBe(true)
  expect(isSerializable(true)).toBe(true)
  expect(isSerializable(NaN)).toBe(true)
  expect(isSerializable(Infinity)).toBe(true)
  expect(isSerializable(undefined)).toBe(false)
  expect(isSerializable(() => 'foo')).toBe(false)
  expect(isSerializable(Symbol('foo'))).toBe(false)
  expect(isSerializable({ foo: () => 'bar' })).toBe(false)
  expect(isSerializable({ foo: { bar: () => 'baz' } })).toBe(false)
  expect(isSerializable([() => 'foo'])).toBe(false)
  expect(isSerializable(circularObj)).toBe(false)
})
