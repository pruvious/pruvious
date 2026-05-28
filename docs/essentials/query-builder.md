# Query Builder

Pruvious ships with a fully typed, chainable query builder you can use to read and write collection records, plus a smaller variant for singletons. The same patterns work on the server and inside the dashboard, with the only difference being where the queries run.

```ts
import { selectFrom } from '#pruvious/server'

const result = await selectFrom('Articles')
  .where('isPublished', '=', true)
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .all()
```

## Why a query builder?

- **Typesafe.** Field names, operators, values, and return types come from your collection definitions. Renaming a field is a refactor, not a manual hunt.
- **Chainable.** Build queries piece by piece. Each method returns the builder, so you can compose conditions, ordering, pagination, and populate calls in one expression.
- **Symmetric.** The server query builder talks to the database directly. The client query builder posts to the auto-generated REST endpoints. Both share the same fluent API.
- **Validated and hookable.** Inserts and updates run through field validators, sanitizers, and any collection hooks you define. Errors come back as structured objects, not exceptions.

## Result shape

Every terminal call returns a `QueryBuilderResult` with the same shape:

```ts
{
  success: true,
  data: /* the value */,
  runtimeError: undefined,
  inputErrors: undefined,
}
```

When something goes wrong, `success` is `false` and either `runtimeError` (a string) or `inputErrors` (a record of field messages) is set. The data property is `undefined` on failure.

Always check `success` before using `data`.

## Server-side usage

On the server, import the helpers from `#pruvious/server`. You can call them anywhere - in `server/api/*` routes, inside jobs, hooks, or any utility.

```ts
// server/api/latest-articles.get.ts
import { selectFrom } from '#pruvious/server'

export default defineEventHandler(async () => {
  const result = await selectFrom('Articles')
    .where('isPublished', '=', true)
    .orderBy('publishedAt', 'desc')
    .limit(10)
    .all()

  if (!result.success) {
    throw createError({ statusCode: 500, message: result.runtimeError })
  }

  return result.data
})
```

Available entry points from `#pruvious/server`:

- `selectFrom(name)` - read records
- `insertInto(name)` - create records
- `update(name)` - update records
- `deleteFrom(name)` - delete records
- `selectSingleton(name)` - read a singleton
- `updateSingleton(name)` - write a singleton
- `queryBuilder()` - returns an object with all four collection methods, useful when you want to pass a single handle around
- `guardedQueryBuilder()`, `guardedSelectFrom(...)` etc. - same builders, but they apply the current user's collection and field permissions

Reach for the guarded variants when the query reflects something the request's user is allowed to do. Use the plain helpers for system-level work like jobs and background tasks.

## Client-side usage

Inside the dashboard (anything imported from `#pruvious/dashboard`), use the client builders. They send POST requests to the auto-generated `/api/collections/:name/query/*` endpoints, so the collection must have its `api` setting enabled.

```ts
import { selectFrom } from '#pruvious/dashboard'

const { data, success } = await selectFrom('Articles')
  .select(['id', 'title', 'publishedAt'])
  .where('isPublished', '=', true)
  .paged(1, 20)
  .paginate()
```

The methods are the same as on the server. Permissions are enforced server-side because the request goes through the regular API pipeline.

## Selecting fields

By default `selectFrom(...).all()` returns every column. Narrow the result with `select`:

```ts
selectFrom('Users')
  .select(['id', 'email'])
  .all()

selectFrom('Users')
  .selectAll() // every field, explicit
  .all()
```

Picking only the fields you need keeps your TypeScript types tight - the returned objects only include the selected keys.

## Filtering with `where`

`where` takes a field, an operator, and a value. Chain multiple calls to combine them with `AND`:

```ts
selectFrom('Articles')
  .where('isPublished', '=', true)
  .where('publishedAt', '<=', Date.now())
  .all()
```

Available operators depend on the field type:

- Text fields: `=`, `!=`, `in`, `notIn`, `like`, `notLike`, `ilike`, `notIlike`
- Boolean fields: `=`, `!=`
- Numeric fields (including `id`): `=`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `notIn`, `between`, `notBetween`
- Junction / matrix fields: `<`, `<=`, `>`, `>=`, `includes`, `includesAny`, `excludes`, `excludesAny`

Some operators expect specific value shapes:

```ts
selectFrom('Users').where('id', 'in', [1, 2, 3]).all()
selectFrom('Posts').where('publishedAt', 'between', [start, end]).all()
selectFrom('Posts').where('title', 'like', 'How to%').all()
```

