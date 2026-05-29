# @pruvious/orm

An opinionated TypeScript ORM with built-in support for [SQLite3](#sqlite), [PostgreSQL](#postgresql), and [Cloudflare D1](#cloudflare-d1).

## Installation

```sh
npm install @pruvious/orm
```

## Table of contents

- [Quick start](#quick-start)
- [Drivers](#drivers)
  - [SQLite3](#sqlite)
  - [PostgreSQL](#postgresql)
  - [Cloudflare D1](#cloudflare-d1)
- [Database options](#database-options)
- [Collections](#collections)
  - [Hooks](#hooks)
  - [Junctions (many-to-many)](#junctions)
  - [The `Options` table](#options-table)
  - [Locks](#locks)
- [Fields](#fields)
  - [Field models](#field-models)
  - [Conditional logic](#conditional-logic)
  - [Input filters](#input-filters)
- [Validators](#validators)
- [Field presets](#field-presets)
- [Sync (migrations)](#sync)
- [Schema methods](#schema-methods)
- [Raw queries](#raw-queries)
  - [Transactions](#transactions)
- [Query builder](#query-builder)
  - [INSERT](#insert)
  - [SELECT](#select)
    - [`where`](#where)
    - [`search`](#search)
    - [`groupBy`, `orderBy`, `limit`, `offset`](#order-group-limit-offset)
    - [`paged` and `paginate`](#pagination)
    - [Aggregations](#aggregations)
    - [`populate`](#populate)
    - [Raw injections](#raw-injections)
    - [Caching](#caching)
    - [Query strings](#query-strings)
  - [UPDATE](#update)
  - [DELETE](#delete)
- [Testing](#testing)

## <a id="quick-start">Quick-start</a>

A database table in this ORM is abstracted as a [Collection](#collections), and a column as a [Field](#fields). Here's an example of how to create a database connection with a simplified implementation of a users-roles schema:

```ts
import { Collection, Database, Field, textFieldModel } from '@pruvious/orm'

const db = new Database({
  driver: 'sqlite://database.sqlite',

  collections: {
    Users: new Collection({
      fields: {
        email: new Field({ model: textFieldModel(), options: {} }),
        role: new Field({ model: textFieldModel(), options: {} }),
      },
      indexes: [{ fields: ['email'], unique: true }],
      foreignKeys: [
        {
          field: 'role',
          referencedCollection: 'Roles',
          referencedField: 'name',
          action: ['ON UPDATE RESTRICT', 'ON DELETE SET NULL'],
        },
      ],
    }),
    Roles: new Collection({
      fields: {
        name: new Field({ model: textFieldModel(), options: {} })
      },
      indexes: [{ fields: ['name'], unique: true }],
    }),
  },

  sync: {
    dropNonCollectionTables: true,
    dropNonFieldColumns: true,
  },
})

await db.connect() // This will also sync the collections and fields schema

const tables = await db.listTables()
console.log(tables) // ['Options', 'Roles', 'Users']

const usersColumns = await db.listColumns('Users')
console.log(usersColumns) // ['id', 'email', 'role']

const usersIndexes = await db.listIndexes('Users')
console.log(usersIndexes) // ['UX_Users__email']

const usersForeignKeys = await db.listForeignKeys('Users')
console.log(usersForeignKeys) // ['FK_Users__role']

const rolesColumns = await db.listColumns('Roles')
console.log(rolesColumns) // ['id', 'name']

const rolesIndexes = await db.listIndexes('Roles')
console.log(rolesIndexes) // ['UX_Roles__name']

const rolesForeignKeys = await db.listForeignKeys('Roles')
console.log(rolesForeignKeys) // []
```

Once connected, use [`db.queryBuilder()`](#query-builder) to build type-safe queries, or [`db.exec()`](#raw-queries) for raw SQL.

## <a id="drivers">Drivers</a>

The `driver` option allows you to specify either a connection string or a database instance to use for executing queries. If not specified, the SQLite driver will be used as the default, which will store the database in your current working directory as `database.sqlite`.

### <a id="sqlite">SQLite</a>

The ORM uses [better-sqlite3](https://www.npmjs.com/package/better-sqlite3) to operate on SQLite databases. You can provide the following values as a `driver`:

- Connection string (e.g., `sqlite://relative/path/to/database.sqlite`)
- [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3) instance

Example with an instance:

```ts
import { Database } from '@pruvious/orm'
import SQLite from 'better-sqlite3'

const db = new Database({
  driver: new SQLite('../tmp/pruvious.sqlite'),
  // Same as `driver: 'sqlite://../tmp/pruvious.sqlite'`
})
```

### <a id="postgresql">PostgreSQL</a>

For PostgreSQL, valid `driver` values are:

- Connection string (e.g., `postgres://user:password@localhost:5432/database?ssl=true`)
  - You must install the [`pg`](https://www.npmjs.com/package/pg) package (or equivalent) as a project dependency in order to use PostgreSQL with a connection string.
  - The `PGPool` constructor must be provided in the options.
- `Pool` instance from the [`pg`](https://www.npmjs.com/package/pg) package

Example with an instance:

```ts
import { Database } from '@pruvious/orm'
import pg from 'pg'

const db = new Database({
  driver: new pg.Pool({ connectionString: 'postgres://admin:12345678@localhost:5432/pruvious' }),
  // Same as `driver: 'postgres://admin:12345678@localhost:5432/pruvious'`
})
```

### <a id="cloudflare-d1">Cloudflare D1</a>

To use D1, you must provide the D1 binding in a Cloudflare Worker as the `driver`. For more information and examples, refer to the official [Cloudflare documentation](https://developers.cloudflare.com/d1/get-started/).

Example in a Cloudflare Worker:

```ts
import { Database } from '@pruvious/orm'

export default {
  async fetch(request, env, ctx) {
    const db = new Database({
      driver: env.DB,
    })
  },
}
```

Alternatively, you can connect using the format `d1://DB_BINDING`, where `DB_BINDING` represents your D1 database binding name (usually just `DB`).

## <a id="database-options">Database options</a>

The `Database` constructor accepts the following options:

- `driver` - See [Drivers](#drivers). Defaults to `'sqlite://database.sqlite'`.
- `PGPool` - The `pg.Pool` constructor from the [`pg`](https://www.npmjs.com/package/pg) package. Required when using PostgreSQL with a connection string.
- `collections` - A key-value object of `Collection` instances (see [Collections](#collections)).
- `sync` - Controls automatic schema synchronization (see [Sync](#sync)).
- `verbose` - `true` enables full logging, `false` disables it (default), `'exec'` logs only executed SQL statements, `'sync'` logs only sync operations.
- `logger` - Custom logger function. Defaults to `console.log`.
- `i18n` - An `I18n` instance from `@pruvious/i18n` for translating error messages. If omitted, the built-in `pruvious-orm` translation strings are used.

## <a id="collections">Collections</a>

A `Collection` is an abstraction representing a database table. It must be defined with the property:

- `fields` - A key-value object of `Field` instances representing the structure of the collection.

Optional properties:

- `key` - A unique identifier used for automatic schema synchronization (database migration). This key must remain unchanged when modifying the collection schema. It defaults to the collection name if not specified.
- `indexes` - An array of database indexes to enhance query performance.
- `foreignKeys` - An array of foreign key constraints for defining relationships between collections.
- `hooks` - Functions that execute at specific points in the query lifecycle (see [Hooks](#hooks)).
- `meta` - Arbitrary metadata to attach to the collection. Available on the `Collection` instance at runtime.

Note: Many-to-many relationships are declared on the field itself using the [`junctionFieldModel`](#junctions) - they are not part of `foreignKeys`.

Example:

```ts
import { Collection, Field, textFieldModel } from '@pruvious/orm'

const Users = new Collection({
  fields: {
    email: new Field({
      model: textFieldModel(),
      required: true,
      nullable: false,
      options: {},
    }),
    name: new Field({
      model: textFieldModel(),
      options: {},
    }),
  },
})

typeof Users.TColumnNames          // 'email' | 'name'
typeof Users.TRequiredColumns      // 'email'
typeof Users.TNullableColumns      // 'name'
typeof Users.TImmutableColumns     // never
typeof Users.TAutoGeneratedColumns // never
typeof Users.TConditionalColumns   // never

typeof Users.TDataTypes.email      // 'text'
typeof Users.TDataTypes.name       // 'text'

typeof Users.TCastedTypes.email    // string
typeof Users.TCastedTypes.name     // string | null

typeof Users.TInputTypes.email     // string | number
typeof Users.TInputTypes.name      // string | number | null

typeof Users.TPopulatedTypes.email // string
typeof Users.TPopulatedTypes.name  // string | null
```

### <a id="hooks">Hooks</a>

Hooks run at specific points in the query lifecycle for a collection. Each hook is an array of callbacks:

- `beforeQueryPreparation` - Runs before the SQL query is generated from the current query builder context. Useful for injecting WHERE conditions or modifying the builder.
- `beforeQueryExecution` - Runs after the SQL is generated but before it hits the database. Receives the context and the prepared `{ query: { operation, sql, params } }`.
- `afterQueryExecution` - Runs after the database call returns and before the query builder yields its result. Receives the context plus `{ query, queryExecutionTime, rawResult, result }`.

Throwing inside `beforeQueryPreparation` or `beforeQueryExecution` aborts the query and surfaces the error as a `runtimeError` on the `QueryBuilderResult`. Avoid throwing in `afterQueryExecution` - the result has already been produced.

```ts
new Collection({
  fields: { ... },
  hooks: {
    beforeQueryPreparation: [
      ({ operation, queryBuilder }) => {
        if (operation !== 'insert') {
          queryBuilder.where('authorId', '=', currentUserId)
        }
      },
    ],
  },
})
```

### <a id="junctions">Junctions (many-to-many)</a>

Many-to-many relationships are defined by using the `junctionFieldModel` on a field. No column is added to the owning collection - instead, the ORM creates and maintains a junction table named `JN_{table}__{column}__{referencedTable}` automatically during [sync](#sync).

```ts
import { Collection, Field, junctionFieldModel, textFieldModel } from '@pruvious/orm'

{
  Events: new Collection({
    fields: {
      title: new Field({ model: textFieldModel(), required: true, options: {} }),
      // One-directional junction
      categories: new Field({ model: junctionFieldModel('Categories'), options: {} }),
      // Bi-directional junction (matches the `events` field on Users below)
      attendees: new Field({ model: junctionFieldModel('Users', 'events'), options: {} }),
    },
  }),
  Categories: new Collection({
    fields: {
      name: new Field({ model: textFieldModel(), required: true, options: {} }),
    },
    indexes: [{ fields: ['name'], unique: true }],
  }),
  Users: new Collection({
    fields: {
      email: new Field({ model: textFieldModel(), required: true, options: {} }),
      events: new Field({ model: junctionFieldModel('Events', 'attendees'), options: {} }),
    },
    indexes: [{ fields: ['email'], unique: true }],
  }),
}
```

Junction field values are arrays of related record IDs. The `junctionFieldModel` supports `minItems`, `maxItems`, `allowEmptyArray`, and a custom `populator`.

### <a id="options-table">The `Options` table</a>

The ORM automatically creates a special table called `Options` upon first connection. This table acts as a key-value store, primarily used for internal sync locks and storing schema identifiers. It can also be utilized for any other custom purposes, providing a flexible storage solution for various types of data.

```ts
import { Database } from '@pruvious/orm'

const db = new Database()
await db.connect()

await db.setOption('mySettings', { foo: 'bar' })
await db.setOptions({ mySettings: { foo: 'BAR' }, myTitle: 'BAZ' })
// Both methods return `true` if successful, `false` if not

await db.getOption('mySettings')        // { foo: 'bar' }
await db.getOption<string>('myTitle')   // 'BAZ'
await db.getOption('nonExisting')       // undefined
await db.getOptions(['myTitle'])        // { myTitle: 'BAZ' }
await db.getAllOptions()                // { mySettings: { foo: 'BAR' }, myTitle: 'BAZ' }

await db.deleteOption('mySettings')     // true
await db.deleteOptions(['nonExisting']) // 0 (no options deleted)
await db.deleteAllOptions()             // 1 (deleted 'myTitle' option)
```

Note: Option keys are validated identifiers. Keys starting with `_` are reserved for internal use (e.g. `_schemaMap`, `_lock:*`) and are filtered out of `getAllOptions()` and `deleteAllOptions()`.

### <a id="locks">Locks</a>

The `Options` table also backs a simple lock primitive. Locks are advisory - acquiring one inserts a `_lock:<key>` row, releasing it deletes that row.

```ts
await db.lock('foo')         // true once the lock is acquired
await db.isLocked('foo')     // true
await db.listLocks()         // ['foo']
await db.unlock('foo')       // true on success
await db.unlockAll()         // number of locks released
```

`lock(key, timeout = 30000, interval = 25)` retries on the given interval until the timeout is reached. Pass `timeout = 0` to wait indefinitely. On Cloudflare D1, `timeout` is not supported - the method returns `false` immediately if the lock cannot be acquired.

Locks held by a connected `Database` instance are automatically released when `close()` is called.

## <a id="fields">Fields</a>

A `Field` represents a column in a database table or an object property (nested field/subfield). It requires these properties:

- `model` - The [`FieldModel`](#field-models) instance defining the field's core configuration, including data type, default value, serializers, sanitizers, validators, and more.
- `options` - Field-specific options for the chosen `model`.

Optional properties:

- `key` - A unique identifier used for automatic schema synchronization (database migration) and collection references (e.g. in indexes and foreign keys). When defining subfields, this can be ignored. It defaults to the field name if not specified.
- `nullable` - Determines if the field can accept `null` values (defaults to `true`).
- `required` - Specifies whether the field value is mandatory when creating a collection record (defaults to `false`).
- `immutable` - Determines if the field value cannot be changed after initial creation (defaults to `false`).
- `autoGenerated` - Indicates if the field value is automatically generated. When `true`, the field is hidden in input data types.
- `default` - The default value for the field. If not specified, it's automatically derived from the `defaultValue` in the field's `model`.
- `conditionalLogic` - Determines whether the field's value is required based on the values of other fields (see [Conditional logic](#conditional-logic)).
- `dependencies` - An array of relative field paths that become required inputs whenever this field is present.
- `validators` - An array of callback functions that validate an input value for this field (see [Validators](#validators)).
- `inputFilters` - Functions that set or modify the field's input value at specific stages during INSERT or UPDATE queries (see [Input filters](#input-filters)).

```ts
import { Field, textFieldModel } from '@pruvious/orm'

const address = new Field({
  model: textFieldModel(),
  required: true,
  nullable: false,
  options: {},
})
```

### <a id="field-models">Field models</a>

Field models define the core configuration for each `Field`. They specify the field's data type, default value, serializers, sanitizers, and validators. For example, when a `Field` is marked as `required`, the field model applies appropriate validation based on its type. A `textFieldModel` with `required: true` will automatically reject empty strings, unless `allowEmptyString: true` is set in the model `options`.

This package provides several built-in field models:

- `arrayFieldModel` - Stores field values as `text` in the database and deserializes them as `Array` of primitives in JavaScript.
- `bigIntFieldModel` - Stores field values as `bigint` in the database and deserializes them as `number` in JavaScript.
- `booleanFieldModel` - Stores and deserializes field values as `boolean` both in the database and application.
- `junctionFieldModel` - Virtual top-level field that drives a many-to-many junction table (see [Junctions](#junctions)). No column is added to the owning table; values are arrays of related record IDs.
- `matrixFieldModel` - Stores field values as `text` in the database and deserializes them as `Array` of primitives. Distinguished from `arrayFieldModel` by its `matrix` data type, which marks the column as participating in matrix-style query operators.
- `numberFieldModel` - Stores field values as `numeric` in the database and deserializes them as `number` in JavaScript.
- `objectFieldModel` - Stores field values as `text` in the database and deserializes them as `object` in JavaScript.
- `repeaterFieldModel` - Stores field values as `text` in the database and deserializes them as `Array` of objects (subfields) in JavaScript.
- `structureFieldModel` - Stores field values as `text` in the database and deserializes them as `Array` of keyed objects (each item has a `$key` indicating which structure item it represents).
- `structuredObjectFieldModel` - Stores field values as `text` in the database and deserializes them as `object` with structured subfields.
- `textFieldModel` - Stores field values as `text` in the database and deserializes them as `string` in JavaScript.

Each model accepts its own options (e.g. `minLength`/`maxLength` on text, `min`/`max` on number, `minItems`/`maxItems` on arrays). Refer to the JSDoc on the function itself for the full option list.

### <a id="conditional-logic">Conditional logic</a>

A field's `conditionalLogic` option determines whether its value is treated as `required` based on other fields in the same input. Paths in the condition are relative to the current field:

- Use a plain field name or `./<field>` for a sibling.
- Use `<field>.<subfield>` for nested fields.
- Use `..` to walk up the hierarchy.
- Use `/<field>` to reference a field from the root level.

```ts
// Sibling field check
{ size: { '=': 'sm' } }

// Nested field check
{ 'address.city': { '=': 'London' } }

// Parent array length check
{ '..': { '>': 1 } }

// Root-level field check
{ '/layout': { '!=': 'default' } }

// Multiple AND conditions
{
  size: { '=': 'sm' },
  '../color': { regexp: '^(?:[a-z]+-)?blue$' },
}

// OR group
{
  orGroup: [
    { size: { '=': 'sm' } },
    { '../color': { regexp: '^red$' } },
  ],
}
```

Supported operators are `=`, `!=`, `>`, `>=`, `<`, `<=`, and `regexp`. The `regexp` value can be a string pattern or `{ pattern, flags }`.

The standalone `ConditionalLogicResolver` (importable via `@pruvious/orm/conditional-logic-resolver`) lets you evaluate the same rules outside the query builder, for example in a UI.

### <a id="input-filters">Input filters</a>

Input filters set or modify a field's value during INSERT or UPDATE queries, regardless of whether an input was provided. Three stages are available:

- `beforeInputSanitization` - Receives the raw input value.
- `beforeInputValidation` - Receives the sanitized value.
- `beforeQueryExecution` - Receives the sanitized value, runs immediately before the SQL is executed.

Each filter can be a plain function or an object with `{ order, callback }` (lower `order` runs first; default is `10`). Returning `undefined` removes the field from the input.

```ts
new Field({
  model: numberFieldModel(),
  options: {},
  inputFilters: {
    beforeQueryExecution: {
      order: 0,
      callback: (value, { context }) => (context.operation === 'insert' ? Date.now() : value),
    },
  },
})
```

## <a id="validators">Validators</a>

`@pruvious/orm` ships with a set of reusable validators for the `validators` array on a `Field`. Each is a factory that returns a `Validator` and accepts an optional custom error message (string, or a function receiving `{ _, __ }` translation helpers).

- `emailValidator()` - Requires a valid email address. Skipped when value is `null`.
- `nonEmptyValidator()` - Rejects `null`, empty string, empty array, or empty object.
- `pathValidator()` - Requires a valid URL path. Skipped on `null`.
- `richTextValidator()` - Validates that only allowed HTML marks are present (reads `marks`, `allowLineBreaks`, `links` from the field's model options).
- `timeValidator()` - Requires an integer between `0` and `86399000` (milliseconds within a day).
- `timestampValidator()` - Requires a valid JavaScript timestamp.
- `uniqueValidator(options?)` - Ensures uniqueness within a collection (or within a subfields array). Supports a `fields` array for composite uniqueness and a `caseSensitive` flag (`true` by default for `=`, `false` switches to `ilike`).
- `urlValidator()` - Requires a valid URL.

```ts
import { Field, emailValidator, textFieldModel, uniqueValidator } from '@pruvious/orm'

new Field({
  model: textFieldModel(),
  required: true,
  options: {},
  validators: [emailValidator(), uniqueValidator()],
})
```

Custom validators are regular callbacks `(value, sanitizedContextField, errors) => any`. They run after the field model's built-in validators. Throw an error or assign to `errors[path]` to flag a problem.

## <a id="field-presets">Field presets</a>

Field presets are convenience helpers that return a ready-to-use `Field`:

- `createdAtField()` - Auto-generated, immutable, non-nullable `numeric` field that stores the millisecond timestamp when a record is inserted.
- `updatedAtField()` - Auto-generated, non-nullable `numeric` field that updates to the current timestamp on every INSERT and UPDATE.

Both share an internal `_tmp._timestamp` cache key so that paired `createdAt`/`updatedAt` columns receive the same value when used together.

```ts
import { Collection, createdAtField, Field, textFieldModel, updatedAtField } from '@pruvious/orm'

new Collection({
  fields: {
    name: new Field({ model: textFieldModel(), required: true, options: {} }),
    createdAt: createdAtField(),
    updatedAt: updatedAtField(),
  },
})
```

## <a id="sync">Sync (migrations)</a>

The schema synchronization occurs by default during the initial database connection. When the sync process begins, it creates a lock named `sync` in the `Options` table to prevent interference from other app instances. The lock is released upon completion. Synchronization compares the collection and field keys from the current `Database` instance with a hidden `_schemaMap` option in the `Options` table, which may or may not exist. If both maps match, no sync is performed. The ORM handles database migrations in this order:

1. Removes existing indexes and foreign keys.
2. Renames tables with matching collection keys and identifies conflicting table names.
3. Resolves tables with conflicting names.
4. Optionally removes existing tables not in collection models.
5. Creates tables that don't exist in the database.
6. Renames columns with matching field keys and identifies conflicting column names.
7. Resolves columns with conflicting names.
8. Optionally removes existing columns not in field models.
9. Attempts to alter column type, if possible, without data loss.
10. Creates columns that don't exist.
11. Rebuilds indexes and foreign keys.
12. Creates or reuses junction tables for `junctionFieldModel` fields and removes orphaned junction tables (when `dropNonCollectionTables` is enabled).
13. Stores new identifiers in `_schemaMap`.

Migration runs as a database transaction and rolls back on errors. This is supported for SQLite and PostgreSQL, but not for Cloudflare D1 databases. For D1, errors may result in data loss, so backup before syncing.

You can fully or partially disable sync, and you can hook into the lifecycle:

```ts
import { Database } from '@pruvious/orm'

new Database({
  sync: false, // Fully disable
})

new Database({
  sync: {                           // Sync remains active
    dropNonCollectionTables: false, // Default is `true`
    dropNonFieldColumns: false,     // Default is `true`
    beforeSync: async (db) => {
      // Runs after the sync lock is acquired and before any schema changes
    },
    afterSync: async (db) => {
      // Runs once the new `_schemaMap` has been written
    },
  },
})
```

## <a id="schema-methods">Schema methods</a>

The `Database` class offers numerous methods for accessing and modifying the database schema. Most modification methods are unnecessary when the `sync` option is enabled. Here's a summary of these methods:

```ts
import { Database } from '@pruvious/orm'

const db = new Database()
await db.connect()

await db.listTables()
await db.listColumns(tableName)
await db.listIndexes(tableName)
await db.listForeignKeys(tableName)
await db.tableExists(tableName)
await db.columnExists(tableName, columnName)
await db.indexExists(tableName, indexName)
await db.foreignKeyExists(tableName, constraintName)
await db.createTable(tableName)
await db.createColumn(tableName, columnName, type, nullable)
await db.createIndex(tableName, columnNames, unique)
await db.createForeignKey(tableName, columnName, referencedTable, referencedColumn, action, transaction)
await db.createJunctionTable(tableName, columnName, referencedTable, inverseColumnName)
await db.renameTable(tableName, newTableName)
await db.renameColumn(tableName, columnName, newColumnName)
await db.changeColumnType(tableName, columnName, type, nullable)
await db.changeColumnNullable(tableName, columnName, type, nullable)
await db.dropTable(tableName)
await db.dropColumn(tableName, columnName)
await db.dropIndex(indexName)
await db.dropForeignKey(tableName, constraintName, transaction)
```

These methods are intentionally low level and do **not** sanitize the table/column names passed in - validate them yourself before calling.

## <a id="raw-queries">Raw queries</a>

The ORM provides a typed `exec` method for executing custom SQL queries with parameters. This method returns an array of rows if the query fetches data, or the number of affected rows for operations like updates or deletes.

Example:

```ts
import { Database } from '@pruvious/orm'

const db = new Database()
await db.connect()

await db.exec(`create table "Foo" (bar text)`)
// 0 (no rows affected)

await db.exec(`insert into "Foo" (bar) values ($bar)`, { bar: 'BAR' })
// 1 (one row inserted)

await db.exec(`select * from "Foo"`)
// [{ bar: 'BAR' }]

await db.exec(`update "Foo" set bar = $newValue where bar = $oldValue`, {
  newValue: 'BAR_2',
  oldValue: 'BAR'
})
// 1 (one row updated)

await db.exec(`update "Foo" set bar = $newValue where bar = $oldValue returning *`, {
  newValue: 'BAR_3',
  oldValue: 'BAR_2'
})
// [{ bar: 'BAR_3' }]

await db.exec(`delete from "Foo"`)
// 1 (one row deleted)
```

Parameters in the SQL query string should be specified using the `$param` format, beginning with a dollar sign. The second parameter of the `exec` method accepts parameter values as a key-value object. The keys in this object must correspond to the parameter names used in the SQL query. All parameter values are automatically escaped to prevent SQL injection vulnerabilities, ensuring safe usage in queries.

### <a id="transactions">Transactions</a>

Transactions are operations that group multiple database queries. They can be undone (reverted) if any part fails. Use the `transaction` method for this. It's available for SQLite and PostgreSQL, but not for D1. With D1, the `transaction` method will run queries in order without the ability to revert.

Example:

```ts
import { Database } from '@pruvious/orm'

const db = new Database()
await db.connect()

await db.transaction(async (exec) => {
  // Use the `exec()` function provided in the callback
  await exec(`create table "Users" (name text, constraint "UX_Users__name" unique (name))`)
  await exec('insert into "Users" (name) values ($name)', { name: 'Admin' })
  await exec('insert into "Users" (name) values ($name)', { name: 'Admin' })  // Duplicate, will trigger rollback!
  await exec('insert into "Users" (name) values ($name)', { name: 'Editor' }) // Won't execute due to rollback
})

await db.listTables() // ['Options']
```

## <a id="query-builder">Query builder</a>

The `Database` class offers a `queryBuilder()` method that generates a fully-typed `QueryBuilder` instance. This instance inherits schema of the defined database, enabling seamless and enjoyable data manipulation.

```ts
const qb = db.queryBuilder({ contextLanguage: 'en' })
```

`queryBuilder()` accepts an optional `contextLanguage` (defaults to `'en'`) used for translating error messages through the configured `i18n` instance.

Every query method returns a `QueryBuilderResult` with the following shape:

```ts
type QueryBuilderResult<TData, TInputErrors> =
  | { success: true;  data: TData;       runtimeError: undefined; inputErrors: undefined }
  | { success: false; data: undefined;   runtimeError: string;    inputErrors: undefined }
  | { success: false; data: undefined;   runtimeError: undefined; inputErrors: TInputErrors }
```

- `runtimeError` is set when the database call fails or a hook throws.
- `inputErrors` is set when validation rejects the input. For INSERT it's an array of `Record<string, string>` (one entry per input row, `undefined` for the ones that succeeded), for UPDATE it's a single `Record<string, string>`.

Here are some examples demonstrating how to interact with the database:

### <a id="insert">INSERT</a>

```ts
import { Database } from '@pruvious/orm'

const db = new Database({ collections: { ... } })
await db.connect()

const qb = db.queryBuilder()

const newStudents = await qb.insertInto('Students')
  .values([
    { firstName: 'Harry', lastName: 'Potter', house: 1 },
    { firstName: 'Hermione', lastName: 'Granger', house: 1 },
    { firstName: 'Draco', lastName: 'Malfoy', house: 2, prefect: true },
  ])
  .returning(['firstName', 'lastName'])
  .run()

console.log(newStudents)
// {
//   success: true,
//   data: [
//     { firstName: 'Harry', lastName: 'Potter' },
//     { firstName: 'Hermione', lastName: 'Granger' },
//     { firstName: 'Draco', lastName: 'Malfoy' },
//   ],
//   runtimeError: undefined,
//   inputErrors: undefined,
// }

const insertedBookCount = await qb.insertInto('Books')
  .values([
    { title: 'Hogwarts: A History', author: 'Bathilda Bagshot' },
    { title: 'Fantastic Beasts and Where to Find Them', author: 'Newt Scamander' },
  ])
  .run()

console.log(insertedBookCount)
// {
//   success: true,
//   data: 2,
//   runtimeError: undefined,
//   inputErrors: undefined,
// }

const failedInsert = await qb.insertInto('Spells')
  .values([{ name: 'Avada Kedavra' }])
  .returning(['name'])
  .run()

console.log(failedInsert)
// {
//   success: false,
//   data: undefined,
//   runtimeError: undefined,
//   inputErrors: [{
//     'type': 'This field is required',
//     'difficulty': 'This field is required',
//   }],
// }
```

### <a id="select">SELECT</a>

```ts
import { Database } from '@pruvious/orm'

const db = new Database({ collections: { ... } })
await db.connect()

const qb = db.queryBuilder()

const students = await qb.selectFrom('Students')
  .select(['firstName', 'lastName'])
  .all()

console.log(students)
// {
//   success: true,
//   data: [
//     { firstName: 'Harry', lastName: 'Potter' },
//     { firstName: 'Hermione', lastName: 'Granger' },
//     { firstName: 'Ron', lastName: 'Weasley' },
//     // ...
//   ],
//   runtimeError: undefined,
//   inputErrors: undefined,
// }

const houses = await qb.selectFrom('Houses')
  .selectAll()
  .all()

console.log(houses)
// {
//   success: true,
//   data: [
//     {
//       id: 1,
//       name: 'Gryffindor',
//       founder: 'Godric Gryffindor',
//       createdAt: 1724091250000,
//       updatedAt: 1724091250000,
//     },
//     {
//       id: 2,
//       name: 'Slytherin',
//       founder: 'Salazar Slytherin',
//       createdAt: 1724091250000,
//       updatedAt: 1724091250000,
//     },
//     {
//       id: 3,
//       name: 'Ravenclaw',
//       founder: 'Rowena Ravenclaw',
//       createdAt: 1724091250000,
//       updatedAt: 1724091250000,
//     },
//     {
//       id: 4,
//       name: 'Hufflepuff',
//       founder: 'Helga Hufflepuff',
//       createdAt: 1724091250000,
//       updatedAt: 1724091250000,
//     },
//   ],
//   runtimeError: undefined,
//   inputErrors: undefined,
// }

const failedSelect = await qb.selectFrom('Wands')
  .select(['wood', 'core', 'length', 'wandmaker'])
  .all()

console.log(failedSelect)
// {
//   success: false,
//   data: undefined,
//   runtimeError: "The field 'wandmaker' does not exist",
//   inputErrors: undefined,
// }
```

`SelectQueryBuilder` exposes `.all()` to fetch every matching row and `.first()` to fetch the first one (returns `null` data on no match).

#### <a id="where">`where`</a>

`where(field, operator, value)` adds a filter to the query. The set of valid operators is constrained by the field's data type:

- `text` - `=`, `!=`, `in`, `notIn`, `like`, `notLike`, `ilike`, `notIlike`
- `boolean` - `=`, `!=`
- `bigint`, `numeric` (and `id`) - `=`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `notIn`, `between`, `notBetween`
- `junction`, `matrix` - `<`, `<=`, `>`, `>=`, `includes`, `includesAny`, `excludes`, `excludesAny`

Use `whereRaw(sql, params)` for arbitrary SQL fragments and `orGroup([cb1, cb2])` for OR combinations:

```ts
await qb.selectFrom('Students')
  .where('house', '=', 1)
  .orGroup([
    (eb) => eb.where('firstName', '=', 'Harry'),
    (eb) => eb.where('firstName', '=', 'Hermione'),
  ])
  .all()
```

Use `clearWhere()` to drop all conditions.

#### <a id="search">`search`</a>

`search(keywords, fields, orderByRelevance?)` adds a case-insensitive multi-keyword match across one or more `text` fields. By default results are ordered by relevance (`'high'`). Multiple `search()` calls combine with AND logic.

```ts
await qb.selectFrom('Students')
  .search('er h', ['firstName', 'lastName'])
  .all()
```

The `maxSearchKeywords` property on the builder (default `5`) caps how many keywords are processed.

#### <a id="order-group-limit-offset">`groupBy`, `orderBy`, `limit`, `offset`</a>

```ts
await qb.selectFrom('Students')
  .selectRaw('"house", cast(count(*) as text) as "students"')
  .groupBy('house')
  .orderBy('house', 'asc', 'nullsLast')
  .limit(10)
  .offset(0)
  .all()
```

`orderBy(field, direction = 'asc', nulls = 'nullsAuto')` is chainable. `orderByRaw(sql, params)` is available for custom expressions.

#### <a id="pagination">`paged` and `paginate`</a>

`paged(page, perPage)` is shorthand for `.limit(perPage).offset((page - 1) * perPage)`. To get pagination metadata along with the rows, use `paginate()`:

```ts
const result = await qb.selectFrom('Students')
  .paged(2, 20)
  .paginate()

// result.data: { records, currentPage, perPage, lastPage, total }
```

#### <a id="aggregations">Aggregations</a>

The select builder exposes `count()`, `min(field)`, `max(field)`, `sum(field)`, and `avg(field)`. `min`/`max`/`sum`/`avg` only accept `bigint` or `numeric` fields (or `'id'`).

```ts
const studentCount = await qb.selectFrom('Students').where('house', '=', 1).count()
const avgPoints   = await qb.selectFrom('Houses').avg('points')
```

#### <a id="populate">`populate`</a>

Call `.populate()` to run the configured field populators on the result. Populators are defined on the field model (or via the `populator` option on built-in models) and can be used to resolve relations, format values, or perform any other async transformation.

```ts
await qb.selectFrom('Students')
  .select(['id', 'house'])
  .populate()
  .first()
```

#### <a id="raw-injections">Raw injections</a>

For situations where the builder doesn't cover a SQL clause, use `injectRaw(position, sql, params)`. Positions on `SelectQueryBuilder` are `afterSelectClause`, `afterFromClause`, `afterWhereClause`, `afterGroupByClause`, `afterOrderByClause`, and `afterOffsetClause`. Equivalents exist on the INSERT, UPDATE, and DELETE builders.

```ts
await qb.selectFrom('Students')
  .select(['firstName', 'lastName'])
  .injectRaw('afterSelectClause', ', "Houses"."name" as "houseName"')
  .injectRaw('afterFromClause', 'join "Houses" on "Students"."house" = "Houses"."id"')
  .all()
```

`selectRaw`, `whereRaw`, and `orderByRaw` cover the most common cases.

#### <a id="caching">Caching</a>

`useCache(cache)` shares a cache object across query executions so hooks and repeated `.all()`/`.first()`/`.count()` calls don't redo work. The cache is also passed into hooks via `context.cache`. Use `clearCache()` to reset it.

The reserved `_tmp` key is wiped before `afterQueryExecution` hooks fire - it's a safe place to stash short-lived state shared between fields (this is what `createdAtField` and `updatedAtField` use to synchronize their timestamps).

#### <a id="query-strings">Query strings</a>

Every query builder can be serialized to and from a URL-style query string via `toQueryString()` and `fromQueryString()`. The supported parameters depend on the builder, but for `SelectQueryBuilder` they include `select`, `where`, `search`, `groupBy`, `orderBy`, `orderByRelevance`, `limit`, `offset`, `page`, `perPage`, and `populate`.

```ts
const students = await qb.selectFrom('Students')
  .fromQueryString('select=firstName,lastName&where=house[=][1]')
  .all()
```

The standalone helpers (`queryStringToSelectQueryBuilderParams`, `selectQueryBuilderParamsToQueryString`, and their INSERT/UPDATE/DELETE counterparts) live under the `@pruvious/orm/query-string` entry point so they can be used without pulling in the full query builder.

### <a id="update">UPDATE</a>

```ts
import { Database } from '@pruvious/orm'

const db = new Database({ collections: { ... } })
await db.connect()

const qb = db.queryBuilder()

const updatedStudent = await qb.update('Students')
  .set({ house: 2, prefect: true })
  .where('firstName', '=', 'Harry')
  .where('lastName', '=', 'Potter')
  .returning(['firstName', 'lastName', 'house', 'prefect'])
  .run()

console.log(updatedStudent)
// {
//   success: true,
//   data: [
//     { firstName: 'Harry', lastName: 'Potter', house: 2, prefect: true },
//   ],
//   runtimeError: undefined,
//   inputErrors: undefined,
// }

const updatedBookCount = await qb.update('Books')
  .set({ author: 'Newt Scamander' })
  .where('title', '=', 'Fantastic Beasts and Where to Find Them')
  .run()

console.log(updatedBookCount)
// {
//   success: true,
//   data: 1,
//   runtimeError: undefined,
//   inputErrors: undefined,
// }

const failedUpdate = await qb.update('Spells')
  .set({ difficulty: 'Impossible' })
  .where('name', '=', 'Expelliarmus')
  .returning(['name', 'difficulty'])
  .run()

console.log(failedUpdate)
// {
//   success: false,
//   data: undefined,
//   runtimeError: undefined,
//   inputErrors: {
//     'difficulty': 'Invalid difficulty level',
//   },
// }
```

### <a id="delete">DELETE</a>

```ts
import { Database } from '@pruvious/orm'

const db = new Database({ collections: { ... } })
await db.connect()

const qb = db.queryBuilder()

const deletedStudent = await qb.deleteFrom('Students')
  .where('firstName', '=', 'Draco')
  .where('lastName', '=', 'Malfoy')
  .returning(['firstName', 'lastName'])
  .run()

console.log(deletedStudent)
// {
//   success: true,
//   data: [
//     { firstName: 'Draco', lastName: 'Malfoy' },
//   ],
//   runtimeError: undefined,
//   inputErrors: undefined,
// }

const deletedBookCount = await qb.deleteFrom('Books')
  .where('author', '=', 'Gilderoy Lockhart')
  .run()

console.log(deletedBookCount) // 7

const failedDelete = await qb.deleteFrom('Houses')
  .where('name', '=', 'Slytherin')
  .returning(['name'])
  .run()

console.log(failedDelete)
// {
//   success: false,
//   data: undefined,
//   runtimeError: 'Cannot delete a Hogwarts house',
//   inputErrors: undefined,
// }
```

## <a id="testing">Testing</a>

To run the tests, first create a local PostgreSQL user with permissions to create databases. Then, enter the user's credentials in the `.env.test` file in the root directory of the repository:

```sh
VITE_PG_USER=pruvious
VITE_PG_PASSWORD=12345678
```

You can run tests using the `pnpm test` command.

## License

This package is licensed under the [MIT License](./LICENSE).
