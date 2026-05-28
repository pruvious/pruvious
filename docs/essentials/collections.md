# Collections

A collection is the Pruvious equivalent of a database table. Every record you create, list, update, or delete lives inside a collection. You describe a collection once with `defineCollection`, and Pruvious takes care of the database schema, the REST endpoints, the typed query builder, and the dashboard UI.

## Basic example

Drop a file into `server/collections/`. The filename - PascalCase - becomes the collection name.

```ts
// server/collections/Articles.ts
import { defineCollection, textField, textAreaField } from '#pruvious/server'

export default defineCollection({
  fields: {
    title: textField({ required: true }),
    summary: textAreaField({}),
  },
})
```

That's all you need. After saving the file, Pruvious will:

- Create an `Articles` table with `id`, your custom fields, `createdAt`, `updatedAt`, plus translation fields (`translations`, `language`) by default.
- Expose REST endpoints under `/<api.basePath>/collections/articles`.
- Add a dashboard page where editors can create and edit articles.
- Generate fully typed query builders accessible through `selectFrom('Articles')`, `insertInto('Articles')`, and friends from `#pruvious/server`.

The collection name is derived from the file name. There is no `name` or `tableName` option - rename the file to rename the collection.

## Fields

`fields` is a plain object that maps a field name to a field instance. Field names must be `camelCase` and up to 63 characters. The `id` field is reserved and added for you.

```ts
import {
  defineCollection,
  emailValidator,
  recordsField,
  textField,
} from '#pruvious/server'

export default defineCollection({
  fields: {
    email: textField({
      required: true,
      unique: true,
      validators: [emailValidator()],
    }),
    roles: recordsField({
      collection: 'Roles',
      fields: ['id', 'name', 'permissions'],
    }),
  },
})
```

See [Fields](./fields.md) for the full catalogue of built-in field types and how to write your own.

## Translations

Collections are `translatable` by default. Each language stores its own row, linked by an auto-generated `translations` key plus a `language` code.

```ts
defineCollection({
  fields: {
    title: textField({ required: true }),
  },
  // translatable: true is the default
})
```

To keep a collection language-agnostic, set it to `false`:

```ts
defineCollection({
  translatable: false,
  fields: {
    sku: textField({ required: true, unique: true }),
    stock: numberField({}),
  },
})
```

### Synced fields

Some fields are the same in every language - a price, a hero image, an external ID. List them in `syncedFields` and Pruvious will copy edits across all translations automatically.

```ts
defineCollection({
  fields: {
    title: textField({ required: true }),
    price: numberField({}),
    sku: textField({ unique: true }),
  },
  syncedFields: ['price', 'sku'],
})
```

Synced fields cannot rely on `conditionalLogic` or `dependencies` that need other input fields - the sync runs as a partial update and only carries the synced values.

## Auto-managed fields

Pruvious adds a handful of meta fields on top of `fields`. Each one can be turned off, or fine-tuned with an options object.

```ts
defineCollection({
  fields: { title: textField({}) },
  createdAt: true,   // default: enabled, indexed
  updatedAt: true,   // default: enabled
  author: true,      // default: disabled
  editors: false,    // default: disabled
})
```

| Option | Default | What it does |
| --- | --- | --- |
| `createdAt` | `true` | Adds a timestamp set on insert. Indexed by default. |
| `updatedAt` | `true` | Adds a timestamp updated on every change. |
| `author` | `false` | Adds an `author` field referencing `Users`. Restricts who can update/delete records and exposes the `collection:{slug}:manage` permission. |
| `editors` | `false` | Adds an `editors` field for users assigned as collaborators. |
| `routing.isPublic` | `false` | Adds a publish/draft toggle. Only available under `routing`. |
| `routing.scheduledAt` | `false` | Adds a scheduled publish date. Requires `routing.isPublic`. |
| `routing.seo` | `false` | Adds an SEO group field. Only available under `routing`. |

