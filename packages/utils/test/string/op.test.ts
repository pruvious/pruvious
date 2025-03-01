import { expect, test } from 'vitest'
import { extractKeywords } from '../../src'

test('extract keywords', () => {
  expect(extractKeywords('foo')).toEqual(['foo'])
  expect(extractKeywords('foo bar')).toEqual(['foo', 'bar'])
  expect(extractKeywords(' Foo  BAR ')).toEqual(['foo', 'bar'])
  expect(extractKeywords(' ')).toEqual([])
  expect(extractKeywords(' ! ?? ')).toEqual(['!', '??'])
})
