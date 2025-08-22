# @pruvious/utils

Compilation of JavaScript utility functions and TypeScript types.

## Installation

```sh
npm install @pruvious/utils
```

## Table of contents

- [Array](#array)
  - [clearArray](#cleararray)
  - [isArray](#isarray)
  - [last](#last)
  - [move](#move)
  - [moveByProp](#movebyprop)
  - [next](#next)
  - [nth](#nth)
  - [nthIndex](#nthindex)
  - [prev](#prev)
  - [remove](#remove)
  - [removeByProp](#removebyprop)
  - [searchByKeywords](#searchbykeywords)
  - [sortNaturally](#sortnaturally)
  - [sortNaturallyByProp](#sortnaturallybyprop)
  - [toArray](#toarray)
  - [uniqueArray](#uniquearray)
  - [uniqueArrayByProp](#uniquearraybyprop)
- [Boolean](#boolean)
  - [castToBoolean](#casttoboolean)
  - [isBoolean](#isboolean)
- [Common](#common)
  - [isDefined](#isdefined)
  - [isEmpty](#isempty)
  - [isNotNull](#isnotnull)
  - [isNull](#isnull)
  - [isPrimitive](#isprimitive)
  - [isUndefined](#isundefined)
- [Database](#database)
  - [isDatabaseIdentifier](#isdatabaseidentifier)
  - [toForeignKey](#toforeignkey)
  - [toIndex](#toindex)
- [Date](#date)
  - [isDate](#isdate)
  - [toDate](#todate)
  - [toSeconds](#toseconds)
  - [toSQLDateTime](#tosqldatetime)
- [Function](#function)
  - [executeOrReturn](#executeorreturn)
  - [isFunction](#isfunction)
  - [lockAndLoad](#lockandload)
  - [promiseAllInBatches](#promiseallinbatches)
  - [retry](#retry)
  - [toPromise](#topromise)
- [Misc](#misc)
  - [blurActiveElement](#bluractiveelement)
  - [deselectAll](#deselectall)
  - [isDescendant](#isdescendant)
  - [resolveRelativeDotNotation](#resolverelativedotnotation)
  - [sleep](#sleep)
  - [withLeadingSlash](#withleadingslash)
  - [withoutLeadingSlash](#withoutleadingslash)
  - [withoutTrailingSlash](#withouttrailingslash)
  - [withTrailingSlash](#withtrailingslash)
- [Number](#number)
  - [castToNumber](#casttonumber)
  - [clamp](#clamp)
  - [countDecimals](#countdecimals)
  - [isBigInt](#isbigint)
  - [isInteger](#isinteger)
  - [isNumber](#isnumber)
  - [isPositiveInteger](#ispositiveinteger)
  - [isRealNumber](#isrealnumber)
  - [leadingZeros](#leadingzeros)
  - [parseId](#parseid)
- [Object](#object)
  - [anonymizeObject](#anonymizeobject)
  - [cleanMerge](#cleanmerge)
  - [clear](#clear)
  - [convertDotToBracket](#convertdottobracket)
  - [deepClone](#deepclone)
  - [deepCompare](#deepcompare)
  - [deleteProperty](#deleteproperty)
  - [diff](#diff)
  - [dotNotationsToObject](#dotnotationstoobject)
  - [filterObject](#filterobject)
  - [firstKey](#firstkey)
  - [getProperty](#getproperty)
  - [invertMap](#invertmap)
  - [isKeyOf](#iskeyof)
  - [isObject](#isobject)
  - [isSerializable](#isserializable)
  - [keys](#keys)
  - [lastKey](#lastkey)
  - [omit](#omit)
  - [pick](#pick)
  - [remap](#remap)
  - [setProperty](#setproperty)
  - [walkObjects](#walkobjects)
- [String](#string)
  - [camelCase](#camelcase)
  - [capitalize](#capitalize)
  - [castToNumericString](#casttonumericstring)
  - [castToString](#casttostring)
  - [excerpt](#excerpt)
  - [extractKeywords](#extractkeywords)
  - [generateSecureRandomString](#generatesecurerandomstring)
  - [isAlphanumeric](#isalphanumeric)
  - [isIdentifier](#isidentifier)
  - [isNumericString](#isnumericstring)
  - [isSlug](#isslug)
  - [isString](#isstring)
  - [isStringInteger](#isstringinteger)
  - [kebabCase](#kebabcase)
  - [normalizeCase](#normalizecase)
  - [pascalCase](#pascalcase)
  - [randomIdentifier](#randomidentifier)
  - [randomString](#randomstring)
  - [slugify](#slugify)
  - [snakeCase](#snakecase)
  - [titleCase](#titlecase)
  - [uniqueTrim](#uniquetrim)

## <a id="array">Array</a>

### <a id="cleararray">`clearArray(array)`</a>

Removes all items from an `array`.

**Example:**

```ts
const array = [1, 2, 3]
clearArray(array)
console.log(array) // []
```

### <a id="isarray">`isArray(value)`</a>

Checks if a `value` is an array.

**Example:**

```ts
isArray([]) // true
isArray({}) // false
```

### <a id="last">`last(array)`</a>

Retrieves the last item of a non-empty array.

**Example:**

```ts
last(['foo', 'bar', 'baz']) // 'baz'
last([])                    // undefined
```

### <a id="move">`move(item, array, offset)`</a>

Moves an `item` in an `array` by a specified `offset`.

**Example:**

```ts
move('foo', ['foo', 'bar', 'baz'], 1)  // ['bar', 'foo', 'baz']
move('bar', ['foo', 'bar', 'baz'], -1) // ['bar', 'foo', 'baz']
move('foo', ['foo', 'bar', 'baz'], -1) // ['foo', 'bar', 'baz']
```

### <a id="movebyprop">`moveByProp(item, array, prop, offset)`</a>

Moves an `item` in an `array` by a specified `offset` based on a `prop`.

**Example:**

```ts
moveByProp({ id: 1 }, [{ id: 1 }, { id: 2 }], 'id', 1)  // [{ id: 2 }, { id: 1 }]
moveByProp({ id: 2 }, [{ id: 1 }, { id: 2 }], 'id', -1) // [{ id: 2 }, { id: 1 }]
moveByProp({ id: 1 }, [{ id: 1 }, { id: 2 }], 'id', -1) // [{ id: 1 }, { id: 2 }]
```

### <a id="next">`next(current, array, options)`</a>

Retrieves the item that follows the `current` item in the given `array`.

Additional options can be provided using the `options` parameter:

- `prop` - The property to compare when the `array` items are objects (default: `undefined`).
- `loop` - Whether to loop back from the first item if the next item exceeds the `array` bounds (default: `false`).
- `fallback` - Whether to return the first `array` item if the `current` item cannot be found (default: `false`).

**Example:**

```ts
// Array of strings
next('bar', ['foo', 'bar', 'baz']) // 'baz'

// Array of objects
next({ id: 2 }, [{ id: 1 }, { id: 2 }, { id: 3 }], { prop: 'id' }) // { id: 3 }

// Without loop (default)
next('bar', ['foo', 'bar']) // 'bar'

// With loop
next('bar', ['foo', 'bar'], { loop: true }) // 'foo'

// Without fallback (default)
next('baz', ['foo', 'bar']) // undefined

// With fallback
next('baz', ['foo', 'bar'], { fallback: true }) // 'foo'
```

### <a id="nth">`nth(array, n)`</a>

Retrieves the item at index `n` of an `array`.
If `n` is negative, the nth item from the end is returned.

**Example:**

```ts
nth(['foo', 'bar'], 0)  // 'foo'
nth(['foo', 'bar'], 1)  // 'bar'
nth(['foo', 'bar'], 2)  // 'foo'
nth(['foo', 'bar'], -2) // 'foo'
nth(['foo', 'bar'], -1) // 'bar'
```

### <a id="nthindex">`nthIndex(array, n)`</a>

Retrieves the normalized index at index `n` of an `array`.
If `n` is negative, the nth normalized index from the end is returned.

**Example:**

```ts
nth(['foo', 'bar'], 0)  // 0
nth(['foo', 'bar'], 1)  // 1
nth(['foo', 'bar'], 2)  // 0
nth(['foo', 'bar'], -2) // 0
nth(['foo', 'bar'], -1) // 1
```

### <a id="prev">`prev(current, array, options)`</a>

Retrieves the item that precedes the `current` item in the given `array`.

Additional options can be provided using the `options` parameter:

- `prop` - The property to compare when the `array` items are objects (default: `undefined`).
- `loop` - Whether to loop back from the last item if the previous item exceeds the `array` bounds (default: `false`).
- `fallback` - Whether to return the first `array` item if the `current` item cannot be found (default: `false`).

**Example:**

```ts
// Array of strings
prev('bar', ['foo', 'bar', 'baz']) // 'foo'

// Array of objects
prev({ id: 2 }, [{ id: 1 }, { id: 2 }, { id: 3 }], { prop: 'id' }) // { id: 1 }

// Without loop (default)
prev('foo', ['foo', 'bar']) // 'foo'

// With loop
prev('foo', ['foo', 'bar'], { loop: true }) // 'bar'

// Without fallback (default)
prev('baz', ['foo', 'bar']) // undefined

// With fallback
prev('baz', ['foo', 'bar'], { fallback: true }) // 'foo'
```

### <a id="remove">`remove(item, array, mutate)`</a>

Removes all occurrences of an `item` from an array.

- The `item` parameter can be a single value or an array of values.
- The `mutate` parameter specifies whether to modify the original array (default: `false`).

**Example:**

```ts
const array = [1, 2, 3, 4, 5]

// Without mutation (default)
remove(5, array)   // [1, 2, 3, 4]
console.log(array) // [1, 2, 3, 4, 5]

// With mutation
remove([1, 2], array, true) // [3, 4, 5]
console.log(array)          // [3, 4, 5]
```

### <a id="removebyprop">`removeByProp(item, array, prop, mutate)`</a>

Removes all occurrences of an `item` from an array based on a `prop`.

- The `item` parameter can be a single object or an array of objects.
- The `mutate` parameter specifies whether to modify the original array (default: `false`).

**Example:**

```ts
const array = [{ id: 1 }, { id: 2 }, { id: 3 }]

// Without mutation (default)
removeByProp({ id: 3 }, array, 'id') // [{ id: 1 }, { id: 2 }]
console.log(array)                   // [{ id: 1 }, { id: 2 }, { id: 3 }]

// With mutation
removeByProp([{ id: 1 }, { id: 2 }], array, 'id', true) // [{ id: 3 }]
console.log(array)                                      // [{ id: 3 }]
```

### <a id="searchbykeywords">`searchByKeywords(array, keywords, props)`</a>

Searches for items in an array based on provided keywords.
The search is case-insensitive and supports partial matches.

- `array` -    The array to search.
- `keywords` - The keywords to search for.
If a string is provided, it will be split into keywords.
If an array is provided, it will be used as is.
- `props` -    If provided, search will be performed on the specified properties of the items in the array, and items must be objects.
If not provided, items themselves are treated as strings.

**Returns** an array of items sorted by relevance.
Relevance is calculated based on the number of occurrences of the keywords in the item/property and the position of the first occurrence.

**Example:**

```ts
searchByKeywords(['foo', 'bar'], 'FOO') // ['foo']
searchByKeywords([{ foo: 'foo' }, { foo: 'bar' }], 'FOO', 'foo') // [{ foo: 'foo' }]
```

### <a id="sortnaturally">`sortNaturally(array)`</a>

Sorts an `array` in natural order.

**Example:**

```ts
sortNaturally(['11', '1']) // ['1', '11']
```

### <a id="sortnaturallybyprop">`sortNaturallyByProp(array, prop)`</a>

Sorts an `array` in natural order by a `prop`.

**Example:**

```ts
sortNaturally([{ foo: '11' }, { foo: '1' }]) // [{ foo: '1' }, { foo: '11' }]
```

### <a id="toarray">`toArray(value)`</a>

Converts a `value` to an array.

**Example:**

```ts
toArray(1)   // [1]
toArray([1]) // [1]
toArray()    // []
```

### <a id="uniquearray">`uniqueArray(array, mutate)`</a>

Removes duplicate values from an `array`.

**Example:**

```ts
uniqueArray(['foo', 'foo', 'bar']) // ['foo', 'bar']
uniqueArray([{}, {}])              // [{}, {}]
```

### <a id="uniquearraybyprop">`uniqueArrayByProp(array, prop, mutate)`</a>

Removes duplicate values from an `array` based on a `prop`.

**Example:**

```ts
uniqueArrayByProp([{ x: 1 }, { x: 1 }, { x: 2 }], 'x') // [{ x: 1 }, { x: 2 }]
```

## <a id="boolean">Boolean</a>

### <a id="casttoboolean">`castToBoolean(value)`</a>

Converts a `value` to a boolean.
If the `value` does not match any boolean-like representation, the original value is retained.

**Example:**

```ts
castToBoolean(1)       // true
castToBoolean('false') // false
castToBoolean('YES')   // true
castToBoolean(-1)      // -1
```

### <a id="isboolean">`isBoolean(value)`</a>

Checks if a `value` is a boolean.

**Example:**

```ts
isBoolean(true) // true
isBoolean('')   // false
```

## <a id="common">Common</a>

### <a id="isdefined">`isDefined(value)`</a>

Checks if a `value` is not `undefined`.

**Example:**

```ts
isDefined(undefined) // false
isDefined(null)      // true
```

### <a id="isempty">`isEmpty(value)`</a>

Checks if a `value` is empty.

**Example:**

```ts
isEmpty(0)        // true
isEmpty('')       // true
isEmpty(false)    // true
isEmpty(null)     // true
isEmpty([])       // true
isEmpty({})       // true
isEmpty(' ')      // false
isEmpty({ a: 1 }) // false
isEmpty([0])      // false
```

### <a id="isnotnull">`isNotNull(value)`</a>

Checks if a `value` is not `null`.

**Example:**

```ts
isObject(null) // false
isObject(0)    // true
```

### <a id="isnull">`isNull(value)`</a>

Checks if a `value` is `null`.

**Example:**

```ts
isObject(null) // true
isObject(0)    // false
```

### <a id="isprimitive">`isPrimitive(value)`</a>

Checks if a `value` is a primitive.

**Example:**

```ts
isPrimitive('')   // true
isPrimitive(1)    // true
isPrimitive(true) // true
isPrimitive(null) // true
isPrimitive({})   // false
isPrimitive([])   // false
```

### <a id="isundefined">`isUndefined(value)`</a>

Checks if a `value` is `undefined`.

**Example:**

```ts
isObject(undefined) // true
isObject(null)      // false
```

## <a id="database">Database</a>

### <a id="isdatabaseidentifier">`isDatabaseIdentifier(value)`</a>

Checks if a `value` is a valid database table or column name.

Caveat: The identifier must not contain double underscores.

**Example:**

```ts
isDatabaseIdentifier('Products')   // true
isDatabaseIdentifier('updatedAt')  // true
isDatabaseIdentifier('created-at') // false
isDatabaseIdentifier('created at') // false
```

### <a id="toforeignkey">`toForeignKey(table, column)`</a>

Generates a foreign key name for a database based on the provided `table` and `columns`.
If the generated name exceeds 63 characters, it will be shortened while remaining unique.

**Example:**

```ts
toForeignKey('Products', 'price') // FK_Products__price
```

### <a id="toindex">`toIndex(table, columns, unique)`</a>

Generates an index name for a database based on the provided `table` and `columns`.
If the generated name exceeds 63 characters, it will be shortened while remaining unique.
If `unique` is `true`, the index name will start with `UX` or `UC` instead of `IX` or `CX`.
By default, `unique` is `false`.

**Example:**

```ts
toIndex('Products', ['price']) // IX_Products__price
toIndex('Products', ['price'], true) // UX_Products__price
toIndex('Products', ['price', 'discount']) // CX_Products__price__discount
toIndex('Products', ['price', 'discount'], true) // UC_Products__price__discount
```

## <a id="date">Date</a>

### <a id="isdate">`isDate(value)`</a>

Checks if a `value` is a `Date` object.

**Example:**

```ts
isDate(new Date())   // true
isDate('2021-01-01') // false
```

### <a id="todate">`toDate(value)`</a>

Converts a `value` to a `Date` object.
If no `value` is provided, the current date-time is used.

**Example:**

```ts
toDate(new Date('2021-01-01T00:00:00.000Z')) // new Date('2021-01-01T00:00:00.000Z')
toDate('2021-01-01T00:00:00.000Z')           // new Date('2021-01-01T00:00:00.000Z')
toDate(1609459200000)                        // new Date('2021-01-01T00:00:00.000Z')
```

### <a id="toseconds">`toSeconds(duration)`</a>

Converts a `duration` string to seconds.

This utility function is adapted from the [`jose`](https://github.com/panva/jose/blob/main/src/lib/secs.ts) library.

**Example:**

```ts
secs('1 minute')          // 60
secs('2 hours')           // 7200
secs('3 days')            // 259200
secs('1 minute ago')      // -60
secs('1 minute from now') // 60
secs('1.5 minutes')       // 90
```

### <a id="tosqldatetime">`toSQLDateTime(value)`</a>

Converts a `value` to a SQL date-time string.
If no `value` is provided, the current date-time is used.

**Example:**

```ts
toSQLDateTime(new Date('2021-01-01T00:00:00.000Z')) // '2021-01-01 00:00:00'
toSQLDateTime('2021-01-01T00:00:00.000Z')           // '2021-01-01 00:00:00'
toSQLDateTime(1609459200000)                        // '2021-01-01 00:00:00'
```

## <a id="function">Function</a>

### <a id="executeorreturn">`executeOrReturn(fn, args)`</a>

Executes a function and returns its result, or returns the `fn` value as is if not a function.

**Example:**

```ts
executeOrReturn(() => 'foo') // 'foo'
executeOrReturn('foo')       // 'foo'

const square = (n: number) => n * n
executeOrReturn(square, 4)   // 16
```

### <a id="isfunction">`isFunction(value)`</a>

Checks if a `value` is a function.

**Example:**

```ts
isFunction(() => {}) // true
isFunction('')       // false
```

### <a id="lockandload">`lockAndLoad(lock, fn)`</a>

Calls a function only if it's not already running.
The `lock` object is used to prevent multiple calls of the same function.

**Example:**

```ts
const isFormDisabled = { value: false } // or ref(false)
const submit = lockAndLoad(isFormDisabled, async (event: Event) => { ... })
```

### <a id="promiseallinbatches">`promiseAllInBatches(promiseFns, batchSize)`</a>

Processes an array of promise-generating functions in batches.
It ensures that only a specific number of promises are running concurrently.

**Example:**

```ts
// Example of a function that returns a promise
const createDummyTask = (id: number) => () =>
new Promise<string>(resolve => {
const delay = Math.random() * 1000
setTimeout(() => {
console.log(`Task ${id} completed.`)
resolve(`Result of task ${id}`)
}, delay)
})

// Create 10 tasks
const tasks = Array.from({ length: 10 }, (_, i) => createDummyTask(i + 1))

// Run the tasks in batches of 3
promiseAllInBatches(tasks, 3)
.then(results => {
console.log('All tasks finished!')
console.log(results)
// Expected output: ['Result of task 1', 'Result of task 2', ..., 'Result of task 10']
})
.catch(console.error)
```

### <a id="retry">`retry(fn, options)`</a>

Retries a function until it resolves or the maximum number of attempts is reached.

The `options` object can be used to configure the number of attempts and delay between each attempt.
The default number of attempts is `10` and the default delay is `250` milliseconds.

**Example:**

```ts
await retry(
(resolve) => {
if (Math.random() > 0.5) {
resolve()
}
},
{ attempts: 5, delay: 100 },
)
```

### <a id="topromise">`toPromise(input)`</a>

Ensures the `input` is a `Promise`.

- If the input is a function, it is executed. Its return value is wrapped in a promise.
- If the function throws an error, a rejected promise is returned.
- If the input is already a promise, it's returned directly.
- If the input is any other value, it's wrapped in a resolved promise.

## <a id="misc">Misc</a>

### <a id="bluractiveelement">`blurActiveElement`</a>

Blurs the currently focused element.

**Example:**

```ts
console.log(document.activeElement) // `<input>`
blurActiveElement()
console.log(document.activeElement) // `<body>`
```

### <a id="deselectall">`deselectAll`</a>

Deselects all text on the page.

### <a id="isdescendant">`isDescendant(element, ancestor)`</a>

Checks if an `element` is a descendant of an `ancestor`.

**Example:**

```ts
const button = document.querySelector('...')
const header = document.querySelector('...')

isDescendant(button, header) // `true` if the button is inside the header
```

### <a id="resolverelativedotnotation">`resolveRelativeDotNotation(from, to)`</a>

Resolves a relative path using dot notation based on `from` and `to` paths.

**Example:**

```ts
resolveRelativeDotNotation('foo', 'bar')            // 'bar'
resolveRelativeDotNotation('foo', './bar')          // 'bar'
resolveRelativeDotNotation('foo.baz', 'bar')        // 'foo.bar'
resolveRelativeDotNotation('foo.baz', '/bar')       // 'bar'
resolveRelativeDotNotation('foo.0.baz', '../1.bar') // 'foo.1.bar'
resolveRelativeDotNotation('foo', '../bar')         // 'bar'
```

### <a id="sleep">`sleep(milliseconds)`</a>

Pauses execution for the specified `milliseconds`.

**Example:**

```ts
await sleep(50)
```

### <a id="withleadingslash">`withLeadingSlash(path)`</a>

Normalizes a path to have a single leading slash.

**Example:**

```ts
withLeadingSlash('foo')   // '/foo'
withLeadingSlash('/foo')  // '/foo'
withLeadingSlash('//foo') // '/foo'
```

### <a id="withoutleadingslash">`withoutLeadingSlash(path)`</a>

Removes all leading slashes from a path.

**Example:**

```ts
withoutLeadingSlash('foo')   // 'foo'
withoutLeadingSlash('/foo')  // 'foo'
withoutLeadingSlash('//foo') // 'foo'
```

### <a id="withouttrailingslash">`withoutTrailingSlash(path)`</a>

Removes all trailing slashes from a path.

**Example:**

```ts
withoutTrailingSlash('foo')   // 'foo'
withoutTrailingSlash('foo/')  // 'foo'
withoutTrailingSlash('foo//') // 'foo'
```

### <a id="withtrailingslash">`withTrailingSlash(path)`</a>

Normalizes a path to have a single trailing slash.

**Example:**

```ts
withTrailingSlash('foo')   // 'foo/'
withTrailingSlash('foo/')  // 'foo/'
withTrailingSlash('foo//') // 'foo/'
```

## <a id="number">Number</a>

### <a id="casttonumber">`castToNumber(value)`</a>

Converts a `value` to a number.
If the `value` does not match any ***real*** number-like representation, the original value is retained.

**Example:**

```ts
castToNumber(1)       // 1
castToNumber('1')     // 1
castToNumber('01.50') // 1.5
castToNumber('f00')   // 'f00'
```

### <a id="clamp">`clamp(number, min, max)`</a>

Restricts a `number` to stay within a specified range.

**Example:**

```ts
clamp(5, 0, 10)  // 5
clamp(-5, 0, 10) // 0
clamp(15, 0, 10) // 10
```

### <a id="countdecimals">`countDecimals(value)`</a>

Gets the number of decimal places in a number.

**Example:**

```ts
countDecimals(1)    // 0
countDecimals(1.5)  // 1
countDecimals(1.25) // 2
```

### <a id="isbigint">`isBigInt(value)`</a>

Checks if a `value` is a `bigint`.

**Example:**

```ts
isBigInt(1n) // true
isBigInt(1)  // false
```

### <a id="isinteger">`isInteger(value)`</a>

Checks if a `value` is an integer.

**Example:**

```ts
isInteger(1)   // true
isInteger(0)   // true
isInteger(-1)  // true
isInteger(1.5) // false
isInteger('1') // false
```

### <a id="isnumber">`isNumber(value)`</a>

Checks if a `value` is a number.

**Example:**

```ts
isNumber(1)        // true
isNumber(NaN)      // true
isNumber(Infinity) // true
isNumber('1')      // false
```

### <a id="ispositiveinteger">`isPositiveInteger(value)`</a>

Checks if a `value` is a positive integer.

**Example:**

```ts
isPositiveInteger(1)   // true
isPositiveInteger(0)   // false
isPositiveInteger(-1)  // false
isPositiveInteger(1.5) // false
isPositiveInteger('1') // false
```

### <a id="isrealnumber">`isRealNumber(value)`</a>

Checks if a `value` is a real number.

**Example:**

```ts
isRealNumber(1)   // true
isRealNumber('1') // false
isRealNumber(NaN) // false
```

### <a id="leadingzeros">`leadingZeros(number, leadingZeros)`</a>

Formats a `number` with `leadingZeros`.

**Example:**

```ts
formatWithLeadingZeros(1, 3)   // '001'
formatWithLeadingZeros(1.5, 3) // '001.5'
formatWithLeadingZeros(-1, 3)  // '-001'

### <a id="parseid">`parseId(value)`</a>

Parses an ID from a string or number.
If the value is not a positive integer, `null` is returned.

**Example:**

```ts
parseId(1)   // 1
parseId('2') // 2
parseId(0)   // null
parseId(1.5) // null
```

## <a id="object">Object</a>

### <a id="anonymizeobject">`anonymizeObject(object)`</a>

Anonymizes an `object` by replacing its primitive values with their corresponding types.
It does not modify the original `object`.

**Example:**

```ts
anonymizeObject({ foo: 'bar', baz: 1 }) // { foo: 'string', baz: 'number' }
anonymizeObject(['foo', 1, true])       // ['string', 'number', 'boolean']
anonymizeObject('foo')                  // 'foo'
```

### <a id="cleanmerge">`cleanMerge(objects)`</a>

Shallow merges multiple `objects` into a new object and removes any `undefined` values.

**Example:**

```ts
cleanMerge({ foo: 'bar' }, { bar: 'baz' })     // { foo: 'bar', bar: 'baz' }
cleanMerge({ foo: 'bar' }, { foo: 'baz' })     // { foo: 'baz' }
cleanMerge({ foo: 'bar' }, { bar: undefined }) // { foo: 'bar' }
```

### <a id="clear">`clear(object)`</a>

Removes all properties or elements from an object or array while preserving its original type.

**Example:**

```ts
clear({ foo: 'bar' }) // {}
clear(['foo', 'bar']) // []
```

### <a id="convertdottobracket">`convertDotToBracket(path)`</a>



### <a id="deepclone">`deepClone(object)`</a>

Creates a deep clone of an `object`.

Note: It does not clone functions.

**Example:**

```ts
const original = { foo: { bar: 1 } }
const clone = deepClone(original) // { foo: { bar: 1 } }
console.log(original === clone)   // false
```

### <a id="deepcompare">`deepCompare(a, b)`</a>

Deeply compares two values.

**Example:**

```ts
deepCompare({}, {})                         // true
deepCompare([1, 2], [2, 1])                 // false
deepCompare({ a: 1, b: 2 }, { b: 2, a: 1 }) // true
```

### <a id="deleteproperty">`deleteProperty(object, path)`</a>

Removes a property from an `object` using a specified `path` in dot notation.

**Example:**

```ts
deleteProperty({ foo: { bar: 'baz' }}, 'foo.bar') // true
deleteProperty({ foo: ['bar', 'baz']}, 'foo.1')   // true
deleteProperty({ foo: { bar: 'baz' }}, 'bar')     // false
```

### <a id="diff">`diff(oldObject, newObject)`</a>

Compares two objects and returns an array of objects containing the `path`, `oldValue`, and `newValue` for each change.

The `path` is a string that represents the path to reach the changed property using dot notation.

**Example:**

```ts
const oldObject = { foo: { bar: 1 }, baz: 2 }
const newObject = { foo: { bar: 2 }, baz: 3 }
const changes = diff(oldObject, newObject)
// [
//   { path: 'foo.bar', oldValue: 1, newValue: 2 },
//   { path: 'baz', oldValue: 2, newValue: 3 }
// ]
```

### <a id="dotnotationstoobject">`dotNotationsToObject(dotNotations)`</a>

Converts an object with dot notation keys into a nested object structure.

**Example:**

```ts
dotNotationsToObject({ 'foo.bar': 'baz', 'foo.baz.qux': 'quux' })
// { foo: { bar: 'baz', baz: { qux: 'quux' } } }
```

### <a id="filterobject">`filterObject(object, filter)`</a>

Filters an `object` by applying a `filter` function to each of its properties.

**Example:**

```ts
filterObject({ a: 1, b: 2 }, (key, value) => value % 2 === 0)
// { b: 2 }

filterObject({ foo: 'bar', baz: 'qux' }, (key, value) => key === 'foo')
// { foo: 'bar' }
```

### <a id="firstkey">`firstKey(object)`</a>

Returns the first key of an object, or `undefined` if the object has no keys.

**Example:**

```ts
const object = { foo: 1, bar: 2, baz: 3 }
const result = firstKey(object) // 'foo'

const emptyObject = {}
const emptyResult = firstKey(emptyObject) // undefined
```

### <a id="getproperty">`getProperty(object, path, append)`</a>

Retrieves a property from an `object` using a specified `path` in dot notation.

**Example:**

```ts
getProperty({ foo: { bar: 'baz' }}, 'foo.bar') // 'baz'
getProperty({ foo: ['bar', 'baz']}, 'foo.1')   // 'baz'
getProperty({ foo: ['bar', 'baz']}, 'foo', 1)  // 'baz'
getProperty({ foo: { bar: 'baz' }}, 'bar')     // undefined
```

### <a id="invertmap">`invertMap(object)`</a>

Creates a new object by inverting the key-value pairs of the input `object`.

**Example:**

```ts
invertMap({ foo: 'bar', baz: 'qux' }) // { bar: 'foo', qux: 'baz' }
```

### <a id="iskeyof">`isKeyOf(object, key)`</a>

Checks if a `key` is a key of an `object`.

**Example:**

```ts
isKeyOf({ foo: 1 }, 'foo') // true
isKeyOf({ foo: 1 }, 'bar') // false
```

### <a id="isobject">`isObject(value)`</a>

Checks if a `value` is a normal object.

**Example:**

```ts
isObject({})   // true
isObject([])   // false
isObject(null) // false
```

### <a id="isserializable">`isSerializable(value)`</a>

Checks if a `value` is serializable.

**Example:**

```ts
isSerializable({ foo: 'bar' })       // true
isSerializable({ foo: () => 'bar' }) // false
```

### <a id="keys">`keys(object)`</a>

Returns the names of the enumerable string properties and methods of an `object`.

**Example:**

```ts
const object = { foo: 1, bar: 2, baz: 3 }
const result = keys(object) // ['foo', 'bar', 'baz']
```

### <a id="lastkey">`lastKey(object)`</a>

Returns the last key of an object, or `undefined` if the object has no keys.

**Example:**

```ts
const object = { foo: 1, bar: 2, baz: 3 }
const result = lastKey(object) // 'baz'

const emptyObject = {}
const emptyResult = lastKey(emptyObject) // undefined
```

### <a id="omit">`omit(object, keys)`</a>

Omits the specified `keys` from an `object`.

**Example:**

```ts
const object = { foo: 1, bar: 2, baz: 3 }
const result = omit(object, ['foo', 'baz']) // { bar: 2 }
```

### <a id="pick">`pick(object, keys)`</a>

Picks the specified `keys` from an `object`.

**Example:**

```ts
const object = { foo: 1, bar: 2, baz: 3 }
const result = pick(object, ['foo', 'baz']) // { foo: 1, baz: 3 }
```

### <a id="remap">`remap(object, mapper)`</a>

Remaps an `object` by applying a `mapper` function to each of its properties.

**Example:**

```ts
remap({ a: 1, b: 2 }, (key, value) => [key, value * value])
// { a: 1, b: 4 }

remap({ foo: { bar: 'baz' }}, (key, { bar }) => [key, bar.toUpperCase()])
// { foo: 'BAZ' }
```

### <a id="setproperty">`setProperty(object, path, value)`</a>

Sets a property on an `object` to a specified `value` using a `path` in dot notation.

**Example:**

```ts
setProperty({ foo: {}}, 'foo.bar', { bar: 'baz' }) // { foo: { bar: 'baz' } }
setProperty({ foo: ['bar']}, 'foo.1', 'baz)        // { foo: ['bar', 'baz'] }
```

### <a id="walkobjects">`walkObjects(value)`</a>

Walks through an `object` and yields each object, its parent, and its path.
The path is a string that represents the path to reach the current object using dot notation.
The parent is the direct parent container (object or array) of the current object.

**Example:**

```ts
const object = { foo: { bar: 'baz' }}

for (const { object, parent, path } of walkObjects(object)) {
console.log(object, parent, path)
}

// Output:
// { foo: { bar: 'baz' }} null ''
// { bar: 'baz' } { foo: { bar: 'baz' }} foo
```

## <a id="string">String</a>

### <a id="camelcase">`camelCase(string)`</a>

Converts a `string` to camelCase.

**Example:**

```ts
camelCase('foo-bar') // 'fooBar'
camelCase('fooBAR')  // 'fooBAR'
```

### <a id="capitalize">`capitalize(string, lowercaseRest)`</a>

Capitalizes the first character of a `string`.
By default, it also converts the rest of the string to lowercase.

**Example:**

```ts
capitalize('foo')            // 'Foo'
capitalize('foo Bar')        // 'Foo bar'
capitalize('foo Bar', false) // 'Foo Bar'
```

### <a id="casttonumericstring">`castToNumericString(value)`</a>

Converts a `value` to a numeric string.
If the `value` does not match any ***real*** number-like representation, the original value is retained.

**Example:**

```ts
castToNumericString(1)       // '1'
castToNumericString('1')     // '1'
castToNumericString('01.50') // '1.5'
castToNumericString('f00')   // 'f00'
```

### <a id="casttostring">`castToString(value)`</a>

Converts a `value` to a string.
If the `value` does not match any string-like representation, the original value is retained.

Note: This function can be used to convert a number to a string.

**Example:**

```ts
castToString('foo') // 'foo'
castToString(1)     // '1'
castToString(NaN)   // NaN
castToString(true)  // true
```

### <a id="excerpt">`excerpt(string, options)`</a>

Generates an excerpt from the given `string` based on the provided `options`.
By default, it will return the first 50 words.

**Example:**

```ts
excerpt('Lorem ipsum dolor sit amet', { words: 3 }) // 'Lorem ipsum dolor'
excerpt('Lorem ipsum dolor sit amet', { characters: 10 }) // 'Lorem ipsu'
```

### <a id="extractkeywords">`extractKeywords(string)`</a>

Extracts keywords from the given `string` by splitting it into separate words and converting them to lowercase.

**Example:**

```ts
extractKeywords('foo bar')    // ['foo', 'bar']
extractKeywords(' Foo  BAR ') // ['foo', 'bar']
```

### <a id="generatesecurerandomstring">`generateSecureRandomString(length)`</a>

Generates a cryptographically secure random string.
You can specify the `length` of the secret, which defaults to `64` characters.

@throws an error if the `crypto` object is not available.

### <a id="isalphanumeric">`isAlphanumeric(character)`</a>

Checks if a single `character` is a valid alphanumeric string (A-Z, a-z, 0-9).

**Example:**

```ts
isAlphanumeric('A') // true
isAlphanumeric('1') // true
isAlphanumeric('?') // false
```

### <a id="isidentifier">`isIdentifier(value)`</a>

Checks if a `value` is a valid Schemau identifier.

**Example:**

```ts
isIdentifier('fooBar')  // true
isIdentifier('foo_bar') // true
isIdentifier('foo-bar') // false
isIdentifier('$fooBar') // false
```

### <a id="isnumericstring">`isNumericString(value)`</a>

Checks if a `value` is a numeric string.

**Example:**

```ts
isNumericString('1')   // true
isNumericString('1.5') // true
isNumericString('foo') // false
isNumericString(1)     // false
```

### <a id="isslug">`isSlug(value)`</a>

Checks if a `value` is a slug.

**Example:**

```ts
isSlug('hello-world') // true
isSlug('hello_world') // false
isSlug('Hello-World') // false
```

### <a id="isstring">`isString(value)`</a>

Checks if a `value` is a string.

**Example:**

```ts
isString('') // true
isString(1)  // false
```

### <a id="isstringinteger">`isStringInteger(value)`</a>

Checks if a `value` is a stringified integer.

**Example:**

```ts
isStringInteger('1')   // true
isStringInteger('0')   // true
isStringInteger('-1')  // true
isStringInteger('1.5') // false
isStringInteger(1)     // false
```

### <a id="kebabcase">`kebabCase(string)`</a>

Converts a `string` to kebab-case.

**Example:**

```ts
kebabCase('fooBar') // 'foo-bar'
kebabCase('fooBAR') // 'foo-bar'
```

### <a id="normalizecase">`normalizeCase(string, fn)`</a>

Splits a `string` by a casing pattern and join it with a custom function.

**Example:**

```ts
normalizeCase('foo-bar', ({ curr }) => curr.toUpperCase()) // 'FooBar'
```

### <a id="pascalcase">`pascalCase(string)`</a>

Converts a `string` to PascalCase.

**Example:**

```ts
pascalCase('foo-bar') // 'FooBar'
pascalCase('fooBAR')  // 'FooBAR'
```

### <a id="randomidentifier">`randomIdentifier(length)`</a>

Generates a unique identifier using the [`nanoid`](https://www.npmjs.com/package/nanoid) library.
The identifier is 23 characters long and contains only letters (uppercase and lowercase).

- `length` - The length of the identifier (default: 23).

**Example:**

```ts
randomIdentifier() // 'aBcDeFgHiJkLmNoPqRsTuVw'
```

### <a id="randomstring">`randomString(length)`</a>

Generates a unique identifier using the [`nanoid`](https://www.npmjs.com/package/nanoid) library.
The identifier is 23 characters long and contains letters (uppercase and lowercase) and numbers.

- `length` - The length of the identifier (default: 23).

**Example:**

```ts
randomString() // '4KRhkhoxpU2hPDvmVf4zWD9'
```

### <a id="slugify">`slugify(string)`</a>

Converts a `string` to a URL-friendly slug.

**Example:**

```ts
slugify('Hello, World!') // hello-world
```

### <a id="snakecase">`snakeCase(string)`</a>

Converts a `string` to snake_case.

**Example:**

```ts
snakeCase('fooBar') // 'foo_bar'
snakeCase('fooBAR') // 'foo_bar'
```

### <a id="titlecase">`titleCase(string, capitalizeAll)`</a>

Converts a `string` to Title Case.

By default, all words are capitalized.
Set `capitalizeAll` to `false` to only capitalize the first word.

**Example:**

```ts
titleCase('foo-bar')        // 'Foo Bar'
titleCase('foo-bar', false) // 'Foo bar'
titleCase('fooBAR')         // 'Foo BAR'
```

### <a id="uniquetrim">`uniqueTrim(string, length, separator)`</a>

Truncates a `string` to a specified `length` and append a unique hash to ensure uniqueness.
If the `string` is shorter than the `length`, it will be returned as is.
The `separator` (default: `_`) is used to separate the truncated `string` and the hash.

**Note:** The hash is generated using the [`murmurHash`](https://www.npmjs.com/package/ohash) function.
The `length` should be at least 10 characters to ensure uniqueness.

**Example:**

```ts
uniqueTrim('Hello World', 10) // Hello Wor_2708020327
```

## License

This package is licensed under the [MIT License](./LICENSE).
