import { Op } from 'sequelize'
import { isDate } from 'util/types'
import { describe, expect, it } from 'vitest'
import type { TranslatableStringsDefinition } from '../src/runtime/translatable-strings/translatable-strings.definition'
import { isArray, searchByKeywords, toArray, uniqueArray } from '../src/runtime/utils/array'
import { isBoolean, isDefined, isFile, isNull, isRegExp, isUndefined } from '../src/runtime/utils/common'
import { foreignKeyConstraintName, indexName } from '../src/runtime/utils/database'
import { catchFirstErrorMessage, isFunction } from '../src/runtime/utils/function'
import { countDecimals, isInteger, isNumber, isPositiveInteger, isRealNumber } from '../src/runtime/utils/number'
import {
  clearObject,
  deepClone,
  deepMerge,
  deleteProperty,
  getProperty,
  isKeyOf,
  isObject,
  mergeDefaults,
  objectOmit,
  objectPick,
  setProperty,
  snakeCasePropNames,
  stringifySymbols,
} from '../src/runtime/utils/object'
import { parseQSArray } from '../src/runtime/utils/query-string'
import { slugify } from '../src/runtime/utils/slugify'
import {
  capitalize,
  extractKeywords,
  isAlphanumeric,
  isPascalCase,
  isSafeSlug,
  isSlug,
  isString,
  isUrl,
  isUrlPath,
  joinRouteParts,
  setTranslationPrefix,
  titleCase,
  uncapitalize,
} from '../src/runtime/utils/string'
import {
  extractPlaceholders,
  replacePlaceholders,
  tokenizePlaceholders,
} from '../src/runtime/utils/translatable-strings'

/*
|--------------------------------------------------------------------------
| array
|--------------------------------------------------------------------------
|
*/
describe('array utilities', () => {
  it('checks if a value is an array', () => {
    expect(isArray([])).toBe(true)
    expect(isArray(['foo'])).toBe(true)
    expect(isArray({})).toBe(false)
    expect(isArray(null)).toBe(false)
    expect(isArray(undefined)).toBe(false)
  })

  it('converts to array', () => {
    expect(toArray('foo')).toEqual(['foo'])
    expect(toArray(['foo'])).toEqual(['foo'])
    expect(toArray()).toEqual([])
    expect(toArray(null)).toEqual([])
    expect(toArray(undefined)).toEqual([])
    expect(toArray([])).toEqual([])
    expect(toArray([[]])).toEqual([[]])
  })

  it('removes duplicate values', () => {
    expect(uniqueArray(['foo', 'foo', 'bar'])).toEqual(['foo', 'bar'])
    expect(uniqueArray([])).toEqual([])
    expect(uniqueArray([null, null])).toEqual([null])
    expect(uniqueArray([{}, {}])).toEqual([{}, {}])
    expect(uniqueArray([[], []])).toEqual([[], []])
  })

  it('searches arrays by keywords', () => {
    expect(searchByKeywords(['foo', 'bar'], 'FOO')).toEqual(['foo'])
    expect(searchByKeywords([{ foo: 'foo' }, { foo: 'bar' }], 'FOO', 'foo')).toEqual([{ foo: 'foo' }])
    expect(searchByKeywords(['foo', 'bar'], 'FOO BAZ')).toEqual([])
  })
})

/*
|--------------------------------------------------------------------------
| common
|--------------------------------------------------------------------------
|
*/
describe('common utilities', () => {
  it('checks if a value is a boolean', () => {
    expect(isBoolean(true)).toBe(true)
    expect(isBoolean(false)).toBe(true)
    expect(isBoolean(1)).toBe(false)
    expect(isBoolean(0)).toBe(false)
  })

  it('checks if a value is a date object', () => {
    expect(isDate(new Date())).toBe(true)
    expect(isDate('2023-08-09')).toBe(false)
    expect(isDate(1691539200000)).toBe(false)
    expect(isDate({})).toBe(false)
  })

  it('checks if a value is defined', () => {
    expect(isDefined(0)).toBe(true)
    expect(isDefined(null)).toBe(true)
    expect(isDefined(NaN)).toBe(true)
    expect(isDefined('')).toBe(true)
    expect(isDefined(undefined)).toBe(false)
  })

  it('checks if a value is a file', () => {
    expect(isFile(new File(['foo'], 'foo.txt', { type: 'text/plain' }))).toBe(true)
    expect(isFile(new Blob(['foo'], { type: 'text/plain' }))).toBe(false)
    expect(isFile('foo')).toBe(false)
    expect(isFile({})).toBe(false)
    expect(isFile(null)).toBe(false)
  })

  it('checks if a value is `null`', () => {
    expect(isNull(null)).toBe(true)
    expect(isNull(0)).toBe(false)
    expect(isNull(undefined)).toBe(false)
    expect(isNull('')).toBe(false)
  })

  it('checks if a value is a regular expression', () => {
    expect(isRegExp(/./)).toBe(true)
    expect(isRegExp(new RegExp(''))).toBe(true)
    expect(isRegExp({})).toBe(false)
    expect(isRegExp('')).toBe(false)
  })

  it('checks if a value is `undefined`', () => {
    expect(isUndefined(undefined)).toBe(true)
    expect(isUndefined(null)).toBe(false)
    expect(isUndefined('')).toBe(false)
    expect(isUndefined(0)).toBe(false)
  })
})

