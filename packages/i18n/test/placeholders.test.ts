import { expect, test } from 'vitest'
import { extractPlaceholders, replacePlaceholders, TranslatableStringsDefinition } from '../src'

test('extract placeholders', () => {
  expect(extractPlaceholders('foo $bar baz')).toEqual(['bar'])
  expect(extractPlaceholders('foo $bar')).toEqual(['bar'])
  expect(extractPlaceholders('$foo bar')).toEqual(['foo'])
  expect(extractPlaceholders('$foo$bar')).toEqual(['foo', 'bar'])
  expect(extractPlaceholders('foo $$bar baz')).toEqual([])
  expect(extractPlaceholders('foo $ bar baz')).toEqual([])
  expect(extractPlaceholders('foo $_bar baz')).toEqual([])
  expect(extractPlaceholders(' $fooBar baz')).toEqual(['fooBar'])
  expect(extractPlaceholders('$foo-bar baz')).toEqual(['foo'])
  expect(extractPlaceholders('Displayed: $count $entries')).toEqual(['count', 'entries'])
})

test('replace placeholders', () => {
  const definition: TranslatableStringsDefinition = {
    domain: 'foo',
    language: 'bar',
    strings: {
      'foo': 'foo',
      'foo $bar': {
        translation: 'foo $bar',
        input: {
          bar: 'string',
        },
      },
      'foo $baz': {
        translation: 'foo $baz',
        input: {
          baz: 'string',
        },
        replacements: {
          baz: ['bar'],
        },
      },
      '$count entries': {
        translation: '$count $entries',
        input: {
          count: 'number',
        },
        replacements: {
          entries: [{ conditions: [{ count: 1 }], output: 'entry' }, 'entries'],
        },
      },
      '$n $is between 0 and 10': {
        translation: '$n $is between 0 and 10',
        input: {
          n: 'number',
        },
        replacements: {
          is: [{ conditions: [{ n: { '>=': 0, '<=': 10 } }], output: 'is' }, 'is not'],
        },
      },
      'foo $reg': {
        translation: 'foo $reg',
        input: {
          x: 'string',
        },
        replacements: {
          reg: [
            { conditions: [{ x: { regexp: '[A-Z]' } }, { x: { '>': 0 } }], output: 'capitalized' },
            { conditions: [{ x: { '>': 0 } }], output: 'not capitalized' },
            'empty',
          ],
        },
      },
      'foo with flags $reg': {
        translation: 'foo with flags $reg',
        input: {
          x: 'string',
        },
        replacements: {
          reg: [
            {
              conditions: [{ x: { regexp: { pattern: '[a-z]', flags: 'i' } } }, { x: { '>': 0 } }],
              output: 'alphabetic',
            },
            { conditions: [{ x: { '>': 0 } }], output: 'not alphabetic' },
            'empty',
          ],
        },
      },
      '$$$usd': {
        translation: '$$$usd',
        input: {
          usd: 'number',
        },
      },
      'foo $nonExistent': {
        translation: 'foo $nonExistent',
      },
    },
  }

  const s = definition.strings

  expect(replacePlaceholders('foo', s)).toBe('foo')
  expect(replacePlaceholders('foo', s, { foo: 'bar' })).toBe('foo')
  expect(replacePlaceholders('bar', s)).toBe('bar')
  expect(replacePlaceholders('foo $bar', s, { bar: 'bar' })).toBe('foo bar')
  expect(replacePlaceholders('foo $bar', s, { bar: '' })).toBe('foo ')
  expect(replacePlaceholders('foo $bar', s, { bar: 1 })).toBe('foo 1')
  expect(replacePlaceholders('foo $bar', s, { bar: true })).toBe('foo true')
  expect(replacePlaceholders('foo $baz', s, { baz: 'baz' })).toBe('foo bar')
  expect(replacePlaceholders('$count entries', s, { count: 0 })).toBe('0 entries')
  expect(replacePlaceholders('$count entries', s, { count: 1 })).toBe('1 entry')
  expect(replacePlaceholders('$count entries', s, { count: 2 })).toBe('2 entries')
  expect(replacePlaceholders('$n $is between 0 and 10', s, { n: 5 })).toBe('5 is between 0 and 10')
  expect(replacePlaceholders('$n $is between 0 and 10', s, { n: 0 })).toBe('0 is between 0 and 10')
  expect(replacePlaceholders('$n $is between 0 and 10', s, { n: 10 })).toBe('10 is between 0 and 10')
  expect(replacePlaceholders('$n $is between 0 and 10', s, { n: -1 })).toBe('-1 is not between 0 and 10')
  expect(replacePlaceholders('$n $is between 0 and 10', s, { n: 11 })).toBe('11 is not between 0 and 10')
  expect(replacePlaceholders('foo $reg', s, { x: 'A' })).toBe('foo capitalized')
  expect(replacePlaceholders('foo $reg', s, { x: 'a' })).toBe('foo not capitalized')
  expect(replacePlaceholders('foo $reg', s, { x: '1' })).toBe('foo not capitalized')
  expect(replacePlaceholders('foo $reg', s)).toBe('foo empty')
  expect(replacePlaceholders('foo with flags $reg', s, { x: 'A' })).toBe('foo with flags alphabetic')
  expect(replacePlaceholders('foo with flags $reg', s, { x: 'a' })).toBe('foo with flags alphabetic')
  expect(replacePlaceholders('foo with flags $reg', s, { x: '1' })).toBe('foo with flags not alphabetic')
  expect(replacePlaceholders('foo with flags $reg', s)).toBe('foo with flags empty')
  expect(replacePlaceholders('$$$usd', s, { usd: 1 })).toBe('$1')
  expect(replacePlaceholders('foo $nonExistent', s)).toBe('foo $nonExistent')
  expect(replacePlaceholders('foo $nonExistent', s, { nonExistent: 'bar' })).toBe('foo $nonExistent')
})