Each preset accepts a full options object - for example, to drop the default index on `createdAt`:

```ts
defineCollection({
  fields: { /* ... */ },
  createdAt: {
    index: false,
    ui: { label: 'Created on' },
  },
})
```

Names like `createdAt`, `updatedAt`, `author`, `editors`, `subpath`, `isPublic`, `scheduledAt`, `seo`, `translations`, and `language` are reserved while the corresponding preset is enabled. Defining a field with one of those names triggers a build warning.

## Indexes

Add database indexes with the `indexes` option. Indexes accept an array of `{ fields, unique? }` entries.

```ts
defineCollection({
  fields: {
    firstName: textField({}),
    lastName: textField({}),
    email: textField({ unique: true }),
  },
  indexes: [
    { fields: ['lastName', 'firstName'] }, // composite
    { fields: ['email'], unique: true },   // also implicit via `unique: true` on the field
  ],
})
```

Field-level `unique: true` automatically generates a matching unique index, so you only need `indexes` for composite or non-unique cases.

## Foreign keys

Most relational fields (`recordField`, `recordsField`) create their own foreign keys. Use the top-level `foreignKeys` option when you need to wire one up by hand.

```ts
defineCollection({
  fields: {
    title: textField({}),
    categoryId: numberField({}),
  },
  foreignKeys: [
    {
      field: 'categoryId',
      referencedCollection: 'Categories',
      action: ['ON UPDATE CASCADE', 'ON DELETE SET NULL'],
    },
  ],
})
```

## Routable collections

Set `routing` to attach URL paths to a collection. Each record then gets a `subpath` field, an optional `isPublic` toggle, scheduled publishing, and SEO metadata.

```ts
defineCollection({
  fields: {
    title: textField({ required: true }),
    body: textAreaField({}),
  },
  routing: {
    isPublic: true,
    scheduledAt: true,
    seo: true,
    labelField: 'title',
    layout: 'page',
    publicFields: ['title', 'body', 'seo'],
  },
})
```

What you get:

- A `subpath` field that uniquely identifies each record in its URL (unique index per language).
- A draft/public toggle via `isPublic` (publicly accessible only when `true`).
- Scheduled publishing via `scheduledAt` (requires `isPublic`).
- An SEO group field with title, description, sharing image, and more.
- A `Routes` entry that resolves to this collection. The record data is exposed under `proute.data` in your Vue templates.

Use `usePruviousRoute()` in any page that opts into the `pruvious` middleware:

```vue
<template>
  <NuxtLayout :name="proute?.layout">
    <h1>{{ proute?.data.title }}</h1>
    <article v-html="proute?.data.body" />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { usePruviousRoute } from '#pruvious/app'

definePageMeta({ middleware: ['pruvious'] })

const proute = usePruviousRoute()
</script>
```

`publicFields` controls which fields are serialized into `data`. Defaults to every custom field plus `id`, `createdAt`, and `updatedAt`. `labelField` is what the dashboard's link picker shows for a record - defaults to `subpath`.

## Dashboard UI

`ui` controls how the collection looks in the admin. Every key is optional.

```ts
defineCollection({
  fields: { /* ... */ },
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Articles'),
    icon: 'news',
    menu: {
      group: 'collections',
      order: 5,
    },
    indexPage: {
      dataTable: {
        columns: ['title | 320px', 'isPublic | 8rem', 'createdAt | 12rem'],
        orderBy: 'createdAt:desc',
        perPage: 25,
      },
    },
    updatePage: {
      fieldsLayout: [
        'title',
        { row: ['slug | 50%', 'isPublic | 50%'] },
        '---',
        'body',
      ],
    },
    createPage: {
      fieldsLayout: 'mirror',
    },
  },
})
```

Highlights:

