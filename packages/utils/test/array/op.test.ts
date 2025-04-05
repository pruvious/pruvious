import { expect, test } from 'vitest'
import { move, moveByProp, next, prev, remove, removeByProp, uniqueArray, uniqueArrayByProp } from '../../src'

test('remove from array', () => {
  const a = [1, 2, 3, 4, 5]
  const b = [1, 2, 3, 4, 5]

  const a1 = remove(3, a)
  expect(a1).toEqual([1, 2, 4, 5])
  expect(a).not.toBe(a1)

  const a2 = remove([1, 2, 3], a)
  expect(a2).toEqual([4, 5])
  expect(a).not.toBe(a2)

  const a3 = remove(6, a)
  expect(a3).toEqual([1, 2, 3, 4, 5])
  expect(a).not.toBe(a3)

  const b1 = remove(3, b, true)
  expect(b1).toEqual([1, 2, 4, 5])
  expect(b).toBe(b1)

  const b2 = remove([1, 2, 3], b, true)
  expect(b2).toEqual([4, 5])
  expect(b).toBe(b2)

  const b3 = remove(6, b, true)
  expect(b3).toEqual([4, 5])
  expect(b).toBe(b3)
})

test('remove from array by prop', () => {
  const a = [{ id: 1 }, { id: 2 }, { id: 3 }]
  const b = [{ id: 1 }, { id: 2 }, { id: 3 }]

  const a1 = removeByProp({ id: 2 }, a, 'id')
  expect(a1).toEqual([{ id: 1 }, { id: 3 }])
  expect(a).not.toBe(a1)

  const a2 = removeByProp([{ id: 1 }, { id: 2 }], a, 'id')
  expect(a2).toEqual([{ id: 3 }])
  expect(a).not.toBe(a2)

  const a3 = removeByProp({ id: 4 }, a, 'id')
  expect(a3).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
  expect(a).not.toBe(a3)

  const b1 = removeByProp({ id: 2 }, b, 'id', true)
  expect(b1).toEqual([{ id: 1 }, { id: 3 }])
  expect(b).toBe(b1)

  const b2 = removeByProp([{ id: 1 }, { id: 2 }], b, 'id', true)
  expect(b2).toEqual([{ id: 3 }])
  expect(b).toBe(b2)

  const b3 = removeByProp({ id: 4 }, b, 'id', true)
  expect(b3).toEqual([{ id: 3 }])
  expect(b).toBe(b3)
})

test('prev', () => {
  const objects = [{ id: 1 }, { id: 2 }, { id: 3 }]

  expect(prev('bar', ['foo', 'bar', 'baz'])).toBe('foo')
  expect(prev('foo', ['foo', 'bar', 'baz'])).toBe('foo')
  expect(prev('foo', ['foo', 'bar', 'baz'], { loop: true })).toBe('baz')
  expect(prev({ id: 2 }, objects, { prop: 'id' })).toBe(objects[0])
  expect(prev('baz', ['foo', 'bar'])).toBeUndefined()
  expect(prev('baz', ['foo', 'bar'], { fallback: true })).toBe('foo')
})

test('next', () => {
  const objects = [{ id: 1 }, { id: 2 }, { id: 3 }]

  expect(next('bar', ['foo', 'bar', 'baz'])).toBe('baz')
  expect(next('baz', ['foo', 'bar', 'baz'])).toBe('baz')
  expect(next('baz', ['foo', 'bar', 'baz'], { loop: true })).toBe('foo')
  expect(next({ id: 2 }, objects, { prop: 'id' })).toBe(objects[2])
  expect(next('baz', ['foo', 'bar'])).toBeUndefined()
  expect(next('baz', ['foo', 'bar'], { fallback: true })).toBe('foo')
})

test('move', () => {
  expect(move('foo', ['foo', 'bar', 'baz'], 1)).toEqual(['bar', 'foo', 'baz'])
  expect(move('baz', ['foo', 'bar', 'baz'], -1)).toEqual(['foo', 'baz', 'bar'])
  expect(move('foo', ['foo', 'bar', 'baz'], -1)).toEqual(['foo', 'bar', 'baz'])
  expect(move('baz', ['foo', 'bar', 'baz'], 1)).toEqual(['foo', 'bar', 'baz'])
  expect(move('foo', ['foo', 'bar', 'baz'], 3)).toEqual(['bar', 'baz', 'foo'])
  expect(move('baz', ['foo', 'bar', 'baz'], -3)).toEqual(['baz', 'foo', 'bar'])
  expect(move('foo', ['foo', 'bar', 'baz'], 0)).toEqual(['foo', 'bar', 'baz'])
})

test('move by prop', () => {
  const array = [{ id: 1 }, { id: 2 }, { id: 3 }]

  expect(moveByProp({ id: 1 }, [...array], 'id', 1)).toEqual([{ id: 2 }, { id: 1 }, { id: 3 }])
  expect(moveByProp({ id: 3 }, [...array], 'id', -1)).toEqual([{ id: 1 }, { id: 3 }, { id: 2 }])
  expect(moveByProp({ id: 1 }, [...array], 'id', -1)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
  expect(moveByProp({ id: 3 }, [...array], 'id', 1)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
  expect(moveByProp({ id: 1 }, [...array], 'id', 3)).toEqual([{ id: 2 }, { id: 3 }, { id: 1 }])
  expect(moveByProp({ id: 3 }, [...array], 'id', -3)).toEqual([{ id: 3 }, { id: 1 }, { id: 2 }])
  expect(moveByProp({ id: 1 }, [...array], 'id', 0)).toEqual(array)
})

test('unique array', () => {
  const array = ['foo', 'foo', 'bar']

  expect(uniqueArray(array)).toEqual(['foo', 'bar'])
  expect(uniqueArray(array)).not.toBe(array)
  expect(uniqueArray(array, true)).toBe(array)
  expect(uniqueArray([])).toEqual([])
  expect(uniqueArray([null, null])).toEqual([null])
  expect(uniqueArray([{}, {}])).toEqual([{}, {}])
  expect(uniqueArray([[], []])).toEqual([[], []])
})

test('unique array by prop', () => {
  const array = [{ id: 1 }, { id: 1 }, { id: 2 }]

  expect(uniqueArrayByProp(array, 'id')).toEqual([{ id: 1 }, { id: 2 }])
  expect(uniqueArrayByProp(array, 'id')).not.toBe(array)
  expect(uniqueArrayByProp(array, 'id', true)).toBe(array)
  expect(uniqueArrayByProp([], 'id')).toEqual([])
})
