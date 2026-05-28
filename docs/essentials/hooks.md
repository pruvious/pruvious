# Hooks and Filters

Hooks are the seams in Pruvious where you can plug in your own code. There are two kinds:

- **Actions** run at a specific point in the flow. They do not return anything - they just _do_ something, like sending an email after a user signs up.
- **Filters** run on a value and return a (possibly modified) version of it. Use them to extend lists, mutate config, or transform data on its way somewhere.

Both kinds come in two flavors: **server-side** and **client-side**. They share the same `defineAction` / `defineFilter` / `addAction` / `addFilter` API but live in different directories and import from different aliases.

In addition to these global hooks, every collection and singleton has its own per-instance lifecycle hooks. Those are configured on the definition object, not registered globally.

## Mental model

Each global hook has two halves:

1. A **definition** - a file that names the hook and declares its types. Defining a hook is like declaring an event; until you define it, you cannot register a handler for it.
2. One or more **callbacks** - files that register handlers for the hook with `addAction` or `addFilter`.

When code calls `doActions('user:created', { ... })` or `applyFilters('blocks:groups', value, {})`, Pruvious runs every callback registered for that name, in order.

## File layout

### Server-side

| Purpose            | Location                                |
| ------------------ | --------------------------------------- |
| Action definitions | `server/hooks/actions/<name>.ts`        |
| Filter definitions | `server/hooks/filters/<name>.ts`        |
| Action callbacks   | `server/actions/<anything>.ts`          |
| Filter callbacks   | `server/filters/<anything>.ts`          |

### Client-side

| Purpose            | Location                          |
| ------------------ | --------------------------------- |
| Action definitions | `app/hooks/actions/<name>.ts`     |
| Filter definitions | `app/hooks/filters/<name>.ts`     |
| Action callbacks   | `app/actions/<anything>.ts`       |
| Filter callbacks   | `app/filters/<anything>.ts`       |

The **name** of a hook is derived from its definition file path. Path segments are pascal-cased then joined with `:`, with three reductions applied:

- An `index.ts` baseName is dropped (`app/hooks/filters/dashboard/menu/index.ts` -> `dashboard:menu`).
- Consecutive duplicate segments are collapsed (`server/hooks/actions/user/user/registered.ts` -> `user:registered`).
- The trailing segment is dropped when the file basename already starts with it. So `server/hooks/actions/user/userRegistered.ts` (segments `['user']` + basename `userRegistered`) collapses to `user-registered` rather than `user:user-registered`.

Examples:

- `server/hooks/actions/user/registered.ts` -> `user:registered`
- `app/hooks/filters/dashboard/menu/general/index.ts` -> `dashboard:menu:general`

## Defining a server action

A definition file just declares the action's context type and exports `defineAction<Context>()`:

```ts
// server/hooks/actions/user/registered.ts
import { defineAction } from '#pruvious/server'

export default defineAction<{
  user: { id: number; email: string; firstName: string }
}>()
```

That is the whole file. The exported value is a type marker - it does not run at runtime. Defining the file enables `'user:registered'` as a valid name in `addAction` and `doActions`.

## Registering a callback with `addAction`

Place callbacks anywhere in `server/actions/`. Pruvious scans these files at build time and loads any that call `addAction('user:registered', ...)`.

```ts
// server/actions/send-welcome-email.ts
import { addAction } from '#pruvious/server'

addAction('user:registered', async ({ user }) => {
  await sendMail({
    to: user.email,
    subject: 'Welcome!',
    body: `Hi ${user.firstName}, thanks for joining.`,
  })
})
```

Actions run in registration order. To force an order, pass a priority (lower runs first; default is `10`):

```ts
addAction('user:registered', logActivity, 5)   // runs first
addAction('user:registered', sendWelcomeMail) // priority 10
addAction('user:registered', notifyAdmins, 20) // runs last
```

## Firing an action with `doActions`

To run all callbacks for a name, call `doActions` from anywhere on the server:

```ts
// server/utils/users.ts
import { doActions, insertInto } from '#pruvious/server'

export async function registerUser(input: { email: string; firstName: string }) {
  const result = await insertInto('Users').values([input]).returning(['id', 'email', 'firstName']).run()

  if (result.success && result.data?.[0]) {
    await doActions('user:registered', { user: result.data[0] })
  }

  return result
}
```

