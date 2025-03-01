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
- [Collections](#collections)
  - [The `Options` table](#options-table)
- [Fields](#fields)
  - [Field models](#field-models)
- [Sync (migrations)](#sync)
- [Schema methods](#schema-methods)
- [Raw queries](#raw-queries)
  - [Transactions](#transactions)
- [Query builder](#query-builder)
  - [INSERT](#insert)
  - [SELECT](#select)
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

const tables = await sqlite.listTables()
console.log(tables) // ['Options', 'Roles', 'Users']

const usersColumns = await sqlite.listColumns('Users')
console.log(usersColumns) // ['id', 'email', 'role']

const usersIndexes = await sqlite.listIndexes('Users')
console.log(usersIndexes) // ['UX_Users__email']

const usersForeignKeys = await sqlite.listForeignKeys('Users')
console.log(usersForeignKeys) // ['FK_Users__role']

const rolesColumns = await sqlite.listColumns('Roles')
console.log(rolesColumns) // ['id', 'name']

const rolesIndexes = await sqlite.listIndexes('Roles')
console.log(rolesIndexes) // ['UX_Roles__name']

const rolesForeignKeys = await sqlite.listForeignKeys('Roles')
console.log(rolesForeignKeys) // []
```

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
  // Same as `driver: 'sqlite//../tmp/pruvious.sqlite'`
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

## <a id="collections">Collections</a>

A `Collection` is an abstraction representing a database table. It must be defined with the property:

- `fields` - A key-value object of `Field` instances representing the structure of the collection.

Optional properties:

- `key` - A unique identifier used for automatic schema synchronization (database migration). This key must remain unchanged when modifying the collection schema. It defaults to the collection name if not specified.
- `indexes` - An array of database indexes to enhance query performance.
- `foreignKeys` - An array of foreign key constraints for defining relationships between collections.
- `hooks` - An array of functions that execute at specific points in the collection's query lifecycle.

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
```

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

await lock('foo')                       // true (if successful)
await isLocked('foo')                   // true
await listLocks()                       // ['foo']
await unlock('foo')                     // true (if successful)
await unlockAll()                       // 0 (no locks to release)
```

## <a id="fields">Fields</a>

A `Field` represents a column in a database table or an object property (nested field/subfield). It requires these properties:

- `model` - The [`FieldModel`](#field-models) instance defining the field's core configuration, including data type, default value, serializers, sanitizers, validators, and more.
- `options` - Field-specific options for the chosen `model`.

Optional properties:

- `key` - A unique identifier used for automatic schema synchronization (database migration) and collection references (e.g. in indexes and foreign keys). When defining subfields, this can be ignored. It defaults to the field name if not specified.
- `nullable` - Determines if the field can accept `null` values (defaults to `true`).
- `required` - Specifies whether the field value is mandatory when creating a collection record (defaults to `false`).
- `immutable` - Determines if the field value cannot be changed after initial creation (defaults to `false`).
- `autoGenerated` - Indicates if the field value is automatically generated.
- `default` - The default value for the field. If not specified, it's automatically derived from the `defaultValue` in the field's `model`.
- `conditionalLogic` - Defines conditional logic for this field and determines whether the input for this field stays `required`.
- `validators` - An array of callback functions that validate an input value for this field.
- `inputFilters` - Functions that set or modify the field's input value at specific stages during INSERT or UPDATE queries.

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
- `numberFieldModel` - Stores field values as `numeric` in the database and deserializes them as `number` in JavaScript.
- `repeaterFieldModel` - Stores field values as `text` in the database and deserializes them as `Array` of objects (subfields) in JavaScript.
- `textFieldModel` - Stores field values as `text` in the database and deserializes them as `string` in JavaScript.

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
12. Stores new identifiers in `_schemaMap`.

Migration runs as a database transaction and rolls back on errors. This is supported for SQLite and PostgreSQL, but not for Cloudflare D1 databases. For D1, errors may result in data loss, so backup before syncing.

You can fully or partially disable sync. Example:

```ts
import { Database } from '@pruvious/orm'

new Database({
  sync: false, // Fully disable
})

new Database({
  sync: {                           // Sync remains active
    dropNonCollectionTables: false, // Default is `true`
    dropNonFieldColumns: false,     // Default is `true`
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
await db.indexExists(tableName, columnName)
await db.foreignKeyExists(tableName, columnName)
await db.createTable(tableName)
await db.createColumn(tableName, columnName, type, nullable)
await db.createIndex(tableName, columnNames, unique)
await db.createForeignKey(tableName, columnName, referencedTable, referencedColumn, action, transaction)
await db.renameTable(tableName, newTableName)
await db.renameColumn(tableName, columnName, newColumnName)
await db.changeColumnType(tableName, columnName, type, nullable)
await db.dropTable(tableName)
await db.dropColumn(tableName, columnName)
await db.dropIndex(indexName)
await db.dropForeignKey(tableName, constraintName, transaction)
```

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

The `Database` class offers a `queryBuilder()` method that generates a fully-typed `QueryBuilder` instance. This instance inherits schema of the defined database, enabling seamless and enjoyable data manipulation. Here are some examples demonstrating how to interact with the database:

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
  .where('name', 'Slytherin')
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
