# Pruvious

Pruvious is a free and open-source Content Management System (CMS) for [Nuxt](https://nuxt.com).

> [!IMPORTANT]  
> Version 4 is currently under development. Please don't use it in production environments yet.

## Installation

Create a new Nuxt project:

```bash
npm create nuxt
```

Fix the Nuxt version to `3.15.2` in your `package.json`. Versions above `3.15.2` currently have an issue with Nuxt layers that affects compatibility. This should be resolved in future updates.

Install Pruvious 4:

```bash
pnpm add https://pkg.pr.new/pruvious/pruvious/pruvious@v4
```

You can also use specific git commits instead of `@v4`. For example: `https://pkg.pr.new/pruvious/pruvious/pruvious@ad54f7d76d314b130918e652a585c05b54c12e46`

Add the Pruvious layer to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['pruvious'],
  pruvious: { auth: { jwt: { secret: 'dev' } } }, // Maintain login sessions during development
})
```

Remove the `app.vue` file from your project and start the development server:

```bash
pnpm dev
```

Visit http://localhost:3000/dashboard to complete the CMS installation.

The documentation for version 4 is currently under development. In the meantime, please refer to the inline code comments, which contain examples and explanations for most features.

### Tips

#### Creating Collections

To define a new collection, create a file in the `server/collections` folder of your project:

```ts
// server/collections/YourCollection.ts
import { defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    test: textField({}),
  },
})
```

#### Creating Singletons

Singletons (previously called single-entry collections in v3) can be defined by creating a file in the `server/singletons` folder:

```ts
// server/singletons/YourSingleton.ts
import { defineSingleton, textField } from '#pruvious/server'

export default defineSingleton({
  fields: {
    test: textField({}),
  },
})
```

#### Import Paths

- Use `#pruvious/server` imports for server-side code.
- Use `#pruvious/client` imports for client-side code.

You can find detailed documentation for each export in their code comments.

## Packages

