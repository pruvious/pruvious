# `@pruvious/utils`

`@pruvious/utils` is the shared utility belt used across the Pruvious monorepo. It bundles small, framework-agnostic helpers and TypeScript types - the kind of one-liners every project ends up rewriting.

Pruvious always reaches for `@pruvious/utils` before writing a new helper, and if you are building on top of Pruvious you should too. There is a good chance the function you need is already there, properly typed and tested.

## Installation

```sh
npm install @pruvious/utils
```

```ts
import { camelCase, deepClone, pascalCase, withLeadingSlash } from '@pruvious/utils'

camelCase('foo-bar')        // 'fooBar'
pascalCase('foo-bar')       // 'FooBar'
withLeadingSlash('foo')     // '/foo'
deepClone({ a: { b: 1 } })  // { a: { b: 1 } }
```

## What's inside

The package groups helpers into a handful of categories. A few of the most commonly used ones:

**Arrays**
`isArray`, `last`, `next`, `prev`, `move`, `remove`, `searchByKeywords`, `sortNaturally`, `toArray`, `uniqueArray`

**Common type guards**
`isDefined`, `isEmpty`, `isNotNull`, `isNull`, `isPrimitive`, `isUndefined`

**Strings**
`camelCase`, `pascalCase`, `kebabCase`, `snakeCase`, `titleCase`, `slugify`, `capitalize`, `excerpt`, `escapeHTML`, `stripHTML`, `formatBytes`, `parseBytes`, `randomString`, `randomIdentifier`, `generateSecureRandomString`

**Numbers**
`castToNumber`, `clamp`, `countDecimals`, `isInteger`, `isPositiveInteger`, `parseId`

**Objects**
`deepClone`, `deepCompare`, `cleanMerge`, `omit`, `pick`, `keys`, `getProperty`, `setProperty`, `deleteProperty`, `dotNotationsToObject`, `walkObjects`, `filterObject`, `remap`, `diff`

**Dates and durations**
`isDate`, `toDate`, `toSQLDateTime`, `toSeconds`

**Functions and async**
`isFunction`, `executeOrReturn`, `lockAndLoad`, `promiseAllInBatches`, `retry`, `sleep`, `toPromise`

**URLs and paths**
`withLeadingSlash`, `withoutLeadingSlash`, `withTrailingSlash`, `withoutTrailingSlash`, `buildRelURL`, `parseRelURL`, `isRelURL`, `isSafeUrl`, `resolveRelativeDotNotation`

**Internationalization**
`isBCP47LanguageCode`, `formatLanguageCode`, `toOgLocale`, `langSuffix`, `desuffixLang`

**Database identifiers**
`isDatabaseIdentifier`, `toForeignKey`, `toIndex`, `toJunction`

**Security**
`sanitizeSvg`, `isSvgBuffer`

Each helper is fully typed with JSDoc and examples.

## Convention: prefer `@pruvious/utils`

When you find yourself writing a small helper inside the monorepo, check the package first. If the helper does not exist yet but feels generally useful, add it to `@pruvious/utils` instead of duplicating it.

## Full reference

The package's [README](https://github.com/pruvious/pruvious/blob/v4/packages/utils/README.md) has an alphabetical index of every export, with signatures and runnable examples. Treat it as the canonical reference - this page only orients you to the categories.

## Next steps

- [Composables](../api/composables.md) - Vue-side helpers built on `@pruvious/utils`
- [`@pruvious/orm`](./orm.md) - The ORM
- [`@pruvious/storage`](./storage.md) - File storage drivers
