# Standard collections and singletons

Every Pruvious project ships with a small set of built-in collections and one built-in singleton. They cover the day-to-day needs of running a CMS - authentication, content authoring, media, SEO - and they double as reference implementations for the field types you can use in your own collections.

The standard collections are exposed as **templates**. Each project keeps a thin file in `server/collections/` that calls `defineCollectionFromTemplate('Name', t => t)`. That file is the extension point: change the callback, and the matching template is merged with your overrides at build time.

```ts
// server/collections/Users.ts
import { defineCollectionFromTemplate } from '#pruvious/server'

export default defineCollectionFromTemplate('Users', (template) => template)
```

The templates themselves live in `server/templates/` inside the Pruvious package. Templates from layers and your own `server/templates/` directory can override the built-ins by reusing the same name.

## Users

The `Users` collection stores accounts that can sign in to the dashboard or any other authenticated area.

### Fields

| Field | Type | Purpose |
| --- | --- | --- |
| `email` | text | Required, unique (case-insensitive), validated as an email. |
| `password` | text | Required, minimum 8 characters. Hashed with bcrypt before being stored. Never returned by the API. |
| `tokenSubject` | text | Auto-generated random string used as the JWT `sub` claim. Resetting it logs the user out everywhere. Hidden in the UI and stripped from API responses. |
| `isActive` | true/false | Defaults to `true`. Inactive users cannot sign in. |
| `isAdmin` | true/false | Promotes the user to administrator (bypasses permission checks). |
| `roles` | records (`Roles`) | Many-to-many link to the Roles collection. Permissions are aggregated from every assigned role. |
| `firstName`, `lastName` | text | Profile fields. |
| `contentLanguage` | select | The language to default to when editing translatable content. Choices come from `pruvious.i18n.languages`. |
| `dashboardLanguage` | select | UI language for the dashboard. Choices are derived from the `pruvious-dashboard` translation domain shipped by Pruvious; you can extend it by adding files under `server/translations/pruvious-dashboard.<lang>.ts`. |
| `timezone` | select | IANA timezone, or `local` to follow the browser. |
| `dateFormat`, `timeFormat` | text | Day.js format strings used when rendering dates and times in the dashboard. |
| `smartClipboard` | true/false | Opt-in background clipboard monitoring (requires browser permission). |
| `bookmarks` | records (`Bookmarks`) | The user's saved dashboard bookmarks. |

### Behavior

- Not translatable - each user has a single row regardless of language.
- API responses always mask `password` and `tokenSubject`. Filter and sort operations against those fields are denied at the query layer.
- Guards enforce administrator boundaries: non-admins cannot change the email, password, active status, or admin flag of an administrator, and only users with the `logout-other-users` permission can rotate someone else's `tokenSubject`.

### Extending Users

The most common extension is adding profile fields. Pass a callback that merges into the template:

```ts
// server/collections/Users.ts
import {
  defineCollectionFromTemplate,
  imageField,
  textField,
} from '#pruvious/server'

export default defineCollectionFromTemplate('Users', (template) => ({
  ...template,
  fields: {
    ...template.fields,
    avatar: imageField({
      ui: { label: ({ __ }) => __('pruvious-dashboard', 'Avatar') },
    }),
    jobTitle: textField({
      ui: { label: ({ __ }) => __('pruvious-dashboard', 'Job title') },
    }),
  },
  ui: {
    ...template.ui,
    updatePage: {
      fieldsLayout: [
        { card: [{ row: ['email', 'password'] }, { row: ['firstName', 'lastName'] }] },
        { card: ['avatar', 'jobTitle'] },
        { card: [{ row: ['isActive', 'isAdmin'] }, 'roles'] },
      ],
    },
  },
}))
```

Because `template` is the fully typed output of the underlying `defineTemplate`, spreading it preserves every field, hook, and guard. Override only what you need.

## Roles

`Roles` defines named permission bundles that you attach to users.

### Fields

| Field | Type | Purpose |
| --- | --- | --- |
| `name` | text | Required and unique. The label shown in the Users form. |
| `permissions` | chips | An array of permission strings. Choices come from the full list of permissions Pruvious knows about (collection CRUD, dashboard access, custom permissions you register). |

### Behavior

- Not translatable.
- Permissions are validated against the registered permission catalogue; unknown strings are rejected.
- A user's effective permission set is the union of `permissions` across every assigned role.

### Built-in permissions

Pruvious auto-generates permissions for every collection (and the standard ones come pre-registered). The pattern is `collection:{collection}:{action}`, where `{action}` is `read`, `create`, `update`, `delete`, or `manage`. Examples:

