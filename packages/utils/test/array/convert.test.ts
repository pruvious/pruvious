import { expect, test } from 'vitest'
import { toArray } from '../../src'

test('to array', () => {
  expect(toArray('foo')).toEqual(['foo'])
  expect(toArray(['foo'])).toEqual(['foo'])
  expect(toArray(['foo', 'bar'])).toEqual(['foo', 'bar'])
  expect(toArray('')).toEqual([''])
  expect(toArray([])).toEqual([])
  expect(toArray()).toEqual([])
})