- `icon` is any [Tabler icon](https://tabler-icons.io) name.
- `menu.group` is one of `general`, `collections`, `management`, or `utilities`.
- `dataTable.columns` accepts field names with optional `| width | minWidth` shortcuts, or full objects.
- `fieldsLayout` lets you compose rows, tabs, cards, custom components, and `---` separators.
- Pass `fieldsLayout: 'mirror'` on one page to reuse the layout from the other.

When you set a custom layout, pass it through `resolvePruviousComponent('>/components/MyComponent.vue')` so Pruvious can serialize the import for the dashboard bundle.

## Hooks

Hooks run inside the query builder lifecycle and let you mutate context, add `where` clauses, transform results, or block a query entirely. There are three buckets:

```ts
import { defineCollection, textField } from '#pruvious/server'

defineCollection({
  fields: { title: textField({}) },
  hooks: {
    beforeQueryPreparation: [
      ({ operation, queryBuilder }) => {
        if (operation === 'select') {
          queryBuilder.where('isPublic', '=', true)
        }
      },
    ],
    beforeQueryExecution: [
      (context, { query }) => {
        console.log('about to run', query.sql)
      },
    ],
    afterQueryExecution: [
      (context, { result, queryExecutionTime }) => {
        console.log(`took ${queryExecutionTime}ms`)
      },
    ],
  },
})
```

Throwing inside `beforeQueryPreparation` or `beforeQueryExecution` halts the query and returns the error as a `QueryBuilderRuntimeError`. Avoid throwing in `afterQueryExecution` - errors there may not be caught.

Pruvious ships a few reusable hook factories you can drop straight into these arrays: `removeWhere`, `denyWhere`, `removeOrderBy`, `denyOrderBy`, `removeGroupBy`, `denyGroupBy`, `excludeFields`, `maskFields`, and `resetFields`. See [Hooks](./hooks.md) for the full list.

## Guards

Guards control access on a per-query basis. Every guard receives the same context as the hooks and can throw to deny the request.

```ts
import { defineCollection, textField } from '#pruvious/server'

defineCollection({
  fields: { title: textField({}) },
  guards: [
    ({ _ }) => {
      if (!useEvent().context.pruvious.auth.isLoggedIn) {
        throw new Error(_('You must be logged in'))
      }
    },
  ],
})
```

Guards only fire when you use the guarded query builder functions (`guardedSelectFrom`, `guardedInsertInto`, `guardedUpdate`, `guardedDeleteFrom`, or `guardedQueryBuilder()`). Pruvious's REST endpoints always use the guarded variants.

The built-in auth guard checks for `collection:{slug}:create|read|update|delete` permissions. Toggle it per-operation if you need a quieter set of defaults:

```ts
defineCollection({
  fields: { /* ... */ },
  authGuard: ['create', 'update', 'delete'], // public reads, protected writes
})
```

Set `authGuard: false` to disable the built-in check entirely - you are then responsible for whatever access control you want.

## API endpoints

CRUD endpoints are on by default. Disable individual operations or shut them all off:

```ts
defineCollection({
  fields: { /* ... */ },
  api: {
    create: true,
    read: true,
    update: true,
    delete: false, // no DELETE endpoint
  },
})
```

The endpoints live under `/<api.basePath>/collections/{slug}`, where `{slug}` is the kebab-case form of the collection name. Each endpoint runs through the guarded query builder, so guards and permissions apply automatically.

## Logs

Every collection logs its queries by default. Inspect logs from the dashboard with the `read-logs` permission. The feature requires `pruvious.debug.logs.queries` to be enabled in `nuxt.config.ts`.

```ts
defineCollection({
  fields: { /* ... */ },
  logs: {
    exposeData: true, // include actual SQL params and result data
    operations: { insert: true, select: false, update: true, delete: true },
  },
})
```

`exposeData` defaults to `false` to keep potentially sensitive values out of the log table.

## Page cache invalidation

When a collection mutation should bust the public page cache, configure `pageCacheClearTriggers`. For visible collections the defaults already flush the whole cache on insert, update, and delete - except for the built-in `Users` and `Roles` collections, which only flush on delete. Use this option to narrow the blast radius (or to opt those carve-outs back in for your own collections).

```ts
defineCollection({
  fields: {
    title: textField({}),
    subpath: textField({}),
  },
  pageCacheClearTriggers: {
    update: [
      { fields: ['title', 'subpath'], paths: ['/blog/**'] },
    ],
  },
})
```

Trigger options:

- `paths` - glob patterns of paths to clear. Defaults to `['**']` (everything).
- `fields` - only fire on `update` if at least one of these fields was changed.

Boolean shortcuts: `true` flushes everything on every operation, `false` disables invalidation completely.

## Duplicate and copy-translation

Both are opt-in. They light up the `/:id/duplicate` and `/:id/copy-translation` endpoints when set.

```ts
defineCollection({
  fields: {
    title: textField({}),
    slug: textField({ unique: true }),
  },
  duplicate: ({ source }) => ({
    ...source,
    slug: `${source.slug}-copy`,
  }),
  copyTranslation: ({ source, targetLanguage }) => ({
    ...source,
    slug: `${source.slug}-${targetLanguage}`,
  }),
})
```

`autoGenerated` fields are stripped from the returned payload, and `immutable` fields are dropped on `copyTranslation` when `operation === 'update'`. The framework also handles `language` and `translations` for you.

## TypeScript

Every collection gets fully typed query builders and a typed record shape. Importing `selectFrom`, `insertInto`, `update`, or `deleteFrom` from `#pruvious/server` gives you collection-name autocomplete and field-level type safety:

```ts
import { selectFrom } from '#pruvious/server'

const { data: articles } = await selectFrom('Articles')
  .select(['id', 'title', 'createdAt'])
  .where('isPublic', '=', true)
  .all()

// `articles` is typed as Array<{ id: number; title: string; createdAt: number }>
```

The corresponding client-side helper accepts the same names. See [Query Builder](./query-builder.md) for the full surface.

## Templates and built-in collections

Pruvious ships `Users`, `Roles`, `Pages`, `Patterns`, `Uploads`, and `Bookmarks` as concrete collections under `packages/pruvious/server/collections/`. Each of those files imports a matching **template** from `packages/pruvious/server/templates/` via `defineCollectionFromTemplate`. A template is a factory that returns the same options object you'd pass to `defineCollection`. You can accept the default template as-is, extend it, or replace it entirely with your own `defineCollection` call:

```ts
// server/collections/Users.ts
import { defineCollectionFromTemplate, textField } from '#pruvious/server'

export default defineCollectionFromTemplate('Users', (template) => ({
  ...template,
  fields: {
    ...template.fields,
    nickname: textField({}),
  },
}))
```

The callback receives the original template options. Spread them through and add or override whatever you need. You can change the dashboard UI, swap layouts, add hooks - everything `defineCollection` supports.

Define your own template under `server/templates/`:

```ts
// server/templates/Animals.ts
import { defineTemplate, textField } from '#pruvious/server'

export default defineTemplate(() => ({
  fields: {
    name: textField({ required: true }),
  },
}))

// server/collections/Dogs.ts
import { defineCollectionFromTemplate, textField } from '#pruvious/server'

export default defineCollectionFromTemplate('Animals', (template) => ({
  ...template,
  fields: {
    ...template.fields,
    breed: textField({ required: true }),
  },
}))
```

Templates are the recommended way to keep variations of a similar shape in sync - blog categories, product types, taxonomy entries - without duplicating field definitions.

## See also

- [Fields](./fields.md) - the full field catalogue
- [Singletons](./singletons.md) - one-record-per-language content
- [Hooks](./hooks.md) - lifecycle hooks and helpers
- [Query Builder](./query-builder.md) - typed reads, writes, and joins