`doActions` awaits every callback in sequence. Errors thrown from a callback propagate to the caller.

## Defining and using a filter

A filter has both a **value type** and an optional **context type**:

```ts
// server/hooks/filters/billing/discount.ts
import { defineFilter } from '#pruvious/server'

export default defineFilter<number, { userId: number }>()
```

Register a handler with `addFilter`. The handler receives the current value, returns a new one, and gets the shared context as a second argument:

```ts
// server/filters/loyalty-discount.ts
import { addFilter } from '#pruvious/server'

addFilter('billing:discount', async (price, { userId }) => {
  if (await isReturningCustomer(userId)) {
    return price * 0.9
  }
  return price
})
```

Apply the filter where you need the transformed value:

```ts
import { applyFilters } from '#pruvious/server'

const finalPrice = await applyFilters('billing:discount', basePrice, {
  userId: currentUser.id,
})
```

Filters run in priority order, and each handler sees the value returned by the previous one. Handlers may return synchronously or asynchronously - `applyFilters` awaits each one.

## Built-in events

Pruvious itself defines a handful of hooks you can extend without writing the definition file. Some commonly useful ones:

### Server filters

- `blocks:groups` (`BlockGroupDefinition[]`) - add or rename block groups in the dashboard.
- `blocks:tags` (`BlockTagDefinition[]`) - extend the list of block tags shown in the picker.
- `api:me:updatable-fields` (`MyAccountFields`, an object `{ fields, fieldsLayout }`) - which fields a user is allowed to change on `PATCH /api/me`, plus the dashboard layout for that form.

### Client filters

- `dashboard:menu:general`, `dashboard:menu:collections`, `dashboard:menu:management`, `dashboard:menu:utilities` (`OrderedDashboardMenuItem[]`) - customize the dashboard sidebar groups.
- `dashboard:menu:general:title`, `:collections:title`, etc. (`string`) - rename the group titles.
- `dashboard:menu:header:title` and `:header:dropdown` - customize the dashboard header.
- `dashboard:collections:edit:change`, `:before-save`, `:after-save` - hook into the create / edit form lifecycle for collections.
- `dashboard:collections:new:change`, `:before-save`, `:after-save` - same for the new-record form.
- `dashboard:collections:edit:footer:buttons`, `:new:footer:buttons` - add buttons to the editor footer.
- `dashboard:singletons:change`, `:before-save`, `:after-save`, `:footer:buttons` - same for singletons.

This is not the full list - any file under `app/hooks/filters/` or `server/hooks/filters/` in the Pruvious package becomes an extensible hook. TypeScript completion on `addFilter` and `addAction` will show every available name.

### Extending the dashboard menu

```ts
// app/filters/dashboard-menu.ts
import { addFilter } from '#pruvious/app'

addFilter('dashboard:menu:utilities', (items) => {
  items.push({
    label: 'Reports',
    icon: 'chart-bar',
    to: 'reports',
    group: 'utilities',
    order: 50,
  })
  return items.sort((a, b) => a.order - b.order)
})
```

### Adding a block group

```ts
// server/filters/blocks.ts
import { addFilter } from '#pruvious/server'

addFilter('blocks:groups', (groups) => {
  groups.push({ name: 'commerce', label: 'Commerce' })
  return groups
})
```

## Loading client hooks

Server hooks are auto-registered when the server starts. Client hooks are only loaded on demand, to keep the dashboard bundle small. Before firing or applying a client hook, call `loadActions` / `loadFilters`:

```ts
// app/utils/foo.ts
import { applyFilters, loadFilters } from '#pruvious/app'

await loadFilters('dashboard:collections:edit:before-save')

const next = await applyFilters('dashboard:collections:edit:before-save', data, ctx)
```

When you register a filter inside `app/filters/`, Pruvious knows the file's `addFilter` call(s), so `loadFilters('name')` only pulls in the files that touch that name.

## Collection lifecycle hooks

Collections expose three hooks on the definition object. They run on every query through that collection - server-side, before or after the database call - and they apply to all four operations (`insert`, `select`, `update`, `delete`). Use the `operation` discriminator on the context to narrow what you do.

