# Database

Pruvious is database-driven. Every collection, singleton, log entry, and cached page lives in a relational database that Pruvious manages for you through [`@pruvious/orm`](../packages/orm.md). You declare collections with field definitions, and Pruvious takes care of the schema, migrations, query building, and types.

## Supported drivers

Pruvious supports three database drivers out of the box:

| Driver | Connection string | Notes |
| :--- | :--- | :--- |
| **SQLite** | `sqlite://path/to/database.sqlite` | Default. Path is relative to the current working directory. |
| **PostgreSQL** | `postgres://user:pass@host:5432/db?ssl=true` | Requires the `pg` package as a project dependency. |
| **Cloudflare D1** | `d1://BINDING` | Used inside Cloudflare Workers. `BINDING` is the D1 binding name from `wrangler.toml`. |

> [!TIP]
> SQLite is perfect for development and small production sites. For larger workloads or multi-instance deployments, use PostgreSQL. For edge deployments on Cloudflare, use D1.

## Default behavior

Out of the box, Pruvious uses SQLite with a file called `database.sqlite` in your project root. The first time you start the dev server, Pruvious creates the file and runs the schema sync. No migrations to write, no CLI to learn.

```ts
// nuxt.config.ts - the defaults
export default defineNuxtConfig({
  extends: ['pruvious'],
  pruvious: {
    database: {
      driver: 'sqlite://database.sqlite',
      sync: true,
    },
  },
})
```

## Configuring the connection

Set the `pruvious.database` option in `nuxt.config.ts` (or via env vars in production):

```ts
export default defineNuxtConfig({
  extends: ['pruvious'],
  pruvious: {
    database: {
      driver: 'postgres://app:secret@db.example.com:5432/pruvious?ssl=true',
    },
  },
})
```

In production, prefer environment variables so you do not commit credentials:

```sh
NUXT_PRUVIOUS_DATABASE_DRIVER="postgres://app:secret@db.example.com:5432/pruvious?ssl=true"
```

See [Deployment](../deployment/overview.md) for the full list of env var names.

## Schema sync (auto-migrations)

Pruvious runs **automatic schema synchronization** when the database connects. You do not write migration files. Instead, Pruvious compares the collection definitions in your project against the live schema and:

1. Renames tables and columns when collection or field `key`s match.
2. Creates new tables for new collections.
3. Creates new columns for new fields.
4. Alters column types where it can be done without data loss.
5. Rebuilds indexes and foreign keys.
6. Optionally drops tables and columns that are no longer in your definitions.

Sync runs inside a transaction on SQLite and PostgreSQL, so a failed migration rolls back cleanly. D1 does not support transactions - back up before syncing on D1.

### Disabling or limiting sync

```ts
pruvious: {
  database: {
    // Disable sync entirely - run schema changes by hand.
    sync: false,
  },
}
```

```ts
pruvious: {
  database: {
    sync: {
      // Drop tables that are not in your collection definitions.
      dropNonCollectionTables: true,
      // Keep columns that are not in your field definitions.
      dropNonFieldColumns: false,
    },
  },
}
```

`dropNonCollectionTables` defaults to `false`, so Pruvious preserves tables you manage outside of the collection schema. `dropNonFieldColumns` defaults to `true`, so columns not declared by your fields are removed to keep tables aligned with the schema.

> [!WARNING]
> `dropNonCollectionTables: true` and the default `dropNonFieldColumns: true` are destructive: tables or columns not declared in your collections will be removed on sync. Disable them if another application writes those tables or columns, and always back up production data before deploying.

For deeper detail on the sync algorithm, see [`@pruvious/orm`](../packages/orm.md#sync-migrations).

## Multiple databases

Pruvious supports up to four independent database connections:

| Database | Purpose | Configured under |
| :--- | :--- | :--- |
| **Main** | Collections, singletons | `pruvious.database` |
| **Cache** | Key-value cache, page cache | `pruvious.cache` |
| **Queue** | Background jobs | `pruvious.queue` |
| **Logs** | API, query, error, and custom logs | `pruvious.debug.logs` |

The cache, queue, and log databases all default to reusing the main connection (creating `Cache`, `Queue`, and `Logs` tables inside it). You can move any of them to a separate database when you need to scale:

```ts
pruvious: {
  database: { driver: 'postgres://...' },        // Main
  cache:    { driver: 'redis://...' },           // Cache moved to Redis
  queue:    { driver: 'sqlite://queue.sqlite' }, // Queue on local SQLite
  debug: {
    logs: {
      driver: 'sqlite://logs.sqlite',            // Logs on local SQLite
    },
  },
}
```

See the [configuration reference](../reference/configuration.md) for every option.

## How collections map to tables

A collection becomes a table. A field becomes a column. The table name comes from the file name in `server/collections/`:

```ts
// server/collections/Articles.ts
import { defineCollection, textField, textareaField } from '#pruvious/server'

export default defineCollection({
  fields: {
    title: textField({ required: true }),
    body: textareaField({}),
  },
})
```

This produces an `Articles` table with:

- `id` (auto-generated primary key)
- `title` (text, not null)
- `body` (text)
- `createdAt`, `updatedAt` (timestamps, auto-managed)
- `translations`, `language` (when the collection is translatable, which is the default)

The `id` column is reserved. Everything else is yours.

## Indexes and foreign keys

Indexes and foreign keys live alongside the field definitions, so they are declared once and applied on every sync:

```ts
// server/collections/Articles.ts
import { defineCollection, recordField, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    slug: textField({ required: true }),
    author: recordField({ collection: 'Users' }),
  },
  indexes: [
    { fields: ['slug'], unique: true },
  ],
  foreignKeys: [
    {
      field: 'author',
      referencedCollection: 'Users',
      referencedField: 'id',
      action: ['ON UPDATE CASCADE', 'ON DELETE SET NULL'],
    },
  ],
})
```

Pruvious automatically generates a stable index or constraint name based on the table and column names. You can rename a collection without losing its indexes, as long as you keep the same `key`.

## The Options table

Pruvious creates a special `Options` table on first connect. It is a key-value store used for:

- Internal sync locks and schema fingerprints
- Anything else you want to stash without modeling a collection

```ts
import { database } from '#pruvious/server'

const db = database()
await db.setOption('site.maintenance', false)
const isMaintenance = await db.getOption<boolean>('site.maintenance')
```

## Next steps

- [Using the ORM](./orm.md) - Raw queries, transactions, and the query builder
- [Configuration reference](../reference/configuration.md#database) - Every database option
- [`@pruvious/orm` package guide](../packages/orm.md) - Use the ORM standalone