/*
|--------------------------------------------------------------------------
| database
|--------------------------------------------------------------------------
|
*/
describe('database utilities', () => {
  it('generates an index name', () => {
    expect(indexName('foo', 'bar')).toBe('ix_foo_bar')
    expect(indexName('foo', 'bar', true)).toBe('ux_foo_bar')
    expect(indexName('foo', ['bar', 'baz'])).toBe('cx_foo_bar_baz')
    expect(indexName('foo', ['bar', 'baz'], true)).toBe('uc_foo_bar_baz')
    expect(indexName('very_long_table_name_with_less_than_63_character', ['foo', 'bar', 'baz'])).toBe(
      'cx_very_long_table_name_with_less_than_63_character_foo_bar_baz',
    )
    expect(indexName('very_long_table_name_with_less_than_63_character', ['foo', 'bar', 'baz', 'qux'])).toHaveLength(63)
    expect(indexName('very_long_table_name_with_less_than_63_character', ['foo', 'bar', 'baz', 'qux'])).toBe(
      indexName('very_long_table_name_with_less_than_63_character', ['foo', 'bar', 'baz', 'qux']),
    )
  })

  it('generates a foreign key constraint name', () => {
    expect(foreignKeyConstraintName('foo', 'bar')).toBe('fk_foo_bar')
    expect(foreignKeyConstraintName('very_long_table_name_with_less_than_64_character', 'elevenchars')).toBe(
      'fk_very_long_table_name_with_less_than_64_character_elevenchars',
    )
    expect(foreignKeyConstraintName('very_long_table_name_with_less_than_64_character', 'twelve_chars')).toHaveLength(
      63,
    )
    expect(foreignKeyConstraintName('very_long_table_name_with_less_than_64_character', 'twelve_chars')).toBe(
      foreignKeyConstraintName('very_long_table_name_with_less_than_64_character', 'twelve_chars'),
    )
  })
})

/*
|--------------------------------------------------------------------------
| function
|--------------------------------------------------------------------------
|
*/
describe('function utilities', () => {
  it('catches all errors in groups', async () => {
    expect(
      await catchFirstErrorMessage({
        foo: [
          () => null,
          () => {
            throw new Error('fooError')
          },
        ],
        bar: [() => null],
      }),
    ).toEqual({ foo: 'fooError' })
    expect(await catchFirstErrorMessage({ foo: [() => null] })).toEqual({})
    expect(await catchFirstErrorMessage({ foo: [] })).toEqual({})
    expect(await catchFirstErrorMessage({})).toEqual({})
    expect(
      await catchFirstErrorMessage({
        foo: [
          async () => {
            await new Promise<void>((resolve) => setTimeout(resolve, 1))
            throw new Error('fooError')
          },
        ],
      }),
    ).toEqual({ foo: 'fooError' })
  })

  it('checks if a value is a function', () => {
    expect(isFunction(() => null)).toBe(true)
    expect(isFunction({})).toBe(false)
    expect(isFunction(null)).toBe(false)
  })
})

