# Introduction

## What is Pruvious?

Pruvious is a Content Management System for [Nuxt](https://nuxt.com). It is a Nuxt layer you extend from, not a standalone app. You get a typed schema, an admin dashboard at `/dashboard`, a REST API under `/api/`, and a database that syncs itself to your code.

You write content models as TypeScript files. Pruvious turns them into database tables, dashboard screens, query builders, and API endpoints.

```ts
// server/collections/Posts.ts
import { defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    title: textField({}),
  },
})
```

That single file gives you:

- A `Posts` table in the database
- `GET`, `POST`, `PATCH`, `DELETE` endpoints under `/api/collections/posts`
- A typed query builder on both server and client
- A list view and editor in the dashboard

## Philosophy

**Code-first.** The schema lives in your repository. There is no UI for "create a collection" - you create a file, save it, and Pruvious picks it up.

**Typed end-to-end.** Field types flow from your definitions through the query builder, the API, and the dashboard. Renaming a field is a refactor, not a migration.

**Convention over configuration.** Files in `server/collections` are collections. Files in `app/blocks` are blocks. You can change every path, but you rarely need to.

**Nuxt-native.** Pruvious is a Nuxt layer. Your pages, components, layouts, and server routes work the way you already know them. Pruvious adds capabilities, it does not replace the framework.

## Mental model

Think of Pruvious as three things stacked on Nuxt:

1. **A schema layer.** You define collections, singletons, and fields. Pruvious keeps the database in sync, generates TypeScript types, and exposes a query builder.
2. **An admin layer.** A dashboard mounted at `/dashboard` reads your schema and renders editors, lists, and forms for every collection.
3. **An API layer.** A REST API mounted at `/api/` exposes CRUD for every collection, plus auth, uploads, logs, and cache.

You decide which parts of your app talk to which layer. The dashboard uses the API. Your own pages can use the API too, or call the server-side query builder directly inside a Nuxt route handler.

## How it relates to Nuxt

Pruvious is added with `extends: ['pruvious']` in `nuxt.config.ts`. Everything else is Nuxt:

- Your pages live in `app/pages`
- Your components live in `app/components`
- Your server routes live in `server/`
- Your `nuxt.config.ts` is still the source of truth

Pruvious adds a few directories on top - `server/collections`, `server/singletons`, `app/blocks` - and three import aliases:

- `#pruvious/server` for server-side code
- `#pruvious/app` for client-side app code
- `#pruvious/dashboard` for client-side dashboard code

See [Project structure](./project-structure.md) for the full layout.

> [!TIP]
> If you know Nuxt, you already know most of Pruvious. The rest is just file conventions and a few helpers.

## Next steps

- [Install Pruvious](./installation.md) in a fresh Nuxt project
- [Tour the project structure](./project-structure.md)
- [Define your first collection](../essentials/collections.md)
