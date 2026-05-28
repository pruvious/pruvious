# Using the ORM

Most of the time you will interact with the database through collections and the typed query builder (`selectFrom('Articles')`, `useCollection('Articles')`, and friends). When you need to drop a level lower - to run raw SQL, manage a transaction yourself, or inspect the schema at runtime - Pruvious exposes the underlying `Database` instance from [`@pruvious/orm`](../packages/orm.md).

## When to use the ORM directly

Reach for the raw ORM when:

- You need a query that the collection-level query builder cannot express.
- You are running a one-off data migration that does not need typing.
- You want to wrap several collection operations in a single transaction.
- You are writing a maintenance job that operates on tables outside of any collection.

For everything else, prefer the higher-level query builder via collection helpers - it is typed, guarded by permissions, and triggers field validators and hooks.

## Getting the database instance

On the server, import `database()` from `#pruvious/server`:

```ts
// server/jobs/Cleanup.ts
import { database, defineJob } from '#pruvious/server'

export default defineJob({
  handler: async () => {
    const db = database()
    const rows = await db.exec(`select count(*) as count from "Articles"`)
    console.log('Total articles:', rows[0].count)
  },
})
```

`database()` returns the active [`Database`](../packages/orm.md#database-class) instance for the main connection. It is already connected and synced by the time your handlers run.

## Raw queries

Use `db.exec(sql, params)` for parameterised SQL. Parameters use `$name` placeholders and are escaped automatically:

```ts
const db = database()

// SELECT - returns an array of rows
const articles = await db.exec(
  `select id, title from "Articles" where "language" = $lang`,
  { lang: 'en' },
)

// INSERT - returns the number of affected rows
const inserted = await db.exec(
  `insert into "Tags" (name) values ($name)`,
  { name: 'announcement' },
)

// UPDATE with RETURNING - returns the rows
const updated = await db.exec(
  `update "Articles" set "title" = $title where "id" = $id returning *`,
  { title: 'New Title', id: 1 },
)

// DELETE - returns the number of affected rows
const deleted = await db.exec(`delete from "Tags" where "name" = $name`, {
  name: 'deprecated',
})
```

> [!WARNING]
> Raw queries skip Pruvious field validators, sanitizers, hooks, and permission guards. Treat the data you write yourself - especially fields that are normally validated (paths, URLs, foreign keys) - and the data you read out (it has not been populated).

## Transactions

`db.transaction(fn)` groups multiple queries into a single atomic operation. If the callback throws, everything rolls back.

```ts
import { database } from '#pruvious/server'

const db = database()

await db.transaction(async (exec) => {
  await exec(`update "Users" set "credits" = "credits" - $amount where "id" = $id`, {
    id: senderId,
    amount: 10,
  })

  await exec(`update "Users" set "credits" = "credits" + $amount where "id" = $id`, {
    id: receiverId,
    amount: 10,
  })

  // If either update fails, both are rolled back.
})
```

Transactions are supported on SQLite and PostgreSQL. **D1 does not support real transactions** - it will run the statements in order but cannot roll back. Plan for partial failures when targeting D1.

## Schema introspection and changes

The `Database` instance also exposes schema methods for runtime inspection or one-off DDL. Most apps never need these - sync handles schema changes - but they are there:

```ts
const db = database()

await db.listTables()                       // string[]
await db.listColumns('Articles')            // string[]
await db.tableExists('Articles')            // boolean
await db.columnExists('Articles', 'title')  // boolean

// Manual DDL (only when sync is disabled)
await db.createColumn('Articles', 'rating', 'numeric', true)
await db.createIndex('Articles', ['language'], false)
```

See [`@pruvious/orm`](../packages/orm.md#schema-methods) for the complete list.

## Mixing with the collection query builder

You can combine raw queries with the collection-level query builder inside the same handler. They share the same connection:

```ts
import { database, selectFrom } from '#pruvious/server'

const draftCount = await selectFrom('Articles')
  .where('status', '=', 'draft')
  .count()

const db = database()
await db.exec(`update "Stats" set "drafts" = $count where "id" = 1`, {
  count: draftCount.data,
})
```

If you need both inside a transaction, the collection-level query builder uses its own connection - drop to raw queries inside `db.transaction()` to keep everything atomic.

## Next steps

- [Database overview](./overview.md) - Drivers, sync, multiple databases
- [`@pruvious/orm` package guide](../packages/orm.md) - The full ORM API
- [REST API](../api/rest.md) - The HTTP layer on top of the ORM