/*
|--------------------------------------------------------------------------
| number
|--------------------------------------------------------------------------
|
*/
describe('number utilities', () => {
  it('counts decimals', () => {
    expect(countDecimals(1.5)).toBe(1)
    expect(countDecimals(1.25)).toBe(2)
    expect(countDecimals(1.123456789)).toBe(9)
    expect(countDecimals(1)).toBe(0)
    expect(countDecimals(0)).toBe(0)
    expect(countDecimals(-1)).toBe(0)
    expect(countDecimals(NaN)).toBe(0)
    expect(countDecimals(Infinity)).toBe(0)
  })

  it('checks if a value is an integer', () => {
    expect(isInteger(1)).toBe(true)
    expect(isInteger(0)).toBe(true)
    expect(isInteger(-0)).toBe(true)
    expect(isInteger(-1)).toBe(true)
    expect(isInteger(1.5)).toBe(false)
    expect(isInteger(Infinity)).toBe(false)
    expect(isInteger(-Infinity)).toBe(false)
    expect(isInteger('1')).toBe(false)
    expect(isInteger(true)).toBe(false)
    expect(isInteger(NaN)).toBe(false)
    expect(isInteger({})).toBe(false)
    expect(isInteger([])).toBe(false)
    expect(isInteger(null)).toBe(false)
    expect(isInteger(undefined)).toBe(false)
  })

  it('checks if a value is a number', () => {
    expect(isNumber(1)).toBe(true)
    expect(isNumber(0)).toBe(true)
    expect(isNumber(-0)).toBe(true)
    expect(isNumber(-1)).toBe(true)
    expect(isNumber(1.5)).toBe(true)
    expect(isNumber(Infinity)).toBe(true)
    expect(isNumber(-Infinity)).toBe(true)
    expect(isNumber(NaN)).toBe(true)
    expect(isNumber('1')).toBe(false)
    expect(isNumber(true)).toBe(false)
    expect(isNumber({})).toBe(false)
    expect(isNumber([])).toBe(false)
    expect(isNumber(null)).toBe(false)
    expect(isNumber(undefined)).toBe(false)
  })

  it('checks if a value is a positive integer', () => {
    expect(isPositiveInteger(1)).toBe(true)
    expect(isPositiveInteger(0)).toBe(false)
    expect(isPositiveInteger(-0)).toBe(false)
    expect(isPositiveInteger(-1)).toBe(false)
    expect(isPositiveInteger(1.5)).toBe(false)
    expect(isPositiveInteger(Infinity)).toBe(false)
    expect(isPositiveInteger(-Infinity)).toBe(false)
    expect(isPositiveInteger('1')).toBe(false)
    expect(isPositiveInteger(true)).toBe(false)
    expect(isPositiveInteger(NaN)).toBe(false)
    expect(isPositiveInteger({})).toBe(false)
    expect(isPositiveInteger([])).toBe(false)
    expect(isPositiveInteger(null)).toBe(false)
    expect(isPositiveInteger(undefined)).toBe(false)
  })

  it('checks if a value is a real number', () => {
    expect(isRealNumber(1)).toBe(true)
    expect(isRealNumber(0)).toBe(true)
    expect(isRealNumber(-0)).toBe(true)
    expect(isRealNumber(-1)).toBe(true)
    expect(isRealNumber(1.5)).toBe(true)
    expect(isRealNumber(Infinity)).toBe(false)
    expect(isRealNumber(-Infinity)).toBe(false)
    expect(isRealNumber('1')).toBe(false)
    expect(isRealNumber(true)).toBe(false)
    expect(isRealNumber(NaN)).toBe(false)
    expect(isRealNumber({})).toBe(false)
    expect(isRealNumber([])).toBe(false)
    expect(isRealNumber(null)).toBe(false)
    expect(isRealNumber(undefined)).toBe(false)
  })
})

