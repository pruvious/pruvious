# Pruvious

Pruvious is a free and open-source CMS for [Nuxt](https://nuxt.com). It plugs into your Nuxt project as a layer and gives you a typed schema, an admin dashboard, and a full HTTP API out of the box - so you can focus on building the site.

> [!WARNING]
> Version 4 is under active development. Do not use it in production yet.

## Quick start

Scaffold a new project with the `create-pruvious` CLI:

```sh
npm create pruvious@alpha
```

It copies a ready-to-run Nuxt + Pruvious starter, installs dependencies, and seeds a homepage. Start the dev server and visit [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to finish the install.

> [!NOTE]
> v4 is in alpha, so the command uses the `@alpha` channel. It becomes `npm create pruvious` once v4 is stable.

Prefer to add Pruvious to an existing Nuxt project? See the [manual installation](./docs/guide/installation.md#manual-installation) steps.

## What you get

You write content models as TypeScript files, and Pruvious turns them into a working backend:

```ts
// server/collections/Posts.ts
import { defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    title: textField({}),
  },
})
```

That single file gives you a `Posts` table, CRUD endpoints under `/api/collections/posts`, a typed query builder on both server and client, and a list view and editor in the dashboard.

## Documentation

The full documentation lives in [`./docs`](./docs/README.md). A few good places to start:

- [Introduction](./docs/guide/introduction.md) - What Pruvious is and how it thinks.
- [Installation](./docs/guide/installation.md) - Scaffold a project, or install manually.
- [Collections](./docs/essentials/collections.md) - Define your content models.
- [Fields](./docs/fields/index.md) - Browse all built-in field types.
- [Query builder](./docs/essentials/query-builder.md) - Typed, chainable queries.
- [Configuration](./docs/reference/configuration.md) - Every option in the `pruvious` module config.

## Packages

This repository is a monorepo. The published packages are:

| Package | Description |
|:---|:---|
| [`pruvious`](packages/pruvious) | The Nuxt module: collections, singletons, fields, API, and dashboard. |
| [`@pruvious/orm`](packages/orm) | The ORM under the hood (SQLite, PostgreSQL, and D1 drivers). |
| [`@pruvious/i18n`](packages/i18n) | Translation primitives and message patterns. |
| [`@pruvious/storage`](packages/storage) | File storage drivers (filesystem, S3, R2). |
| [`@pruvious/ui`](packages/ui) | The dashboard component library. |
| [`@pruvious/utils`](packages/utils) | Shared utilities used across the project. |

## Development

Pruvious uses [pnpm](https://pnpm.io) workspaces and targets the Node version in [`.nvmrc`](.nvmrc).

```sh
pnpm install   # install dependencies and build all packages
pnpm build     # build every package
pnpm play      # run the playground app
pnpm test      # run the test suite
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full setup, including the required `pnpm bootstrap` step, test service configuration, and code style.

## License

This repository is licensed under the [MIT License](./LICENSE).