- `collection:users:read`, `collection:users:create`, `collection:users:update`, `collection:users:delete`.
- `collection:pages:update`, `collection:patterns:delete`.
- `singleton:seo:update`.

Pruvious also ships with a handful of cross-cutting permissions, including:

- `access-dashboard` - Required to open the dashboard at all.
- `read-logs` - Read access to the Logs section.
- `logout-other-users` - Permission to rotate another user's `tokenSubject`.
- `preview-drafts` - See draft and scheduled content while browsing the storefront.

Open the Roles editor in the dashboard to see the live, exhaustive list - it always reflects what your project currently registers.

## Pages

`Pages` is the default routable content collection. Records become public URLs by way of the `Routes` collection.

### Fields

| Field | Type | Purpose |
| --- | --- | --- |
| `blocks` | blocks | The page body. Root blocks `Button` and `ProseNode` are denied (they are only meaningful as nested children). |
| `subpath` | text | The URL segment beneath the parent route. Empty strings are allowed so a page can serve as the root of its route. |
| `seo` | SEO preset | Title, description, social image, indexability. The dashboard table shows the SEO title as the primary column. |
| `isPublic` | true/false | Drafts vs. published. Drafts are visible only to editors with `preview-drafts`. |
| `scheduledAt` | datetime | Optional publish-at timestamp. Pages flip to public automatically once the timestamp passes. |
| `author` | record (`Users`) | The creator (auto-filled). |
| `editors` | records (`Users`) | Co-editors who can update the page even without ownership. |
| `createdAt`, `updatedAt` | datetime | System timestamps. |
| `language`, `translations` | system | Per-language row plus a shared translation key (collection is translatable by default). |

### Routing and rendering

`Pages` is routable: every record produces an entry in the `Routes` table for its language, using the `page` layout. URLs are composed from the route's prefix plus `subpath`.

