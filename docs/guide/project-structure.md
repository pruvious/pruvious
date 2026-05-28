# Project structure

Pruvious follows Nuxt's conventions and adds a few directories of its own. Nothing here is magic - every path can be customized via the `dir` option in `nuxt.config.ts` - but the defaults are what most projects use.

## Overview

```text
my-app/
├── app/
│   ├── actions/        # Action callbacks (client-side)
│   ├── blocks/         # Block components (.vue)
│   ├── components/     # Regular Nuxt components
│   ├── fields/         # Custom field components (.vue)
│   ├── filters/        # Filter callbacks (client-side)
│   ├── hooks/          # Action and filter definitions (client-side)
│   ├── layouts/        # Nuxt layouts
│   └── pages/          # Nuxt pages
├── server/
│   ├── actions/        # Action callbacks (server-side)
│   ├── collections/    # Collection definitions
│   ├── fields/         # Custom field definitions
│   ├── filters/        # Filter callbacks (server-side)
│   ├── hooks/          # Action and filter definitions (server-side)
│   ├── jobs/           # Background job definitions
│   ├── pruvious-api/   # Custom API route handlers
│   ├── singletons/     # Singleton definitions
│   ├── templates/      # Reusable collection templates
│   └── translations/   # Translatable strings
├── .pruvious/          # Generated build files (gitignored)
├── .uploads/           # Local uploads (gitignored)
└── nuxt.config.ts
```

## The `server/` directory

This is where the schema lives. Everything under `server/` runs on the server.

### `server/actions/`, `server/filters/`, `server/hooks/`

Pruvious uses two kinds of event handlers:

- **Actions** are fire-and-forget side effects (logging, notifications, cache invalidation).
- **Filters** transform values as they flow through the system.

`server/actions/` and `server/filters/` hold callbacks that subscribe to existing events. `server/hooks/` holds `actions/` and `filters/` subdirectories where you can define brand new event names.

### `server/collections/`

Collections are your content models. One file per collection.

```ts
// server/collections/Posts.ts
import { defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    title: textField({}),
  },
})
```

Pruvious creates a database table, REST endpoints, and dashboard screens for every file here.

### `server/fields/`

Custom field definitions. Drop a file here to register a new field type. Pair each definition with a Vue component in `app/fields/`.

### `server/jobs/`

Background jobs. Pruvious runs them through its queue system. One file per job.

### `server/pruvious-api/`

Custom API route handlers. Files here are mounted under the base API path (`/api/` by default).

### `server/singletons/`

Singletons hold one-of-a-kind content like site settings or homepage hero blocks.

```ts
// server/singletons/Settings.ts
import { defineSingleton, textField } from '#pruvious/server'

export default defineSingleton({
  fields: {
    siteName: textField({}),
  },
})
```

### `server/templates/`

Reusable collection blueprints. Useful when several collections share the same shape.

### `server/translations/`

Translatable strings, organized by domain.

## The `app/` directory

This is the Nuxt client. Pruvious adds a few conventions on top of the usual `pages`, `layouts`, `components` setup.

### `app/actions/`, `app/filters/`, `app/hooks/`

The client-side mirrors of `server/actions/`, `server/filters/`, and `server/hooks/`. Put callbacks here when they need to run in the browser instead of on the server.

### `app/blocks/`

Block components. Each `.vue` file is auto-registered as a global component. The block's metadata is declared with `defineBlock`, and its fields are declared inside `defineProps` using the same field functions you use in collections - imported from `#pruvious/app` instead of `#pruvious/server`.

```vue
<!-- app/blocks/Hero.vue -->
<template>
  <section>
    <h1>{{ title }}</h1>
  </section>
</template>

<script lang="ts" setup>
import { defineBlock, textField } from '#pruvious/app'

defineBlock({
  ui: { icon: 'photo' },
})

defineProps({
  title: textField({ required: true }),
})
</script>
```

You can prefix all block components with the `blocksPrefix` module option to avoid naming collisions with other auto-registered Vue components.

### `app/fields/`

Vue components for custom field types defined in `server/fields/`. The filename should match the field definition.

### `app/components/`, `app/layouts/`, `app/pages/`

Standard Nuxt directories. Pruvious does not touch them.

## Import paths

Pruvious exposes three TypeScript path aliases. Pick the right one for where your code runs.

### `#pruvious/server`

Server-side code: collections, singletons, hooks, jobs, custom API routes, anything in `server/`.

```ts
import { assertUserPermissions, defineCollection, selectFrom } from '#pruvious/server'
```

### `#pruvious/app`

Client-side code in your site - pages, components, composables, anything in `app/` that is **not** part of the dashboard.

```ts
import { useAuth, useLanguage, usePruviousRoute } from '#pruvious/app'
```

### `#pruvious/dashboard`

Client-side code that runs **inside the dashboard** - custom dashboard pages, custom field components, dashboard menu entries.

```ts
import { defineDashboardPage, upload, usePruviousDashboard } from '#pruvious/dashboard'
```

> [!TIP]
> If you are unsure, the rule of thumb is: server code uses `#pruvious/server`, your public site uses `#pruvious/app`, and anything mounted under `/dashboard` uses `#pruvious/dashboard`.

## Generated and ignored directories

### `.pruvious/`

Pruvious regenerates this on every build. It contains the runtime entrypoints for the three import aliases, generated types, and dashboard manifests. Do not edit anything here - it will be overwritten.

### `.uploads/`

The default local upload directory. Used by the `fs://` storage driver. Swap to S3, R2, or another bucket via the `uploads.driver` module option.

Both directories should be in your `.gitignore`. See [Installation](./installation.md) for the full set.

## Customizing paths

Every default path is configurable via `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['pruvious'],
  pruvious: {
    dir: {
      collections: 'models',
      blocks: 'sections',
      build: '.cache/pruvious',
    },
  },
})
```

See the [module options reference](../reference/configuration.md) for the full list.

## Next steps

- [Define your first collection](../essentials/collections.md)
- [Build pages with blocks](../essentials/blocks.md)
- [Customize the dashboard](../dashboard/overview.md)