- ✅ [i18n](#package-i18n)
- ✅ [orm](#package-orm)
- 🚧 [pruvious](#package-pruvious)
- ✅ [storage](#package-storage)
- 🚧 [ui](#package-ui)
- ✅ [utils](#package-utils)

### Icon Status Guide

- ✅ **Completed**: Feature is fully implemented and ready to use.
- 🚧 **In Progress**: Development has started but the feature is not yet finished.
- 👻 **Planned**: Feature is on the roadmap but development hasn't begun.

### 📦 <a id="package-i18n">i18n</a>

Package: <a href="packages/i18n">@pruvious/i18n</a>

| Status | Feature |
|:---:|:---|
| ✅ | Patterns |
| ✅ | Placeholders |
| ✅ | TypeScript types |
| ✅ | Tests |
| ✅ | Documentation |

### 📦 <a id="package-orm">orm</a>

Package: <a href="packages/orm">@pruvious/orm</a>

| Status | Feature |
|:---:|:---|
| ✅ | SQLite database driver |
| ✅ | PostgreSQL database driver |
| ✅ | D1 database driver |
| ✅ | Automatic schema migration |
| ✅ | Normalized SQL queries |
| ✅ | Normalized error handling |
| ✅ | Indexes |
| ✅ | Foreign keys |
| ✅ | Collections (table abstraction) |
| ✅ | Collections hooks |
| ✅ | Field models (general column abstraction) |
| ✅ | Fields (table column abstraction) |
| ✅ | Field sanitizers |
| ✅ | Field validators |
| ✅ | Field populators |
| ✅ | Field properties (required, nullable, etc.) |
| ✅ | Field conditional logic |
| ✅ | Field input filters |
| ✅ | Query builder |
| ✅ | Translatable error messages |
| ✅ | TypeScript types |
| ✅ | Tests |
| ✅ | Documentation |

### 📦 <a id="package-pruvious">pruvious</a>

Package: <a href="packages/pruvious">pruvious</a>

#### 🚧 API

| Status | Feature |
|:---:|:---|
| ✅ | Authentication |
| ✅ | Middleware |
| ✅ | Translations |
| ✅ | Logging |
| 🚧 | Tests |
| 🚧 | Documentation |

#### 🚧 Collections

| Status | Feature |
|:---:|:---|
| ✅ | Extended ORM implementation |
| ✅ | API |
| ✅ | Guards |
| ✅ | Translatable collections |
| ✅ | Synced fields |
| ✅ | Translation copying |
| ✅ | Record duplication |
| ✅ | Logging |
| ✅ | UI customization |
| ✅ | Reusable collection templates |
| 👻 | Page-like collections |
| ✅ | Resolvers |
| 👻 | Search structures |
| 👻 | Soft-deletion (trash) |
| 👻 | Revisions |
| ✅ | TypeScript types |
| 🚧 | Tests |
| 🚧 | Documentation |

#### 🚧 Fields

| Status | Feature |
|:---:|:---|
| ✅ | Extended ORM implementation |
| ✅ | Guards |
| ✅ | Custom fields |
| ✅ | UI customization |
| ✅ | Resolvers |
| ✅ | TypeScript types |
| 🚧 | Tests |
| 🚧 | Documentation |

#### 🚧 Field types

| Status | Feature |
|:---:|:---|
| 🚧 | Button group field |
| ✅ | Checkbox field |
| 👻 | Checkboxes field |
| 🚧 | Chips field |
| 👻 | Date field |
| 👻 | Date range field |
| 🚧 | Date-time field |
| 👻 | Date-time range field |
| 👻 | Editor field |
| 👻 | File field |
| 👻 | Gallery field |
| 👻 | Icon field |
| 👻 | Image field |
| 👻 | Link field |
| 🚧 | Number field |
| 👻 | Range field |
| 🚧 | Record field |
| 🚧 | Records field |
| 🚧 | Repeater field |
| ✅ | Select field |
| 👻 | Size field |
| 👻 | Slider field |
| 👻 | Slider range field |
| ✅ | Switch field |
| ✅ | Text field |
| 👻 | Text area field |
| 👻 | Time field |
| 👻 | Time range field |
| 🚧 | Timestamp field |
| ✅ | True-false field |

#### 🚧 Field presets

| Status | Feature |
|:---:|:---|
| 🚧 | Created at |
| 🚧 | Updated at |
| 🚧 | Author |
| 🚧 | Editors |
| 🚧 | Language |
| 🚧 | Translations |

#### 🚧 Validator presets

| Status | Feature |
|:---:|:---|
| ✅ | Email |
| ✅ | Timestamp |
| ✅ | Unique |
| ✅ | Upload path |
| ✅ | URL |
| 🚧 | More presets |
| ✅ | TypeScript types |
| 🚧 | Tests |
| 🚧 | Documentation |

#### 🚧 Singletons

| Status | Feature |
|:---:|:---|
| ✅ | Extended ORM implementation |
| ✅ | API |
| ✅ | Guards |
| ✅ | Translatable singletons |
| ✅ | Synced fields |
| ✅ | Translation copying |
| ✅ | Logging |
| ✅ | UI customization |
| ✅ | Resolvers |
| 👻 | Revisions |
| ✅ | TypeScript types |
| 🚧 | Tests |
| 🚧 | Documentation |

#### 🚧 Query builder

| Status | Feature |
|:---:|:---|
| ✅ | Collections (client-side) |
| ✅ | Collections (server-side) |
| ✅ | Singletons (client-side) |
| ✅ | Singletons (server-side) |
| ✅ | TypeScript types |
| 🚧 | Tests |
| 🚧 | Documentation |

#### 🚧 Hooks

| Status | Feature |
|:---:|:---|
| ✅ | Actions (client-side) |
| ✅ | Actions (server-side) |
| ✅ | Filters (client-side) |
| ✅ | Filters (server-side) |
| ✅ | Resolvers |
| ✅ | TypeScript types |
| 🚧 | Tests |
| 🚧 | Documentation |

#### 🚧 Uploads

| Status | Feature |
|:---:|:---|
| ✅ | API |
| ✅ | Image optimization |
| 👻 | UI |
| ✅ | TypeScript types |
| 🚧 | Tests |
| 🚧 | Documentation |

#### 🚧 Caching

| Status | Feature |
|:---:|:---|
| ✅ | API |
| ✅ | SQLite driver |
| ✅ | PostgreSQL driver |
| ✅ | D1 driver |
| ✅ | Redis driver |
| 👻 | Cloudflare CDN |
| 🚧 | Page caching |
| ✅ | TypeScript types |
| 🚧 | Tests |
| 🚧 | Documentation |

#### 🚧 Queue (jobs)

| Status | Feature |
|:---:|:---|
| ✅ | API |
| ✅ | SQLite driver |
| ✅ | PostgreSQL driver |
| ✅ | D1 driver |
| ✅ | TypeScript types |
| 🚧 | Tests |
| 🚧 | Documentation |

#### 🚧 Standard collections

| Status | Feature |
|:---:|:---|
| 👻 | Pages |
| 👻 | Presets |
| 🚧 | Users |
| 🚧 | Roles |
| ✅ | Uploads |
| ✅ | Cache |
| ✅ | Queue |
| ✅ | Logs |
| 🚧 | Tests |
| 🚧 | Documentation |

#### 🚧 Pages

| Status | Feature |
|:---:|:---|
| 👻 | API |
| 👻 | Blocks |
| 🚧 | SEO |
| 🚧 | Documentation |

#### 🚧 Dashboard

| Status | Feature |
|:---:|:---|
| ✅ | Authentication |
| ✅ | Custom components |
| ✅ | Edit profile |
| ✅ | Menus |
| ✅ | Responsive design |
| 🚧 | Custom dashboard page helper |
| 🚧 | Field components |
| 👻 | Developer menu |
| 👻 | Deployment tools |
| 👻 | Finder |
| 🚧 | Data table |
| 👻 | Media library |
| 🚧 | Documentation |

### 📦 <a id="package-storage">storage</a>

Package: <a href="packages/storage">@pruvious/storage</a>

| Status | Feature |
|:---:|:---|
| ✅ | Filesystem driver |
| ✅ | S3 driver |
| ✅ | R2 driver |
| ✅ | Read |
| ✅ | Stream |
| ✅ | Upload |
| ✅ | Multipart upload |
| ✅ | Move |
| ✅ | Delete |
| ✅ | TypeScript types |
| ✅ | Tests |
| ✅ | Documentation |

### 📦 <a id="package-ui">ui</a>

Package: <a href="packages/ui">@pruvious/ui</a>

| Status | Feature |
|:---:|:---|
| ✅ | Alert |
| ✅ | Badge |
| ✅ | Base |
| ✅ | Button |
| ✅ | Button group |
| ✅ | Card |
| ✅ | Checkbox |
| ✅ | Code |
| ✅ | Color mode |
| ✅ | Context menu |
| ✅ | Dialog |
| ✅ | Dropdown |
| ✅ | Dropdown item |
| ✅ | Field |
| ✅ | Field label |
| ✅ | Field message |
| ✅ | Icon group |
| ✅ | Input |
| ✅ | Number |
| ✅ | Pagination |
| ✅ | Popup |
| ✅ | Prose |
| ✅ | Scrollable |
| ✅ | Select |
| ✅ | Select choice |
| ✅ | Switch |
| ✅ | Tab |
| ✅ | Tabs |
| ✅ | Toaster |
| ✅ | Tree |
| ✅ | Tree item |
| ✅ | Vertical menu |
| ✅ | Vertical menu item |
| 🚧 | More components |

### 📦 <a id="package-utils">utils</a>

Package: <a href="packages/utils">@pruvious/utils</a>

| Status | Feature |
|:---:|:---|
| ✅ | Utility functions |
| ✅ | TypeScript types |
| ✅ | Tests |
| ✅ | Documentation |

## License

This repository is licensed under the [MIT License](./LICENSE).