```ts
// server/collections/Posts.ts
import { defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    title: textField({}),
    slug: textField({}),
  },
  hooks: {
    beforeQueryPreparation: [
      ({ operation, sanitizedInput }) => {
        if (operation === 'insert' && sanitizedInput) {
          for (const row of sanitizedInput) {
            row.slug ??= slugify(row.title ?? '')
          }
        }
      },
    ],
    afterQueryExecution: [
      ({ operation }, { result }) => {
        if (operation === 'insert' && result.success) {
          // result.data is the inserted rows
          revalidateBlogIndex()
        }
      },
    ],
  },
})
```

The three hooks:

- **`beforeQueryPreparation`** - runs before the SQL is generated. The query builder is still mutable here, so you can add `where` clauses, strip fields, or throw to halt the query.
- **`beforeQueryExecution`** - runs after the SQL is built and parameters are bound, but before the database call. The `queryDetails.query` argument exposes `{ sql, params }` if you need to log or inspect.
- **`afterQueryExecution`** - runs after the database call. The `queryDetails` argument contains `query`, `queryExecutionTime`, `rawResult`, and the formatted `result` returned to the caller. Avoid throwing from here - errors may not be caught.

Each hook is an array, so you can compose multiple handlers.

### Common patterns

Force a `userId` filter on every query so users only see their own records:

```ts
hooks: {
  beforeQueryPreparation: [
    ({ operation, queryBuilder }) => {
      if (operation !== 'insert' && queryBuilder) {
        queryBuilder.where('userId', '=', currentUserId())
      }
    },
  ],
}
```

Validate before write:

```ts
hooks: {
  beforeQueryPreparation: [
    ({ operation, sanitizedInput }) => {
      if (operation === 'insert' && sanitizedInput) {
        for (const row of sanitizedInput) {
          if (row.email && !row.email.includes('@')) {
            throw new Error('Invalid email')
          }
        }
      }
    },
  ],
}
```

Send a notification after a create:

```ts
hooks: {
  afterQueryExecution: [
    async ({ operation }, { result }) => {
      if (operation === 'insert' && result.success && result.data) {
        const rows = Array.isArray(result.data) ? result.data : []
        for (const row of rows) {
          await notify('new-comment', row)
        }
      }
    },
  ],
}
```

### Helper hooks

Pruvious ships a set of reusable hooks for common security tasks. Import them from `#pruvious/server` and drop them into the hooks array:

```ts
import {
  defineCollection,
  textField,
  excludeFields,
  denyWhere,
  removeOrderBy,
} from '#pruvious/server'

export default defineCollection({
  fields: {
    email: textField({}),
    passwordHash: textField({}),
  },
  hooks: {
    beforeQueryPreparation: [
      denyWhere(['passwordHash']),   // 403 if someone filters by passwordHash
      removeOrderBy(['passwordHash']), // silently strip it from orderBy
    ],
    afterQueryExecution: [
      excludeFields(['passwordHash']), // never return it in responses
    ],
  },
})
```

Available helpers: `removeWhere`, `denyWhere`, `removeOrderBy`, `denyOrderBy`, `removeGroupBy`, `denyGroupBy`, `excludeFields`, `maskFields`, `resetFields`.

## Singleton lifecycle hooks

Singletons expose the same three lifecycle hooks, but they only ever see two operations: `select` and `update`. The context has a `singleton` and `singletonName` instead of `collection` / `collectionName`.

```ts
// server/singletons/SEO.ts
import { defineSingleton, textField } from '#pruvious/server'

export default defineSingleton({
  fields: {
    title: textField({}),
    description: textField({}),
  },
  hooks: {
    afterQueryExecution: [
      ({ operation }, { result }) => {
        if (operation === 'update' && result.success) {
          revalidateAllPages()
        }
      },
    ],
  },
})
```

## When to use what

| You want to...                                   | Reach for                                               |
| ------------------------------------------------ | ------------------------------------------------------- |
| React to something that just happened            | Action (`addAction` + `doActions`)                      |
| Customize a value that something else owns       | Filter (`addFilter` + `applyFilters`)                   |
| Run code on every read/write of a collection     | Collection lifecycle hooks                              |
| Block a query when the user lacks permission     | `beforeQueryPreparation` hook that throws               |
| Strip sensitive fields from responses            | `excludeFields` / `maskFields` in `afterQueryExecution` |
| Extend a list the dashboard or API exposes       | A built-in filter (`blocks:groups`, `dashboard:menu:*`) |