For OR conditions, group them with `orGroup`:

```ts
selectFrom('Users')
  .where('isActive', '=', true)
  .orGroup([
    (eb) => eb.where('role', '=', 'admin'),
    (eb) => eb.where('role', '=', 'editor'),
  ])
  .all()
```

If the query builder cannot express what you need, drop down to raw SQL with `whereRaw`. Use `$param` syntax for values - never string-interpolate user input.

```ts
selectFrom('Posts')
  .whereRaw(
    '"id" in (select "postId" from "Likes" where "userId" = $userId)',
    { userId: 1 },
  )
  .all()
```

## Ordering, limiting, offsetting

```ts
selectFrom('Articles')
  .orderBy('publishedAt', 'desc')
  .orderBy('title', 'asc')
  .limit(20)
  .offset(40)
  .all()
```

`orderBy` can be called multiple times to add secondary sort keys. There is also `orderByRaw(...)` for cases the typed API does not cover.

## Reading data

Terminal methods on `SelectQueryBuilder`:

```ts
selectFrom('Articles').all()        // -> { data: Article[] }
selectFrom('Articles').first()      // -> { data: Article | null }
selectFrom('Articles').count()      // -> { data: number }
selectFrom('Articles').min('views') // -> { data: number | null }
selectFrom('Articles').max('views')
selectFrom('Articles').sum('views')
selectFrom('Articles').avg('views')
```

There is no `exists()` shortcut - use `count()` or `first()` and check the result.

### Pagination

`paginate()` returns a structured page object alongside the records:

```ts
const result = await selectFrom('Articles')
  .where('isPublished', '=', true)
  .paged(2, 10) // page 2, 10 per page
  .paginate()

console.log(result.data)
// {
//   records: Article[],
//   currentPage: 2,
//   lastPage: 5,
//   perPage: 10,
//   total: 50,
// }
```

`paged(page, perPage)` is a convenience for `.limit(perPage).offset((page - 1) * perPage)`.

## Inserting

```ts
import { insertInto } from '#pruvious/server'

const result = await insertInto('Articles')
  .values([
    { title: 'Hello world', body: 'First post', isPublished: true },
    { title: 'Second post', body: 'Still going', isPublished: false },
  ])
  .returning(['id', 'title'])
  .run()
```

- Pass an array of records to `values(...)`. To insert one, pass an array with one element.
- `returning([...])` controls what comes back per inserted row. Without it, `data` is the number of inserted rows.
- Validation errors land in `inputErrors` - one entry per input row, keyed by field name.

```ts
if (!result.success) {
  // result.inputErrors is an array, one per input row
  console.log(result.inputErrors?.[0])
  // { title: 'This field is required' }
}
```

## Updating

```ts
import { update } from '#pruvious/server'

const result = await update('Articles')
  .set({ isPublished: true, publishedAt: Date.now() })
  .where('id', '=', 42)
  .returning(['id', 'isPublished'])
  .run()
```

Without `returning(...)`, `data` is the number of affected rows. Validation errors come back as a single object keyed by field name - the update applies the same patch to every matched row, so there is only one error set.

There is no built-in guardrail against a missing `where(...)`. If you forget to add one, `update(...)` will rewrite every row in the table. Build the habit of always scoping updates with `.where(...)` and reviewing the resulting diff (or affected row count) before shipping.

## Deleting

```ts
import { deleteFrom } from '#pruvious/server'

const result = await deleteFrom('Articles')
  .where('isPublished', '=', false)
  .where('updatedAt', '<', Date.now() - 30 * 24 * 60 * 60 * 1000)
  .run()

console.log(result.data) // number of deleted rows
```

Like `update`, `deleteFrom` has no built-in guardrail: omitting `.where(...)` will delete every row in the table. Always scope your deletes explicitly and review the affected row count before running them. Add `.returning(['id'])` if you want the deleted rows back.

## Populate (relations)

Record fields, repeaters, and other relational fields store raw values (typically IDs). Call `populate()` on the select builder to run the registered populators and get the full related data:

```ts
const result = await selectFrom('Articles')
  .select(['id', 'title', 'author'])
  .populate()
  .first()

// result.data.author is the full user record, not just the ID
```

The return type updates accordingly - populated fields are typed as the populator's return value.

`populate()` works with `all()`, `first()`, and `paginate()` on selects. It is also available on `insertInto`, `update`, and `deleteFrom` builders, where it transforms the rows returned by `.returning(...)` (no effect if you do not request returning fields).

## Transactions

