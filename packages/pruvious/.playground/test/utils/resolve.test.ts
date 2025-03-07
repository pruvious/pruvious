import { expect, test } from 'vitest'
import { reduceFileNameSegments } from '../../../modules/pruvious/utils/resolve'

test('reduce file name segments', () => {
  expect(reduceFileNameSegments(['foo'])).toEqual(['Foo'])
  expect(reduceFileNameSegments(['foo', 'bar'])).toEqual(['Foo', 'Bar'])
  expect(reduceFileNameSegments(['foo', 'foo'])).toEqual(['Foo'])
  expect(reduceFileNameSegments([' foo ', 'foo', ' Foo '])).toEqual(['Foo'])
  expect(reduceFileNameSegments(['Foo', 'FOO', 'foo'])).toEqual(['Foo', 'FOO', 'Foo'])
  expect(reduceFileNameSegments(['foo', 'foo', 'FOO'])).toEqual(['Foo', 'FOO'])
  expect(reduceFileNameSegments(['foo', 'foO', 'foo'])).toEqual(['Foo', 'FoO', 'Foo'])
  expect(reduceFileNameSegments(['foo', 'foO', 'foO'])).toEqual(['Foo', 'FoO'])
  expect(reduceFileNameSegments(['foo', 'foo', 'foo', 'BAR'])).toEqual(['Foo', 'BAR'])
  expect(reduceFileNameSegments(['foo', 'fooBar'])).toEqual(['Foo', 'FooBar'])
  expect(reduceFileNameSegments(['Foo', 'fooBar', 'FooBar'])).toEqual(['Foo', 'FooBar'])
  expect(reduceFileNameSegments(['Foo', 'foo', '__Foo-_-Bar__'])).toEqual(['Foo', 'FooBar'])
  expect(reduceFileNameSegments(['fooBar', 'FooBar'])).toEqual(['FooBar'])
  expect(reduceFileNameSegments(['', 'foo', ''])).toEqual(['Foo'])

  expect(reduceFileNameSegments([], 'foo')).toEqual(['Foo'])
  expect(reduceFileNameSegments([], ' ')).toEqual([])
  expect(reduceFileNameSegments(['foo', 'Foo'], 'foo')).toEqual(['Foo'])
  expect(reduceFileNameSegments(['FOO', 'Foo'], 'foo')).toEqual(['FOO', 'Foo'])
  expect(reduceFileNameSegments(['foo', 'Foo'], 'Foo_BAR')).toEqual(['FooBAR'])
  expect(reduceFileNameSegments(['foo', 'Bar'], 'barBarBaz')).toEqual(['Foo', 'BarBarBaz'])
  expect(reduceFileNameSegments(['Foo', 'foo_bar', 'FooBar'], 'foo-bar')).toEqual(['Foo', 'FooBar'])

  expect(reduceFileNameSegments([], 'index')).toEqual([])
  expect(reduceFileNameSegments(['foo'], 'index')).toEqual(['Foo'])
  expect(reduceFileNameSegments(['foo', 'Foo'], 'index')).toEqual(['Foo'])
  expect(reduceFileNameSegments(['foo', 'bar'], 'InDeX')).toEqual(['Foo', 'Bar'])
  expect(reduceFileNameSegments(['index'], 'InDeX')).toEqual(['Index'])
})