/*
|--------------------------------------------------------------------------
| object
|--------------------------------------------------------------------------
|
*/
describe('object utilities', () => {
  it('clears object', () => {
    expect(clearObject({ foo: 'bar' })).toEqual({})
    expect(clearObject({ foo: 'bar', baz: 'qux' })).toEqual({})
    expect(clearObject({ foo: { bar: 'baz' } })).toEqual({})
    expect(clearObject({})).toEqual({})
  })

  it('deep clone objects', () => {
    const original = { foo: { bar: [1, 2, 3], baz: {} } }
    const clone: any = deepClone(original)
    expect(clone).toEqual({ foo: { bar: [1, 2, 3], baz: {} } })
    expect(original === clone).toBe(false)
    clone.foo.bar.push(4)
    clone.foo.baz.qux = 'quux'
    clone.bar = 'baz'
    expect(original).toEqual({ foo: { bar: [1, 2, 3], baz: {} } })
    const fooSymbol = Symbol('foo')
    expect(deepClone({ [fooSymbol]: 'bar' })).toEqual({ [fooSymbol]: 'bar' })
    const barFunction = () => 'bar'
    expect(deepClone({ foo: barFunction })).toEqual({ foo: barFunction })
  })

  it('deep merge objects', () => {
    expect(deepMerge({ foo: { bar: 1 } }, { foo: { baz: 2 } })).toEqual({ foo: { bar: 1, baz: 2 } })
    expect(deepMerge({ foo: { bar: 1 } })).toEqual({ foo: { bar: 1 } })
    expect(deepMerge({ foo: { bar: 1 } }, {})).toEqual({ foo: { bar: 1 } })
    expect(deepMerge({ foo: 1 }, { foo: 2 })).toEqual({ foo: 2 })
    expect(deepMerge({ foo: 1 }, { bar: 2 }, { baz: 3 })).toEqual({ foo: 1, bar: 2, baz: 3 })
    const source = { bar: 2 }
    expect(deepMerge({ foo: 1 }, source)).toEqual({ foo: 1, bar: 2 })
    expect(source).toEqual({ bar: 2 })
    expect(deepMerge({})).toEqual({})
  })

  it('checks if an object has a specific key', () => {
    expect(isKeyOf({ foo: 'bar' }, 'foo')).toBe(true)
    expect(isKeyOf({ foo: 'bar' }, 'bar')).toBe(false)
  })

  it('checks if a value is a normal object', () => {
    expect(isObject({})).toBe(true)
    expect(isObject({ foo: 'bar' })).toBe(true)
    expect(isObject('')).toBe(false)
    expect(isObject(true)).toBe(false)
    expect(isObject(0)).toBe(false)
    expect(isObject([])).toBe(false)
    expect(isObject(null)).toBe(false)
    expect(isObject(Object)).toBe(false)
    expect(isObject(undefined)).toBe(false)
    expect(isObject(() => null)).toBe(false)
  })

  it('merges with default object', () => {
    expect(mergeDefaults({ foo: { bar: 1 } }, { foo: { baz: 2 } })).toEqual({ foo: { bar: 1, baz: 2 } })
    expect(mergeDefaults({ foo: [1] }, { foo: [2] })).toEqual({ foo: [1] })
  })

  it('omits object keys', () => {
    expect(objectOmit({ foo: 'bar', baz: 'qux' }, ['baz'])).toEqual({ foo: 'bar' })
    expect(objectOmit({ foo: 'bar', baz: 'qux' }, ['foo', 'baz'])).toEqual({})
    expect(objectOmit({ foo: 'bar', baz: 'qux' }, [])).toEqual({ foo: 'bar', baz: 'qux' })
    expect(objectOmit({}, ['foo'] as any)).toEqual({})
    expect(objectOmit({ foo: 'bar' }, ['bar'] as any)).toEqual({ foo: 'bar' })
    expect(objectOmit({ foo: 'bar' }, [false] as any)).toEqual({ foo: 'bar' })
  })

  it('picks object keys', () => {
    expect(objectPick({ foo: 'bar', baz: 'qux' }, ['foo'])).toEqual({ foo: 'bar' })
    expect(objectPick({ foo: 'bar', baz: 'qux' }, ['foo', 'baz'])).toEqual({ foo: 'bar', baz: 'qux' })
    expect(objectPick({ foo: 'bar', baz: 'qux' }, [])).toEqual({})
    expect(objectPick({}, ['foo'] as any)).toEqual({})
    expect(objectPick({ foo: 'bar' }, ['bar'] as any)).toEqual({})
    expect(objectPick({ foo: 'bar' }, [false] as any)).toEqual({})
  })

  it('converts prop names to snake case', () => {
    expect(snakeCasePropNames({ fooBar: 'baz' })).toEqual({ foo_bar: 'baz' })
    expect(snakeCasePropNames({ foo: { 'bar-baz': 'qux' } })).toEqual({ foo: { bar_baz: 'qux' } })
    expect(snakeCasePropNames({ _foo_bar: 'baz' })).toEqual({ _foo_bar: 'baz' })
  })

  it('stringifies symbols', () => {
    expect(stringifySymbols({ [Op.and]: [] })).toEqual({ 'Symbol(and)': [] })
    expect(stringifySymbols({ [Op.and]: [{ foo: { [Op.ne]: 'bar' } }] })).toEqual({
      'Symbol(and)': [{ foo: { 'Symbol(ne)': 'bar' } }],
    })
  })

  it('gets object property by dot notation', () => {
    expect(getProperty({ foo: { bar: 'baz' } }, 'foo.bar')).toBe('baz')
    expect(getProperty({ foo: { bar: 'baz' } }, 'foo.bar.baz')).toBe(undefined)
    expect(getProperty({ foo: ['bar', 'baz'] }, 'foo.1')).toBe('baz')
    expect(getProperty({ foo: { bar: 'baz' } }, 'foo.0')).toBe(undefined)
  })

  it('sets object property by dot notation', () => {
    expect(setProperty({ foo: { bar: 'baz' } }, 'foo.bar', 'qux')).toEqual({ foo: { bar: 'qux' } })
    expect(setProperty({ foo: { bar: 'baz' } }, 'foo.bar.baz', 'qux')).toEqual({ foo: { bar: { baz: 'qux' } } })
    expect(setProperty({ foo: ['bar', 'baz'] }, 'foo.1', 'qux')).toEqual({ foo: ['bar', 'qux'] })
    expect(setProperty({ foo: ['bar', 'baz'] }, 'foo', ['foo'])).toEqual({ foo: ['foo'] })
  })

  it('deletes object property by dot notation', () => {
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
})

/*
|--------------------------------------------------------------------------
| query string
|--------------------------------------------------------------------------
|
*/
describe('query string utilities', () => {
  it('parses array-like query string parameter', () => {
    expect(parseQSArray('foo')).toEqual(['foo'])
    expect(parseQSArray(['foo'])).toEqual(['foo'])
    expect(parseQSArray('foo,bar')).toEqual(['foo', 'bar'])
    expect(parseQSArray(['foo', 'bar'])).toEqual(['foo', 'bar'])
    expect(parseQSArray(' foo, bar ,, ,')).toEqual(['foo', 'bar'])
    expect(parseQSArray('foo,foo')).toEqual(['foo'])
    expect(parseQSArray(['foo', 'foo'])).toEqual(['foo'])
    expect(parseQSArray('')).toEqual([])
    expect(parseQSArray([])).toEqual([])
    expect(parseQSArray(' ')).toEqual([])
    expect(parseQSArray(['', ' '])).toEqual([])
    expect(parseQSArray('true,0,undefined,null,[],{}')).toEqual(['true', '0', 'undefined', 'null', '[]', '{}'])
    expect(parseQSArray([true, false, 0, 1, undefined, null, [], {}, ['foo'], { foo: 'bar' }])).toEqual([])
  })
})

/*
|--------------------------------------------------------------------------
| string
|--------------------------------------------------------------------------
|
*/
describe('string utilities', () => {
  it('capitalizes', () => {
    expect(capitalize('foo')).toBe('Foo')
    expect(capitalize('foo bar')).toBe('Foo bar')
    expect(capitalize('foo Bar')).toBe('Foo bar')
    expect(capitalize('foo Bar', false)).toBe('Foo Bar')
    expect(capitalize('Foo')).toBe('Foo')
    expect(capitalize('f')).toBe('F')
    expect(capitalize('')).toBe('')
  })

  it('extracts keywords', () => {
    expect(extractKeywords('foo')).toEqual(['foo'])
    expect(extractKeywords('foo bar')).toEqual(['foo', 'bar'])
    expect(extractKeywords(' Foo  BAR ')).toEqual(['foo', 'bar'])
    expect(extractKeywords(' ')).toEqual([])
    expect(extractKeywords(' ! ?? ')).toEqual(['!', '??'])
  })

  it('checks if a character is alphanumeric', () => {
    expect(isAlphanumeric('A')).toBe(true)
    expect(isAlphanumeric('a')).toBe(true)
    expect(isAlphanumeric('Z')).toBe(true)
    expect(isAlphanumeric('z')).toBe(true)
    expect(isAlphanumeric('0')).toBe(true)
    expect(isAlphanumeric('1')).toBe(true)
    expect(isAlphanumeric('9')).toBe(true)
    expect(isAlphanumeric('11')).toBe(true)
    expect(isAlphanumeric('1?')).toBe(true)
    expect(isAlphanumeric('?1')).toBe(false)
    expect(isAlphanumeric('')).toBe(false)
    expect(isAlphanumeric('-1')).toBe(false)
    expect(isAlphanumeric('?')).toBe(false)
    expect(isAlphanumeric(' ')).toBe(false)
    expect(isAlphanumeric('ö')).toBe(false)
    expect(isAlphanumeric('-')).toBe(false)
  })

  it('checks if a value is pascal-cased', () => {
    expect(isPascalCase('Foo')).toBe(true)
    expect(isPascalCase('FooBar')).toBe(true)
    expect(isPascalCase('FooBarBaz')).toBe(true)
    expect(isPascalCase('Foo0')).toBe(true)
    expect(isPascalCase('Foo0Bar')).toBe(true)
    expect(isPascalCase('foo')).toBe(false)
    expect(isPascalCase('-Foo')).toBe(false)
    expect(isPascalCase('Foo-')).toBe(false)
    expect(isPascalCase('Foo Bar')).toBe(false)
    expect(isPascalCase('fooBar')).toBe(false)
    expect(isPascalCase('0foo')).toBe(false)
    expect(isPascalCase('')).toBe(false)
    expect(isPascalCase({})).toBe(false)
    expect(isPascalCase(null)).toBe(false)
    expect(isPascalCase(undefined)).toBe(false)
  })

  it('checks if a value is a safe slug', () => {
    expect(isSafeSlug('foo')).toBe(true)
    expect(isSafeSlug('foo-bar')).toBe(true)
    expect(isSafeSlug('foo-bar-baz')).toBe(true)
    expect(isSafeSlug('foo-0')).toBe(true)
    expect(isSafeSlug('foo0')).toBe(true)
    expect(isSafeSlug('foo-bar-0')).toBe(true)
    expect(isSafeSlug('-foo')).toBe(false)
    expect(isSafeSlug('foo-')).toBe(false)
    expect(isSafeSlug('foo--bar')).toBe(false)
    expect(isSafeSlug('Foo')).toBe(false)
    expect(isSafeSlug('-foo-bar')).toBe(false)
    expect(isSafeSlug('foo-bar-')).toBe(false)
    expect(isSafeSlug('fooBar')).toBe(false)
    expect(isSafeSlug('0foo')).toBe(false)
    expect(isSafeSlug('0-foo-bar')).toBe(false)
    expect(isSafeSlug('')).toBe(false)
    expect(isSafeSlug({})).toBe(false)
    expect(isSafeSlug(null)).toBe(false)
    expect(isSafeSlug(undefined)).toBe(false)
  })

  it('checks if a value is a slug', () => {
    expect(isSlug('foo')).toBe(true)
    expect(isSlug('foo-bar')).toBe(true)
    expect(isSlug('foo-bar-baz')).toBe(true)
    expect(isSlug('foo-0')).toBe(true)
    expect(isSlug('foo0')).toBe(true)
    expect(isSlug('foo-bar-0')).toBe(true)
    expect(isSlug('0foo')).toBe(true)
    expect(isSlug('0-foo-bar')).toBe(true)
    expect(isSlug('-foo')).toBe(false)
    expect(isSlug('foo-')).toBe(false)
    expect(isSlug('foo--bar')).toBe(false)
    expect(isSlug('Foo')).toBe(false)
    expect(isSlug('-foo-bar')).toBe(false)
    expect(isSlug('foo-bar-')).toBe(false)
    expect(isSlug('fooBar')).toBe(false)
    expect(isSlug('')).toBe(false)
    expect(isSlug({})).toBe(false)
    expect(isSlug(null)).toBe(false)
    expect(isSlug(undefined)).toBe(false)
  })

  it('checks if a value is a string', () => {
    expect(isString('')).toBe(true)
    expect(isString('foo')).toBe(true)
    expect(isString(0)).toBe(false)
    expect(isString(true)).toBe(false)
    expect(isString({})).toBe(false)
    expect(isString([])).toBe(false)
    expect(isString(null)).toBe(false)
    expect(isString(undefined)).toBe(false)
  })

  it('checks if a value is a url', () => {
    expect(isUrl('http://foo.bar')).toBe(true)
    expect(isUrl('foo.bar')).toBe(false)
  })

  it('checks if a value is a url-safe pathname', () => {
    expect(isUrlPath('/foo')).toBe(true)
    expect(isUrlPath('/foo-bar')).toBe(true)
    expect(isUrlPath('/foo/baz')).toBe(true)
    expect(isUrlPath('/foo?bar')).toBe(false)
    expect(isUrlPath('/foo bar')).toBe(false)
    expect(isUrlPath('foo')).toBe(false)
    expect(isUrlPath('foo', true)).toBe(true)
    expect(isUrlPath('/foo', true)).toBe(true)
    expect(isUrlPath('foo/bar', true)).toBe(true)
  })

  it('joins api routes', () => {
    expect(joinRouteParts()).toBe('/')
    expect(joinRouteParts('')).toBe('/')
    expect(joinRouteParts('foo')).toBe('/foo')
    expect(joinRouteParts('foo', 'bar')).toBe('/foo/bar')
    expect(joinRouteParts('/foo/', '', 'bar/')).toBe('/foo/bar')
    expect(joinRouteParts('foo', 'bar//baz')).toBe('/foo/bar/baz')
  })

  it('sets translation prefix', () => {
    expect(setTranslationPrefix('/foo', 'de', ['en', 'de'])).toBe('/de/foo')
    expect(setTranslationPrefix('/', 'de', ['en', 'de'])).toBe('/de')
    expect(setTranslationPrefix('', 'de', ['en', 'de'])).toBe('/de')
    expect(setTranslationPrefix('/en/foo', 'de', ['en', 'de'])).toBe('/de/foo')
    expect(setTranslationPrefix('/en/foo', 'en', ['en', 'de'])).toBe('/en/foo')
    expect(setTranslationPrefix('/it/foo', 'de', ['en', 'de'])).toBe('/de/it/foo')
  })

  it('creates title cased string', () => {
    expect(titleCase('foo')).toBe('Foo')
    expect(titleCase('foo-bar')).toBe('Foo Bar')
    expect(titleCase('foo-bar', false)).toBe('Foo bar')
    expect(titleCase('fooBarBaz')).toBe('Foo Bar Baz')
    expect(titleCase('fooBarBaz', false)).toBe('Foo bar baz')
    expect(titleCase('FooBar')).toBe('Foo Bar')
    expect(titleCase('foo_bar')).toBe('Foo Bar')
    expect(titleCase('')).toBe('')
    expect(titleCase(' ')).toBe('')
    expect(titleCase(' Foo  bar ')).toBe('Foo Bar')
    expect(titleCase(null)).toBe('')
  })

  it('slugifies', () => {
    expect(slugify('Foo')).toBe('foo')
    expect(slugify('Foo bar')).toBe('foo-bar')
    expect(slugify('foo')).toBe('foo')
    expect(slugify('')).toBe('')
    expect(slugify('foo.bar')).toBe('foo.bar')
    expect(slugify('föö')).toBe('foo')
    expect(slugify('foo_bar')).toBe('foo_bar')
    expect(slugify('foo--bar')).toBe('foo-bar')
    expect(slugify('foo/bar')).toBe('foobar')
    expect(slugify('foo.. ')).toBe('foo..')
  })

  it('uncapitalizes', () => {
    expect(uncapitalize('Foo')).toBe('foo')
    expect(uncapitalize('FooBar')).toBe('fooBar')
    expect(uncapitalize('Foo bar')).toBe('foo bar')
    expect(uncapitalize('foo')).toBe('foo')
    expect(uncapitalize('F')).toBe('f')
    expect(uncapitalize('')).toBe('')
  })
})

/*
|--------------------------------------------------------------------------
| translatable strings
|--------------------------------------------------------------------------
|
*/
describe('translatable strings', () => {
  it('extracts placeholders', () => {
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

  it('replaces placeholders', () => {
    const definition: TranslatableStringsDefinition = {
      domain: 'foo',
      language: 'bar',
      strings: {
        'foo': 'foo',
        'foo $bar': { pattern: 'foo $bar', input: { bar: 'string' } },
        'foo $baz': { pattern: 'foo $baz', input: { baz: 'string' }, replacements: { baz: 'bar' } },
        '$count $entries': {
          pattern: '$count $entries',
          input: { count: 'number' },
          replacements: { entries: [{ conditions: [{ count: 1 }], output: 'entry' }, 'entries'] },
        },
        '$n $is between 0 and 10': {
          pattern: '$n $is between 0 and 10',
          input: { n: 'number' },
          replacements: { is: [{ conditions: [{ n: { gte: 0, lte: 10 } }], output: 'is' }, 'is not'] },
        },
        'foo $reg': {
          pattern: 'foo $reg',
          input: { x: 'string' },
          replacements: {
            reg: [
              { conditions: [{ x: { regexp: '[A-Z]' } }, { x: { gt: 0 } }], output: 'capitalized' },
              { conditions: [{ x: { gt: 0 } }], output: 'not capitalized' },
              'empty',
            ],
          },
        },
      },
    }
    const s = definition.strings

    expect(replacePlaceholders('foo', s)).toBe('foo')
    expect(replacePlaceholders('foo', s, { foo: 'bar' })).toBe('foo')
    expect(replacePlaceholders('bar', s)).toBe('')
    expect(replacePlaceholders('foo $bar', s, { bar: 'bar' })).toBe('foo bar')
    expect(replacePlaceholders('foo $bar', s, { bar: '' })).toBe('foo ')
    expect(replacePlaceholders('foo $bar', s, { bar: 1 })).toBe('foo 1')
    expect(replacePlaceholders('foo $bar', s, { bar: true })).toBe('foo true')
    expect(replacePlaceholders('foo $baz', s, { baz: 'baz' })).toBe('foo bar')
    expect(replacePlaceholders('$count $entries', s, { count: 0 })).toBe('0 entries')
    expect(replacePlaceholders('$count $entries', s, { count: 1 })).toBe('1 entry')
    expect(replacePlaceholders('$count $entries', s, { count: 2 })).toBe('2 entries')
    expect(replacePlaceholders('$n $is between 0 and 10', s, { n: 5 })).toBe('5 is between 0 and 10')
    expect(replacePlaceholders('$n $is between 0 and 10', s, { n: 0 })).toBe('0 is between 0 and 10')
    expect(replacePlaceholders('$n $is between 0 and 10', s, { n: 10 })).toBe('10 is between 0 and 10')
    expect(replacePlaceholders('$n $is between 0 and 10', s, { n: -1 })).toBe('-1 is not between 0 and 10')
    expect(replacePlaceholders('$n $is between 0 and 10', s, { n: 11 })).toBe('11 is not between 0 and 10')
    expect(replacePlaceholders('foo $reg', s, { x: 'A' })).toBe('foo capitalized')
    expect(replacePlaceholders('foo $reg', s, { x: 'a' })).toBe('foo not capitalized')
    expect(replacePlaceholders('foo $reg', s)).toBe('foo empty')
  })

  it('tokenizes placeholders', () => {
    expect(tokenizePlaceholders('foo $bar')).toEqual([
      { value: 'foo ', type: 'literal' },
      { value: 'bar', type: 'placeholder' },
    ])
    expect(tokenizePlaceholders('foo $$bar')).toEqual([{ value: 'foo $bar', type: 'literal' }])
    expect(tokenizePlaceholders('foo $bar baz')).toEqual([
      { value: 'foo ', type: 'literal' },
      { value: 'bar', type: 'placeholder' },
      { value: ' baz', type: 'literal' },
    ])
    expect(tokenizePlaceholders('foo $bar')).toEqual([
      { value: 'foo ', type: 'literal' },
      { value: 'bar', type: 'placeholder' },
    ])
    expect(tokenizePlaceholders('$foo bar')).toEqual([
      { value: 'foo', type: 'placeholder' },
      { value: ' bar', type: 'literal' },
    ])
    expect(tokenizePlaceholders('$foo$bar')).toEqual([
      { value: 'foo', type: 'placeholder' },
      { value: 'bar', type: 'placeholder' },
    ])
    expect(tokenizePlaceholders('foo $$bar baz')).toEqual([{ value: 'foo $bar baz', type: 'literal' }])
    expect(tokenizePlaceholders('foo $ bar baz')).toEqual([{ value: 'foo  bar baz', type: 'literal' }])
    expect(tokenizePlaceholders('foo $_bar baz')).toEqual([{ value: 'foo _bar baz', type: 'literal' }])
    expect(tokenizePlaceholders(' $fooBar baz')).toEqual([
      { value: ' ', type: 'literal' },
      { value: 'fooBar', type: 'placeholder' },
      { value: ' baz', type: 'literal' },
    ])
    expect(tokenizePlaceholders('$foo-bar baz')).toEqual([
      { value: 'foo', type: 'placeholder' },
      { value: '-bar baz', type: 'literal' },
    ])
    expect(tokenizePlaceholders('Displayed: $count $entries')).toEqual([
      { value: 'Displayed: ', type: 'literal' },
      { value: 'count', type: 'placeholder' },
      { value: ' ', type: 'literal' },
      { value: 'entries', type: 'placeholder' },
    ])
  })
})
