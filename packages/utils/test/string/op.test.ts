import { expect, test } from 'vitest'
import { excerpt, extractKeywords } from '../../src'

test('extract keywords', () => {
  expect(extractKeywords('foo')).toEqual(['foo'])
  expect(extractKeywords('foo bar')).toEqual(['foo', 'bar'])
  expect(extractKeywords(' Foo  BAR ')).toEqual(['foo', 'bar'])
  expect(extractKeywords(' ')).toEqual([])
  expect(extractKeywords(' ! ?? ')).toEqual(['!', '??'])
})

test('excerpt', () => {
  expect(excerpt('Lorem ipsum dolor sit amet', { words: 3 })).toEqual('Lorem ipsum dolor')
  expect(excerpt('Lorem ipsum dolor sit amet', { characters: 10 })).toEqual('Lorem ipsu')
  expect(excerpt('Lorem ipsum dolor sit amet', { characters: 10, includeLastWord: true })).toEqual('Lorem ipsum')
  expect(excerpt('Lorem ipsum dolor sit amet', { characters: 100 })).toEqual('Lorem ipsum dolor sit amet')
  expect(excerpt('Lorem ipsum dolor sit amet', { words: 0 })).toEqual('')
  expect(excerpt('Lorem ipsum dolor sit amet', { characters: 0 })).toEqual('')
})