Group several queries with `database().transaction(...)`. If any callback rejects, every change rolls back (on SQLite and PostgreSQL; D1 cannot roll back).

The callback receives an `exec` function bound to the transaction's connection. Use it for raw SQL that must run inside the transaction - particularly on PostgreSQL, where the transaction holds a dedicated Pool client. Query builders called inside the callback go through the same code path as outside and may not be bound to the transaction's connection, so prefer `exec` for any raw work that must participate in the rollback.

```ts
import { database, insertInto, selectFrom, update } from '#pruvious/server'

await database().transaction(async (exec) => {
  const order = await insertInto('Orders')
    .values([{ userId: 1, total: 9900 }])
    .returning(['id'])
    .run()

  if (!order.success || !order.data) {
    throw new Error(order.runtimeError ?? 'Failed to create order')
  }

  const product = await selectFrom('Products')
    .select(['id', 'stock'])
    .where('id', '=', 42)
    .first()

  if (!product.success || !product.data) {
    throw new Error(product.runtimeError ?? 'Product not found')
  }

  if (product.data.stock < 1) {
    throw new Error('Out of stock')
  }

  const stock = await update('Products')
    .set({ stock: product.data.stock - 1 })
    .where('id', '=', 42)
    .run()

  if (!stock.success) {
    throw new Error(stock.runtimeError)
  }
})
```

For an atomic decrement without a read-then-write round trip, use the `exec` argument to run raw SQL on the transaction's connection:

```ts
await database().transaction(async (exec) => {
  await exec('update "Products" set "stock" = "stock" - 1 where "id" = $id', { id: 42 })
})
```

Throwing inside the callback rolls back. Returning normally commits.

## Singletons

Singletons hold a single record of content (site settings, theme options, an SEO block). They have their own query builder with a slimmer API - just `select` and `update`. There is no insert or delete because there is nothing to create or remove; updating a singleton with no row yet behaves like an upsert.

```ts
import { selectSingleton, updateSingleton } from '#pruvious/server'

const seo = await selectSingleton('SEO')
  .select(['baseTitle', 'titleSeparator'])
  .get()

console.log(seo.data)
// { baseTitle: 'My Pruvious Site', titleSeparator: ' | ' }
```

Terminal methods:

- `selectSingleton(name).get()` returns the singleton record (or its defaults if no row exists yet).
- `updateSingleton(name).set({ ... }).run()` writes the singleton.

```ts
const result = await updateSingleton('SEO')
  .set({ title: 'New title' })
  .returning(['title'])
  .run()
```

Both builders also support `.populate()` and translatable singletons can chain `.language('de')` to read or write a specific translation.

The client-side versions live in `#pruvious/dashboard` under the same names.

## Pagination patterns

For server-rendered lists, prefer `.paginate()` over manual `count()` plus `all()`. It still runs a separate `count(*)` under the hood, but ties the two queries together so the result shape stays consistent and the page maths is done for you.

```ts
// server/api/users.get.ts
import { selectFrom } from '#pruvious/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page ?? 1)
  const perPage = Math.min(Number(query.perPage ?? 20), 100)

  const result = await selectFrom('Users')
    .select(['id', 'email', 'role'])
    .orderBy('createdAt', 'desc')
    .paged(page, perPage)
    .paginate()

  return result.data
})
```

In the dashboard, prefer the `useSelectQueryBuilderParams` composable from `#pruvious/dashboard` to keep query parameters in sync with the URL.

## Raw SQL

For one-off queries the builder cannot express, fall back to `database().exec(...)`:

```ts
import { database } from '#pruvious/server'

const rows = await database().exec(
  'select count(*) as count from "Articles" where "viewCount" > $threshold',
  { threshold: 1000 },
)
```

Use `$param` syntax for values, the same as `whereRaw`. The ORM escapes the parameters before sending them to the database.

You can also mix and match - call `selectRaw(...)`, `whereRaw(...)`, `orderByRaw(...)`, or `injectRaw(...)` on a builder to splice raw SQL into an otherwise typed query, while keeping the rest of the API.

## Batching IN clauses

D1 caps the number of bound parameters per query. If you need to fetch with thousands of IDs, use `batchSelectIn`:

```ts
import { batchSelectIn, selectFrom } from '#pruvious/dashboard'

const users = await batchSelectIn(userIds, (batch) => {
  return selectFrom('Users')
    .selectAll()
    .where('id', 'in', batch)
    .all()
    .then((r) => r.data ?? [])
})
```

It splits `userIds` into chunks of 50, runs each batch in parallel, and flattens the result.
