import { expect, test } from 'vitest'
import { searchByKeywords } from '../../src'

test('search by keywords', () => {
  expect(searchByKeywords(['foo', 'bar'], 'FOO')).toEqual(['foo'])
  expect(searchByKeywords([{ foo: 'foo' }, { foo: 'bar' }], 'FOO', 'foo')).toEqual([{ foo: 'foo' }])
  expect(searchByKeywords(['foo', 'bar'], 'FOO BAZ')).toEqual([])
})
