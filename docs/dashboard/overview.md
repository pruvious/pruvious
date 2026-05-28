# Dashboard overview

The Pruvious dashboard is a single-page Nuxt application that ships with every Pruvious project. It is where editors and administrators sign in, browse content, edit records, manage media, and configure singletons.

## Where the dashboard lives

By default the dashboard is served from `/dashboard/`. Visit `http://localhost:3000/dashboard/` after starting your Nuxt dev server and you will be redirected to the install page (first run) or the login page.

You can move the dashboard to any path by setting `dashboard.basePath` in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  pruvious: {
    dashboard: {
      basePath: '/admin/',
    },
  },
})
```

- Set it to an empty string or `/` to serve the dashboard at the site root.
- The chosen value is exposed at runtime as `useRuntimeConfig().public.pruvious.dashboardBasePath`.

## First-time install

The very first time you open the dashboard, Pruvious shows an install screen instead of the login form. It walks you through creating the first administrator account. After that user is saved, the install page disappears and the regular login flow takes over.

## Login and sessions

The login form accepts the user's email, password, and an optional "remember me" toggle. On success Pruvious issues a JSON Web Token that is stored according to the `pruvious.auth.tokenStorage` setting (cookies by default).

- Regular sessions expire after 4 hours.
- Sessions with "remember me" enabled expire after 7 days.
- Both durations can be tuned through `pruvious.auth.jwt.expiration`.

Once logged in, the client-side `useAuth()` composable holds the current user, their roles, and their resolved permission list.

```ts
import { useAuth, hasPermission } from '#pruvious/app'

