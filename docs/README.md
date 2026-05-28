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

Prefer to add Pruvious to an existing Nuxt project? See the [manual installation](./guide/installation.md#manual-installation) steps.

## Documentation

### Guide

- [Introduction](./guide/introduction.md) - What Pruvious is and how it thinks.
- [Installation](./guide/installation.md) - Scaffold a project with `npm create pruvious@alpha`, or install manually.
- [Project structure](./guide/project-structure.md) - Where collections, fields, blocks, and hooks live.

### Essentials

- [Collections](./essentials/collections.md) - Define your content models.
- [Singletons](./essentials/singletons.md) - One-off records like site settings.
- [Fields](./essentials/fields.md) - The building blocks of every record.
- [Blocks](./essentials/blocks.md) - Composable page sections backed by Vue components.
- [Pages](./essentials/pages.md) - The standard `Pages` collection and how to compose pages.
- [Query builder](./essentials/query-builder.md) - Typed, chainable queries on the server and client.
- [Hooks](./essentials/hooks.md) - Run code on lifecycle events and react to actions and filters.

### Field reference

- [All fields](./fields/index.md) - Browse all 37 built-in field types with examples.

### Building sites

- [Routing](./building-sites/routing.md) - How URLs are resolved into routes.
- [Layouts](./building-sites/layouts.md) - Wire collection routes to Nuxt layouts.
- [SEO, sitemap, robots](./building-sites/seo.md) - Meta tags and search-engine surfaces.
- [Live preview](./building-sites/preview.md) - In-place editing for editors.

### Features

- [Authentication](./features/authentication.md) - Users, roles, JWT, and permissions.
- [Translations](./features/translations.md) - Per-language content and UI strings.
- [Uploads](./features/uploads.md) - File storage, image variants, and components.
- [Job queue](./features/queue.md) - Background and scheduled jobs.
- [Caching](./features/caching.md) - Page cache and key-value cache.
- [Logs](./features/logs.md) - API, query, queue, error, and custom logs.

### Dashboard

- [Overview](./dashboard/overview.md) - Layout, menus, and per-collection views.
- [Custom pages](./dashboard/custom-pages.md) - Add your own pages to the admin UI.
- [Icons](./dashboard/icons.md) - The Tabler icon set used throughout.

### Database

- [Overview](./database/overview.md) - Drivers, sync, and multiple databases.
- [ORM](./database/orm.md) - Raw queries, transactions, and lower-level escape hatches.

### API

- [REST endpoints](./api/rest.md) - The auto-generated HTTP routes.
- [Composables](./api/composables.md) - Helpers for Vue components and server handlers.

### Reference

- [Configuration](./reference/configuration.md) - Every option in `pruvious` module config.
- [Standard collections and singletons](./reference/standard-collections.md) - The built-in Users, Roles, Pages, Uploads, Patterns, and Bookmarks collections, plus the SEO singleton.

### Deployment

- [Overview](./deployment/overview.md) - Build, deploy, and operate Pruvious in production.

### Packages

- [`@pruvious/orm`](./packages/orm.md) - The ORM under the hood.
- [`@pruvious/i18n`](./packages/i18n.md) - Translation primitives.
- [`@pruvious/storage`](./packages/storage.md) - File storage drivers.
- [`@pruvious/utils`](./packages/utils.md) - Shared utilities.

## License

[MIT](../LICENSE)
