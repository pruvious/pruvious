# Singletons

A singleton is a piece of content that exists only once - per language. Site SEO settings, header navigation, theme options, a homepage carousel - all good fits. Unlike a [collection](./collections.md), there is no list view, no `id`, no `create` or `delete`. You only read or update the one record.

> [!TIP]
> **Coming from v3?**
> Singletons are what v3 called "single-entry collections". The new API is shorter and the data lives in a dedicated singleton table, separate from your collections.

## Basic example

Drop a file into `server/singletons/`. The filename - PascalCase - becomes the singleton name.

```ts
// server/singletons/SEO.ts
import { defineSingleton, imageField, textField, urlValidator } from '#pruvious/server'

export default defineSingleton({
  fields: {
    baseURL: textField({
      validators: [urlValidator()],
    }),
    baseTitle: textField({ default: 'My Pruvious Site' }),
    logo: imageField({}),
  },
})
```

That's enough to:

- Create one record per language under the `SEO` singleton.
- Expose a dashboard page for editors.
- Generate REST endpoints under `/<api.basePath>/singletons/seo`.
- Add typed query builders accessible as `selectSingleton('SEO')` and `updateSingleton('SEO')`.

Singletons cannot be renamed via options - the filename is the source of truth.

## Fields

`fields` works exactly like in [collections](./collections.md): a map of `camelCase` names to field instances. The `updatedAt` field is reserved when the preset is enabled (see [Auto-managed fields](#auto-managed-fields)).

```ts
import { defineSingleton, imageField, repeaterField, textField } from '#pruvious/server'

export default defineSingleton({
  fields: {
    logo: imageField({}),
    footerLinks: repeaterField({
      subfields: {
        label: textField({ required: true }),
        url: textField({ required: true }),
      },
    }),
  },
})
```

See [Fields](./fields.md) for everything you can put inside `fields`.

## Translations

Singletons are `translatable` by default. Each language gets its own row in the singleton table.

```ts
defineSingleton({
  fields: { tagline: textField({}) },
  // translatable: true is the default
})
```

Set it to `false` for shared, language-agnostic content:

```ts
defineSingleton({
  translatable: false,
  fields: { stripePublishableKey: textField({}) },
})
```

### Synced fields

Some fields should match across all languages - a base URL, a logo, social links. Add them to `syncedFields` and edits propagate automatically.

```ts
defineSingleton({
  fields: {
    baseURL: textField({}),
    logo: imageField({}),
    socialLinks: repeaterField({ /* ... */ }),
    tagline: textField({}),
  },
  syncedFields: ['baseURL', 'logo', 'socialLinks'],
})
```

Synced fields must not depend on other fields via `conditionalLogic` or `dependencies` - the sync runs as a partial update.

## Auto-managed fields

Singletons add a single managed field by default:

| Option | Default | What it does |
| --- | --- | --- |
| `updatedAt` | `true` | Adds a timestamp updated whenever the singleton is saved. |

Disable or customize it just like on collections:

```ts
defineSingleton({
  fields: { /* ... */ },
  updatedAt: false,
})
```

```ts
defineSingleton({
  fields: { /* ... */ },
  updatedAt: {
    ui: { label: 'Last saved' },
  },
})
```

## Dashboard UI

`ui` controls how the singleton looks in the admin. Every key is optional.

```ts
defineSingleton({
  fields: { /* ... */ },
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'SEO'),
    icon: 'eye-search',
    menu: { group: 'general', order: 20 },
    fieldsLayout: [
      {
        tabs: [
          {
            label: ({ __ }) => __('pruvious-dashboard', 'General'),
            fields: [
              'baseURL',
              { row: ['baseTitle', 'titleSeparator | 16rem'] },
              { card: ['isIndexable'] },
            ],
          },
          {
            label: ({ __ }) => __('pruvious-dashboard', 'Branding'),
            fields: ['logo', '---', 'favicon'],
          },
        ],
      },
    ],
  },
})
```

- `icon` is any [Tabler icon](https://tabler-icons.io) name. Default: `settings`.
- `menu.group` is one of `general`, `collections`, `management`, or `utilities` - singletons default to `general`.
- `fieldsLayout` accepts rows, tabs, cards, `---` separators, and custom Vue components via `resolvePruviousComponent()`.
- `dashboardLayout` selects the page shell. Defaults to `auto`, which picks `live-preview` when `routing` is enabled and `standard` otherwise.

Set `ui.hidden: true` to hide a singleton from the dashboard entirely. The REST endpoints stay live.

## Hooks

The hook surface mirrors collections, but the operation can only be `select` or `update`.

```ts
defineSingleton({
  fields: { tagline: textField({}) },
  hooks: {
    beforeQueryPreparation: [
      ({ operation }) => {
        if (operation === 'update') {
          console.log('saving singleton')
        }
      },
    ],
    beforeQueryExecution: [
      (context, { query }) => {
        console.log('sql:', query.sql)
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

Throw inside `beforeQueryPreparation` or `beforeQueryExecution` to halt the query. Avoid throwing in `afterQueryExecution` - errors there may not be caught.

## Guards

Guards are functions that run on every query. They get the same context as hooks and throw to deny access.

```ts
defineSingleton({
  fields: { /* ... */ },
  guards: [
    ({ _ }) => {
      if (!useEvent().context.pruvious.auth.isLoggedIn) {
        throw new Error(_('You must be logged in'))
      }
    },
  ],
})
```

Guards only fire when you use the guarded query builder helpers: `guardedSelectSingleton` and `guardedUpdateSingleton`. Pruvious's REST endpoints always use the guarded variants.

The built-in auth guard checks `singleton:{slug}:read` and `singleton:{slug}:update` permissions. Customize it the same way as on collections:

```ts
defineSingleton({
  fields: { /* ... */ },
  authGuard: ['update'], // public reads, protected updates
})
```

Set `authGuard: false` to opt out entirely.

## API endpoints

Singletons expose two endpoints, both on by default:

- `GET /<api.basePath>/singletons/{slug}` - read the current singleton.
- `PATCH /<api.basePath>/singletons/{slug}` - update one or more fields.

Toggle them with `api`:

```ts
defineSingleton({
  fields: { /* ... */ },
  api: {
    read: true,
    update: false, // read-only via HTTP
  },
})
```

Pass `api: false` to disable everything.

## Logs

Singleton queries are logged by default. Inspect them in the dashboard with the `read-logs` permission. Requires `pruvious.debug.logs.queries` to be enabled in `nuxt.config.ts`.

Unlike collections, singleton `exposeData` defaults to `true` - actual values are written to the log table out of the box. Opt out when a singleton holds sensitive data:

```ts
defineSingleton({
  fields: { /* ... */ },
  logs: {
    exposeData: false, // hide actual values
    operations: { insert: true, select: true },
  },
})
```

Singleton updates internally run as `UPSERT`, so the `insert` operation is the one that gets logged.

## Page cache invalidation

By default a routable singleton flushes the whole page cache on update, and a non-routable singleton flushes nothing. Tune the behavior with `pageCacheClearTriggers`.

```ts
defineSingleton({
  fields: { tagline: textField({}) },
  // Always clear the whole cache when this singleton changes:
  pageCacheClearTriggers: true,
})
```

```ts
defineSingleton({
  fields: {
    homeHero: textField({}),
    footer: textField({}),
  },
  pageCacheClearTriggers: {
    update: [
      { fields: ['homeHero'], paths: ['/'] },
      { fields: ['footer'] }, // any path
    ],
  },
})
```

## Copy translation

Implement `copyTranslation` to light up the `/<slug>/copy-translation` endpoint. The dashboard uses it to seed a translation from another language.

```ts
defineSingleton({
  fields: { /* ... */ },
  copyTranslation: ({ source }) => source,
})
```

The function returns the data used to update the target translation. Pruvious automatically strips `autoGenerated` and `immutable` fields. Only meaningful when the singleton is `translatable`.

## Routable singletons

Most singletons feed multiple pages from a side panel. A handful, though, represent one specific URL - a "My account" page, a custom landing screen. Set `routing` to bind a singleton to a route in the `Routes` collection.

```ts
defineSingleton({
  fields: {
    title: textField({}),
    blocks: blocksField({}),
  },
  routing: {
    publicFields: ['title', 'blocks'],
    layout: 'page',
  },
})
```

Unlike collections, singletons don't get a `subpath`. The URL comes from the `Routes` record you attach to the singleton.

## Querying a singleton

On the server, use `selectSingleton` and `updateSingleton` from `#pruvious/server`:

```ts
import { selectSingleton, updateSingleton } from '#pruvious/server'

const seo = await selectSingleton('SEO')
  .select(['baseURL', 'baseTitle'])
  .get()

// seo.data => { baseURL: 'https://example.com', baseTitle: 'My site' }

await updateSingleton('SEO')
  .set({ baseTitle: 'New title' })
  .run()
```

Use the guarded variants - `guardedSelectSingleton` and `guardedUpdateSingleton` - inside HTTP handlers when you want guards and permissions to apply automatically.

For a translated singleton, target a specific language:

```ts
await updateSingleton('SEO')
  .set({ baseTitle: 'Mein Titel' })
  .language('de')
  .run()
```

The same singleton names are available on the client through the auto-generated query builder. See [Query Builder](./query-builder.md) for the full surface, including `language`, `populate`, and `returning`.

## TypeScript

`selectSingleton('SEO')` and `updateSingleton('SEO')` autocomplete the singleton name and infer the field shape, including which fields are nullable or auto-generated. The same goes for the dashboard, REST clients, and any utility that takes a singleton name - the types come straight from your `fields` definition.

## See also

- [Fields](./fields.md) - the full field catalogue
- [Collections](./collections.md) - many-record content models
- [Hooks](./hooks.md) - lifecycle hooks and helpers
- [Query Builder](./query-builder.md) - typed reads and updates