const { isLoggedIn, user, permissions } = useAuth().value
const canEditUsers = hasPermission('collection:users:update')
```

## Auth guard

Every page under the dashboard base path is protected by the `dashboardAuthGuard` middleware. It enforces two rules:

- Unauthenticated requests are redirected to `/{basePath}/login` with a `?redirect=` query parameter that carries the original target.
- Authenticated users without the `access-dashboard` permission are sent back to `/` (or have the navigation aborted if the dashboard is mounted at the root).

You generally do not need to wire this up yourself; the `defineDashboardPage` macro and the `pruvious-dashboard-blank-layout` already apply it. Custom dashboard pages can opt into additional permission checks - see [Custom pages](./custom-pages.md).

## Sidebar menu

The sidebar is split into four groups:

- **General** - Overview, Routes, Media, and other global tools (SEO singleton, Patterns).
- **Collections** - One entry per collection. Pages lives here by default.
- **Management** - Users and Roles.
- **Utilities** - Logs and any custom pages you add to this group.

Inside each group, items are sorted by their `order` number first and then alphabetically by label. The standard items use these order values:

- General: Overview (1), Routes (2), Media (3), SEO (20), Patterns (100).
- Collections: Pages (10).
- Management: Users (1), Roles (2).
- Utilities: Logs (50).

### Customizing menu placement

Every collection, singleton, and custom page exposes a `dashboard` block (called `ui` on collections and singletons, or passed directly to `defineDashboardPage`). Use it to control the menu entry:

```ts
import { defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    title: textField({ required: true }),
  },
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Articles'),
    icon: 'news',
    menu: {
      group: 'collections',
      order: 5,
      hidden: false,
    },
  },
})
```

The following options are available:

- `label` - String or translatable callback shown in the menu and page heading. Falls back to the PascalCased filename.
- `icon` - Tabler icon name. See the [Icons](./icons.md) reference for the catalogue.
- `menu.group` - One of `general`, `collections`, `management`, `utilities`.
- `menu.order` - Lower numbers float to the top of the group.
- `menu.hidden` - Set to `true` to keep the collection accessible at its URL but hide it from the sidebar.

Custom pages accept the same `label`, `icon`, `group`, and `order` options through `defineDashboardPage` - see [Custom pages](./custom-pages.md).

## Collection views

Each collection in the sidebar opens a two-screen workflow:

1. **Table view** at `/{basePath}/collections/{collection}` lists records with sortable columns, search, filters, bulk actions, and pagination.
2. **Edit view** at `/{basePath}/collections/{collection}/{id}` (or `.../create`) renders the record form built from the collection fields.

You can shape both screens via the collection `ui` block:

```ts
defineCollection({
  fields: {
    title: textField({ required: true }),
    subpath: textField({}),
    isPublic: trueFalseField({}),
  },
  ui: {
    label: 'Articles',
    icon: 'news',
    indexPage: {
      dataTable: {
        columns: ['title', 'subpath | 16rem', 'isPublic | 8rem', 'updatedAt | 12rem'],
        orderBy: 'updatedAt:desc',
        perPage: 50,
      },
    },
    createPage: {
      fieldsLayout: [
        { card: ['title', 'subpath'] },
        { card: ['isPublic'] },
      ],
    },
    updatePage: { fieldsLayout: 'mirror' },
  },
})
```

- `indexPage.dataTable.columns` - Array of field names, optionally suffixed with `| <width>` to fix the column width. Object subfields are addressed with dot notation (for example `seo.title`).
- `indexPage.dataTable.orderBy` - Default sort, written as `field:direction` or as an array of objects.
- `indexPage.dataTable.perPage` - Page size (default `50`).
- `createPage.fieldsLayout` and `updatePage.fieldsLayout` - Layout descriptors composed of strings (field names), `{ row: [...] }`, `{ card: [...] }`, `{ tabs: [...] }`, and `'---'` separators. Pass `'mirror'` to reuse the create layout on the update screen.

## Singleton views

Singletons appear at `/{basePath}/singletons/{singleton}` and render as a single form. They expose the same `ui` controls as collections, except for the table-specific options. The built-in `SEO` singleton uses tabs to group fields:

```ts
defineSingleton({
  fields: { /* ... */ },
  ui: {
    label: 'SEO',
    icon: 'eye-search',
    menu: { group: 'general', order: 20 },
    fieldsLayout: [
      { tabs: [
        { label: 'General', fields: ['baseURL', 'baseTitle'] },
        { label: 'Branding', fields: ['logo', 'favicon'] },
      ] },
    ],
  },
})
```

## Custom pages

Drop a Vue component into `app/pages/dashboard/` and call `defineDashboardPage(...)` inside its `<script setup>` block. The macro registers the route, adds the menu entry, and wires up the auth guard. See [Custom pages](./custom-pages.md) for the full walkthrough.

## Field UI in the dashboard

Every field accepts an optional `ui` block that controls how it appears in the dashboard. The most common options are:

```ts
textField({
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Title'),
    description: ({ __ }) => __('pruvious-dashboard', 'Shown in the page header and browser tab.'),
    placeholder: 'My great article',
    hidden: false,
    dataTable: true,
  },
})
```

The full surface of the `ui` block is documented per field type - see the [Fields guide](../essentials/fields.md). Quick highlights:

- `label`, `description`, `placeholder` - Visible labels. They accept either a string or a translatable callback `({ __ }) => __('domain', 'string')`.
- `hidden` - Removes the field from the form (useful for system fields).
- `dataTable` - Set to `false` to hide the field from collection list columns.
- `customComponent` - Replace the default field input with your own Vue component. Combine with `resolvePruviousComponent('~/components/...')` in collection or template files.

## `dashboard.filterStylesheets`

The dashboard ships its own design system (the `.pui-` prefix) and intentionally hides any global styles that would otherwise leak in from your Nuxt app. The `pruvious.dashboard.filterStylesheets` option lists CSS selector or rule fragments that should be kept; everything else is disabled in the browser at runtime.

```ts
export default defineNuxtConfig({
  pruvious: {
    dashboard: {
      filterStylesheets: [
        '.p-',
        '.pui-',
        '--pui-',
        '[data-sonner-toaster]',
        '[data-tippy-root]',
        '.vue-inspector-',
        '.nuxt-devtools-',
        '.my-app-prefix-', // keep your own utility CSS in the dashboard
      ],
    },
  },
})
```

A stylesheet is preserved when at least one of its rules contains any of the listed strings in either its `selectorText` or `cssText`. Stylesheets with no selectors (for example `@font-face` blocks) are always kept.

## Profile and password reset

The dashboard exposes a profile page at `/{basePath}/me` where the signed-in user can update their:

- Email, first name, and last name.
- Password (current password is required).
- Content language and dashboard language.
- Time zone, date format, and time format.
- Smart clipboard toggle.

To reset another user's password, open the Users collection, edit the record, and update the `password` field. Only administrators may change the password or email of another administrator. Editors with the `logout-other-users` permission can also rotate a user's `tokenSubject`, which invalidates every active session for that user.

## Responsive layout

The dashboard is responsive down to phone-sized viewports. On narrow screens:

- The sidebar collapses behind a menu button in the top bar.
- Tables switch to a horizontally scrollable card view that prioritises the first configured column.
- Field layouts (`row`, `card`, `tabs`) stack vertically.

There is no separate "mobile dashboard" - the same routes, components, and permissions are used regardless of device.
