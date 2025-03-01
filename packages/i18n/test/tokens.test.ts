import { expect, test } from 'vitest'
import { tokenizePattern } from '../src'

test('tokenize pattern', () => {
  expect(tokenizePattern('foo $bar')).toEqual([
    { value: 'foo ', type: 'literal' },
    { value: 'bar', type: 'placeholder' },
  ])
  expect(tokenizePattern('foo $$bar')).toEqual([{ value: 'foo $bar', type: 'literal' }])
  expect(tokenizePattern('foo $bar baz')).toEqual([
    { value: 'foo ', type: 'literal' },
    { value: 'bar', type: 'placeholder' },
    { value: ' baz', type: 'literal' },
  ])
  expect(tokenizePattern('foo $bar')).toEqual([
    { value: 'foo ', type: 'literal' },
    { value: 'bar', type: 'placeholder' },
  ])
  expect(tokenizePattern('$foo bar')).toEqual([
    { value: 'foo', type: 'placeholder' },
    { value: ' bar', type: 'literal' },
  ])
  expect(tokenizePattern('$foo$bar')).toEqual([
    { value: 'foo', type: 'placeholder' },
    { value: 'bar', type: 'placeholder' },
  ])
  expect(tokenizePattern('foo $$bar baz')).toEqual([{ value: 'foo $bar baz', type: 'literal' }])
  expect(tokenizePattern('foo $ bar baz')).toEqual([{ value: 'foo  bar baz', type: 'literal' }])
  expect(tokenizePattern('foo $_bar baz')).toEqual([{ value: 'foo _bar baz', type: 'literal' }])
  expect(tokenizePattern(' $fooBar baz')).toEqual([
    { value: ' ', type: 'literal' },
    { value: 'fooBar', type: 'placeholder' },
    { value: ' baz', type: 'literal' },
  ])
  expect(tokenizePattern('$foo-bar baz')).toEqual([
    { value: 'foo', type: 'placeholder' },
    { value: '-bar baz', type: 'literal' },
  ])
  expect(tokenizePattern('Displayed: $count $entries')).toEqual([
    { value: 'Displayed: ', type: 'literal' },
    { value: 'count', type: 'placeholder' },
    { value: ' ', type: 'literal' },
    { value: 'entries', type: 'placeholder' },
  ])
})