- Pruvious does not ship a frontend page for rendering routes. Create a catch-all Nuxt page (for example `app/pages/[...slug].vue`) that calls `usePruviousRoute()` or applies the `pruvious` route middleware to look up the matching route, hydrate the page, and render its blocks. See the [installation guide](../guide/installation.md) and the [pages reference](./standard-collections.md#pages) for examples.
- SEO metadata is merged with the global `SEO` singleton.
- When the page is unpublished, scheduled in the future, or marked non-indexable, the route is excluded from the sitemap.

### Customizing Pages

The default Pages template is intentionally minimal. Extend it the same way as Users:

```ts
import { blocksField, defineCollectionFromTemplate, textField } from '#pruvious/server'

export default defineCollectionFromTemplate('Pages', (template) => ({
  ...template,
  fields: {
    ...template.fields,
    excerpt: textField({
      ui: { label: ({ __ }) => __('pruvious-dashboard', 'Excerpt') },
    }),
  },
}))
```

## Uploads

`Uploads` represents both files and folders in the media library. The collection backs the media browser and every `imageField` or `fileField` reference.

### Fields

| Field | Type | Purpose |
| --- | --- | --- |
| `path` | text | Full virtual path (e.g. `/folder/file.jpg`). Required and unique. |
| `type` | button group | `file` or `directory`. Immutable after insert. |
| `level` | number | Auto-calculated nesting depth, used for fast tree queries. |
| `category` | select | Auto-detected from MIME (`image`, `video`, `document`, `audio`, `archive`, ...). |
| `mime` | text | Auto-derived MIME type. |
| `size` | number | File size in bytes. |
| `description` | translatable text | Used as image alt text and for accessibility. |
| `etag` | text | Storage ETag for cache invalidation. |
| `images` | chips | List of generated image variant keys. |
| `imageWidth`, `imageHeight` | number | Auto-populated for images. |
| `multipart` | object | Holds in-flight multipart upload state. |
| `isLocked` | switch | Prevents accidental deletion. |
| `author`, `editors` | records (`Users`) | Ownership and shared editing. |

### Behavior

- Not translatable.
- Direct API writes are blocked. Use the helpers from `#pruvious/server` to mutate uploads: `putUpload`, `moveUpload`, `updateUpload`, `deleteUpload`. They handle path normalisation, parent-directory creation, storage I/O, and image variant generation.
- The collection is hidden from the regular sidebar (`ui.hidden: true`). The dedicated Media entry at `/dashboard/media/...` provides the user-facing UI.

### Storage and variants

- Files are stored through the driver configured by `pruvious.uploads.driver` (local filesystem, Cloudflare R2, or any S3-compatible bucket).
- Maximum file size is controlled by `pruvious.uploads.maxFileSize` (default 128 MB).
- Image variants come from `pruvious.images.variants`. A `thumbnail` variant (`webp`, 320x320, contain) is always provided. Add more to pre-generate sizes:

```ts
export default defineNuxtConfig({
  pruvious: {
    images: {
      variants: {
        thumbnail: { format: 'webp', width: 320, height: 320, fit: 'contain' },
        medium: { format: 'webp', width: 1024 },
        large: { format: 'webp', width: 1920 },
      },
    },
  },
})
```

Variants are referenced from image fields via the `sources` option.

## Patterns

`Patterns` are reusable groups of blocks that editors can drop into any page. The Pattern block on the frontend renders the linked record's blocks inline.

### Fields

| Field | Type | Purpose |
| --- | --- | --- |
| `title` | text | Required. Identifies the pattern in the dashboard and the Pattern block picker. |
| `description` | textarea | Optional editorial notes. |
| `blocks` | blocks | The reusable block group. `Pattern` is denied at every nesting level (no recursion); `ProseNode` is denied at the root. |

### Behavior

- Routable internally (uses the `pattern` layout) but never publicly published - the `isPublic` field is forced to `false` on every insert and update, and is hidden from the form.
- Translatable, so each language can maintain its own copy of a pattern.
- Referenced from any collection through a `linkedBlocksField` (or directly from the Pattern block); when a pattern is updated, the page cache for everything that uses it is invalidated automatically.

## Bookmarks

`Bookmarks` is a convenience collection that stores the per-user saved filters, table layouts, and quick links shown in the dashboard.

### Fields

| Field | Type | Purpose |
| --- | --- | --- |
| `name` | text | Required. Display label in the bookmark menu. |
| `data` | text | Serialized bookmark payload (JSON). |
| `collection` | text | The collection or logs section the bookmark belongs to. |
| `user` | record (`Users`) | The owner. Auto-filled with the currently authenticated user. |
| `shared` | switch | When enabled, other dashboard users can use the bookmark. |

### Behavior

- Not translatable.
- Hidden from the sidebar - bookmarks are managed in-place within each collection's table view.
- Read access is scoped per user: a logged-in user sees their own bookmarks plus any `shared` ones. Writes and deletes are restricted to the owner.
- Bookmarks pointing at log subsections use the `logs:` prefix in `collection` (e.g. `logs:requests`).

## SEO singleton

`SEO` is the only built-in singleton. It centralises site-wide metadata defaults that every page falls back to.

### Fields

| Field | Type | Purpose |
| --- | --- | --- |
| `baseURL` | text | The site root, used to build absolute URLs in metadata and sitemaps. Trailing slashes and casing are normalised automatically. |
| `baseTitle` | text | Brand or site title appended to (or prepended before) the per-page title. |
| `titleSeparator` | text | The string used between the page title and the base title. Defaults to ` \| `. |
| `baseTitlePosition` | button group | Whether the base title appears `before` or `after` the page title. |
| `isIndexable` | true/false | Master switch for the language. When off, every per-page indexability flag is ignored and the language is removed from the sitemap. |
| `sharingImage` | image | Default Open Graph / Twitter image. Recommended size 1200x630. |
| `metaTags` | repeater | Arbitrary `<meta>` tags rendered in the document head. Each row picks an attribute (`name`, `property`, or `http-equiv`) plus a key and content. |
| `logo` | image | Used in the JSON-LD `Organization.logo` structured data. |
| `favicon` | image | Browser tab icon. |
| `socialLinks` | repeater | Profile URLs rendered as `sameAs` entries in structured data. |

### Behavior

- Per-language by default: title, description, sharing image, and indexability can differ between languages.
- The `baseURL`, `logo`, `favicon`, and `socialLinks` fields are synced across all languages (`syncedFields`), so updating any of them in one language updates every translation at the same time.
- Saving the singleton clears the page cache (`pageCacheClearTriggers: true`) so changes are immediately reflected on the storefront.
- The dashboard form is organised into three tabs: General, Branding, and Social.

## Extending a template versus writing from scratch

You have three options for any built-in collection:

1. **Keep the default** - leave the file in `server/collections/` untouched and let the template ship as-is.
2. **Extend it** - call `defineCollectionFromTemplate('Name', t => ({ ...t, fields: { ...t.fields, custom: ... } }))` to add fields, override hooks, or change the dashboard layout.
3. **Replace it** - delete the file under `server/collections/` and write a fresh `defineCollection` of your own. The matching template is still available if you want to call it from your file.

Because templates are just functions returning options, you can also create your own (drop them into `server/templates/MyTemplate.ts`) and reuse them across collections in the same project.
