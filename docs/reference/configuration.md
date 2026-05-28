# Configuration

Every Pruvious option lives under `pruvious` in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['pruvious'],
  pruvious: {
    database: { driver: 'sqlite://database.sqlite' },
    auth: { jwt: { secret: process.env.NUXT_PRUVIOUS_AUTH_JWT_SECRET } },
    // ...
  },
})
```

Most options have sensible defaults - you only need to override what you care about. In production, prefer environment variables for secrets (see [Deployment](../deployment/overview.md)).

This page lists every option in `PruviousModuleOptions`, grouped by top-level key.

## `database`

**Type:** `{ driver, sync }`
**Default:** `{ driver: 'sqlite://database.sqlite', sync: { dropNonCollectionTables: false, dropNonFieldColumns: false } }`

Configuration for the main database connection. By default Pruvious uses SQLite, auto-syncs the schema, and preserves any tables or columns it does not own.

### `database.driver`

**Type:** `` `sqlite://${string}` | `postgres://${string}` | `d1://${string}` ``
**Default:** `'sqlite://database.sqlite'`

The connection string for the main database.

```ts
pruvious: {
  database: { driver: 'postgres://app:secret@db.example.com:5432/pruvious?ssl=true' },
}
```

| Driver | Format | Notes |
| :--- | :--- | :--- |
| SQLite | `sqlite://path/to/file.sqlite` | Path is relative to cwd. |
| PostgreSQL | `postgres://user:pass@host:5432/db?ssl=true` | Requires the `pg` package. |
| Cloudflare D1 | `d1://BINDING` | Binding from `wrangler.toml`. |

### `database.sync`

**Type:** `boolean | { dropNonCollectionTables?: boolean; dropNonFieldColumns?: boolean }`
**Default:** `{ dropNonCollectionTables: false, dropNonFieldColumns: false }`

Controls automatic schema synchronization on connect. Pass `false` to disable, an object to customise.

- `dropNonCollectionTables` (default `false`) - drop tables that are not defined as collections.
- `dropNonFieldColumns` (default `false`) - drop columns that are not defined as fields.

```ts
pruvious: {
  database: {
    sync: { dropNonCollectionTables: true, dropNonFieldColumns: true },
  },
}
```

See [database overview](../database/overview.md#schema-sync-auto-migrations).

## `api`

**Type:** `{ basePath, middleware }`
**Default:** `{ basePath: '/api/', middleware: { include: ['/api/**'], exclude: ['/api/_*', '/api/_*/**', '/api/process-queue', '/api/routes/**'] } }`

Server-side API behavior.

### `api.basePath`

**Type:** `string`
**Default:** `'/api/'`

The URL prefix for every Pruvious endpoint. Change it if you want the API to live under `/cms/` or `/admin/api/`.

```ts
pruvious: { api: { basePath: '/cms/' } }
```

> [!WARNING]
> If you change `api.basePath`, also update `api.middleware.include`, `api.middleware.exclude`, and `debug.logs.api.include` / `debug.logs.api.exclude` to match. Otherwise the middleware and logger won't run on your new paths.

### `api.middleware.include`

**Type:** `string[]`
**Default:** `['/api/**']`

Glob patterns (via [`zeptomatch`](https://www.npmjs.com/package/zeptomatch)) for paths the Pruvious request middleware should process. The middleware attaches `event.context.pruvious`, resolves language, parses auth, and parses the body.

### `api.middleware.exclude`

**Type:** `string[]`
**Default:** `['/api/_*', '/api/_*/**', '/api/process-queue', '/api/routes/**']`

Exclusion patterns evaluated after `include`. The defaults skip internal endpoints and the queue handler.

## `uploads`

**Type:** `{ driver, basePath, maxFileSize }`
**Default:** `{ driver: 'fs://.uploads', basePath: '/uploads/', maxFileSize: 134217728 }`

File storage configuration.

### `uploads.driver`

**Type:** `` `fs://${string}` | `r2://${string}` | `s3://${string}` ``
**Default:** `'fs://.uploads'`

The storage backend.

| Driver | Format | Notes |
| :--- | :--- | :--- |
| Local FS | `fs://path/to/uploads` | Path is relative to cwd. |
| Cloudflare R2 | `r2://BINDING` | Binding from `wrangler.toml`. |
| AWS S3 | `s3://KEY:SECRET@s3.amazonaws.com/bucket?region=us-east-1&ssl=true` | |
| DigitalOcean Spaces | `s3://KEY:SECRET@nyc3.digitaloceanspaces.com/bucket?region=nyc3&ssl=true` | |
| MinIO | `s3://KEY:SECRET@play.min.io/bucket?region=us-east-1` | |

### `uploads.basePath`

**Type:** `string`
**Default:** `'/uploads/'`

Public URL prefix that uploaded files are served under. Files become `https://example.com/uploads/your-file.webp`.

### `uploads.maxFileSize`

**Type:** `number`
**Default:** `134217728` (128 MB)

Maximum size in bytes for a single uploaded file. Requests advertising a larger `Content-Length` are rejected with `413 Payload Too Large`. Set to `0` to disable the limit (not recommended).

## `images`

**Type:** `{ variants }`
**Default:** `{ variants: { thumbnail: { format: 'webp', width: 320, height: 320, fit: 'contain' } } }`

Image transformation presets.

### `images.variants`

**Type:** `Record<string, ImageVariantOptions>`

Named image variants that can be applied via image fields or the `optimize-image` endpoint. The built-in `thumbnail` variant is always merged in; you can override it by redefining it.

```ts
pruvious: {
  images: {
    variants: {
      thumbnail: { format: 'webp', width: 320, height: 320, fit: 'contain' },
      medium:    { format: 'webp', width: 1024 },
      large:     { format: 'webp', width: 1920 },
    },
  },
}
```

## `cache`

**Type:** `{ driver, prefix, page }`
**Default:** `{ driver: 'mainDatabase', prefix: 'pruvious', page: { ... } }`

Key-value cache used for token invalidation, page caching, and multipart upload state.

### `cache.driver`

**Type:** `'mainDatabase' | sqlite | postgres | d1 | redis | rediss`
**Default:** `'mainDatabase'`

Where to store cache entries.

- `mainDatabase` - creates a `Cache` table inside the main connection.
- `sqlite://path/to/cache.sqlite`
- `postgres://...`
- `d1://CACHE`
- `redis://username:password@host:6379/db`
- `rediss://...` for TLS

### `cache.prefix`

**Type:** `string`
**Default:** `'pruvious'`

Key namespace. All cache keys are stored as `{prefix}:{key}`. Secondary prefixes are used for built-in caches:

- `{prefix}:invalidate:{token}` - token blocklist
- `{prefix}:page:{path}` - HTML page cache
- `{prefix}:multipart:{id}` - in-progress multipart uploads

### `cache.page`

**Type:** `{ enabled, default, defaultTTL, defaultDebounce, defaultTimeout, defaultQueryString, headers }`
**Default:** `{ enabled: true, default: 'cache', defaultTTL: 300, defaultDebounce: 250, defaultTimeout: 1000, defaultQueryString: 'separate', headers: true }`

HTML page-cache configuration. When enabled, anonymous `GET` responses for public routes are stored and replayed without running SSR.

> [!WARNING]
> For editor preview to work, `auth.tokenStorage.storage` must be `'cookies'`. With `'localStorage'`, the server cannot detect the token on first paint and serves the cached anonymous response to editors.

#### `cache.page.enabled`

**Type:** `boolean`
**Default:** `true`

Master switch for the page-cache middleware.

#### `cache.page.default`

**Type:** `'cache' | 'bypass'`
**Default:** `'cache'`

What to do when no per-route rule matches the request path.

- `'cache'` - cache everything; opt out per route with rules.
- `'bypass'` - skip caching; opt in per route with rules.

#### `cache.page.defaultTTL`

**Type:** `number | null`
**Default:** `300`

Default cache lifetime in seconds. `null` disables expiry.

#### `cache.page.defaultDebounce`

**Type:** `number`
**Default:** `250`

How many milliseconds a concurrent request waits for an in-flight render before doing its own. Prevents the thundering-herd problem on a cold cache.

#### `cache.page.defaultTimeout`

**Type:** `number`
**Default:** `1000`

How many milliseconds before an in-flight render claim is considered stuck and a new render is allowed to take over.

#### `cache.page.defaultQueryString`

**Type:** `'separate' | 'ignore' | 'baseOnly'`
**Default:** `'separate'`

How to bucket cached entries by query string.

- `'separate'` - one entry per unique query (sorted, deduplicated).
- `'ignore'` - all query strings collapse into a single entry.
- `'baseOnly'` - only cache requests without query strings.

#### `cache.page.headers`

**Type:** `boolean`
**Default:** `true`

Whether to emit `X-Pruvious-Cache: HIT | MISS | BYPASS` on responses. Helpful for debugging and CDN rules.

## `queue`

**Type:** `{ driver, mode, secret }`
**Default:** `{ driver: 'mainDatabase', mode: 'auto', secret: <random> }`

Background job queue.

### `queue.driver`

**Type:** `'mainDatabase' | sqlite | postgres | d1`
**Default:** `'mainDatabase'`

Where queued jobs are stored. `mainDatabase` creates a `Queue` table in the main connection.

### `queue.mode`

**Type:** `'auto' | 'manual'`
**Default:** `'auto'`

When `'auto'`, Pruvious fires a non-blocking `POST /api/process-queue` after each HTTP request, draining the queue sequentially. When `'manual'`, processing only happens when something external (cron, scheduled worker) hits the endpoint.

Use `'manual'` on serverless platforms where outgoing requests after the response are unreliable, and hook a cron to `/api/process-queue` instead.

### `queue.secret`

**Type:** `string`
**Default:** `<random>` (generated at startup)

Bearer token required to call `/api/process-queue`. Set this in production so you can issue the cron request with a known value:

```sh
NUXT_PRUVIOUS_QUEUE_SECRET="long-random-string"
```

## `auth`

**Type:** `{ jwt, tokenResolution, tokenStorage, hash }`

Authentication and password hashing.

### `auth.jwt.secret`

**Type:** `string`
**Default:** `<random>` (generated at startup; do not rely on this in production)

The secret used to sign JWT tokens. Always set this in production via env var:

```sh
NUXT_PRUVIOUS_AUTH_JWT_SECRET="at-least-32-characters-of-randomness"
```

Changing it invalidates every existing token.

### `auth.jwt.expiration`

**Type:** `{ default: string | number, extended: string | number }`
**Default:** `{ default: '4h', extended: '7d' }`

Token lifetimes. Accepts duration strings (`'1d'`, `'30m'`) or numbers of seconds. The `extended` value is used when the login request includes `{ remember: true }`.

### `auth.jwt.claims`

**Type:** `Record<string, any>`
**Default:** `{}`

Extra claims to embed in every JWT. Useful for downstream services that already trust your JWTs.

### `auth.tokenResolution`

**Type:** `'authorizationHeader' | 'cookies' | ServerTokenSource | Array<...>`
**Default:**
```ts
[
  { source: 'authorizationHeader' },
  { source: 'cookies', headerAndPayload: 'token', signature: 'signature' },
]
```

Where the server looks for an auth token on each request and in what order.

```ts
// Cookies only
auth: { tokenResolution: 'cookies' }

// Custom cookie names
auth: {
  tokenResolution: { source: 'cookies', headerAndPayload: 'foo', signature: 'bar' },
}

// Both, cookies first
auth: { tokenResolution: ['cookies', 'authorizationHeader'] }
```

### `auth.tokenStorage`

**Type:** `'cookies' | 'localStorage' | ClientTokenStorage`
**Default:**
```ts
{
  storage: 'cookies',
  headerAndPayload: { name: 'token', secure: 'auto', sameSite: 'strict' },
  signature: { name: 'signature', httpOnly: true, secure: 'auto', sameSite: 'strict' },
}
```

How the client persists and sends the auth token.

- `'cookies'` - split-cookie strategy (HTTP-only signature, JS-readable header+payload). XSS-resistant. Required for page-cache preview.
- `'localStorage'` - token stored in `localStorage` and sent in `Authorization: Bearer`. Easier for non-browser clients but more XSS-exposed.

```ts
// localStorage with a custom key
auth: { tokenStorage: { storage: 'localStorage', key: 'token' } }
```

Cookie options accept the standard `httpOnly`, `secure` (`true | false | 'auto'`), `sameSite`, and `name` flags.

### `auth.hash`

**Type:** `{ algorithm, bcrypt }`
**Default:** `{ algorithm: 'bcrypt', bcrypt: { rounds: 12 } }`

Password hashing.

- `algorithm` - only `'bcrypt'` for now.
- `bcrypt.rounds` - work factor. Higher is more secure but slower; 12 is a good baseline.

## `i18n`

**Type:** `{ languages, primaryLanguage, prefixPrimaryLanguage, fallbackLanguages, preloadTranslatableStrings }`
**Default:** single-language English.

Internationalization.

### `i18n.languages`

**Type:** `{ name: string; code: string }[]`
**Default:** `[{ name: 'English', code: 'en' }]`

List of supported languages. The first entry is the primary language unless `primaryLanguage` overrides it.

`code` must be a BCP-47 subset: lowercase 2-3 letter base, optional Title-case script subtag, optional UPPERCASE region or 3-digit M.49 region. Valid examples: `en`, `de`, `de-AT`, `zh-Hant`, `sr-Latn-RS`, `es-419`.

```ts
i18n: {
  languages: [
    { name: 'English', code: 'en' },
    { name: 'Deutsch', code: 'de' },
    { name: 'Français', code: 'fr' },
  ],
}
```

> [!WARNING]
> Renaming a code is destructive - per-language column data is dropped on the next sync. Write a manual migration if you need to preserve content across a rename.

### `i18n.primaryLanguage`

**Type:** `string | null`
**Default:** `'en'`

The default and SEO-canonical language. Used for fallback content unless overridden by `fallbackLanguages`. If you only set `i18n.languages`, set this explicitly to the first entry's `code` when it is not `'en'`.

### `i18n.prefixPrimaryLanguage`

**Type:** `boolean`
**Default:** `false`

When `false`, the primary language uses unprefixed URLs (`/page`) and others are prefixed (`/de/page`). When `true`, every language is prefixed, including the primary.

### `i18n.fallbackLanguages`

**Type:** `string[] | null`
**Default:** `['en']` (hard-coded; the primary language is never substituted automatically)

Ordered fallback chain when content is missing in the requested language. Set this explicitly when your primary language is not English.

```ts
i18n: { fallbackLanguages: ['de', 'en'] } // try German, then English
i18n: { fallbackLanguages: [] }           // no fallback
```

### `i18n.preloadTranslatableStrings`

**Type:** `Record<string, boolean | { include?: string[]; exclude?: string[] }>`
**Default:** `{ default: { include: ['**'], exclude: [] } }`

Controls which translatable-string domains are preloaded on the client per path.

```ts
i18n: {
  preloadTranslatableStrings: {
    dashboard: true,
    shop: { include: ['/products/**', '/cart'], exclude: ['/products/test/**'] },
    blog: false,
  },
}
```

## `routing`

**Type:** `{ followRedirects, trailingSlash, seo, sitemap, robots }`
**Default:** `{ followRedirects: true, trailingSlash: false, seo: true, sitemap: { perPage: 5000 }, robots: true }`

Client-side route resolution and SEO defaults.

### `routing.followRedirects`

**Type:** `boolean`
**Default:** `true`

Whether `pruvious-route` middleware automatically follows redirects returned by `/api/routes/...`.

### `routing.trailingSlash`

**Type:** `boolean`
**Default:** `false`

When `true`, all routes are normalised to end with `/`. When `false`, they never do.

### `routing.seo`

**Type:** `boolean`
**Default:** `true`

When `true`, the middleware emits SEO `<head>` tags (title, meta, canonical, hreflang, JSON-LD, `htmlAttrs.lang`) from the resolved route's SEO data.

### `routing.sitemap`

**Type:** `boolean | { perPage?: number }`
**Default:** `{ perPage: 5000 }`

Controls `/sitemap.xml`. Set to `false` to disable. The `perPage` option splits large sitemaps into an index + paginated files (`/sitemap-1.xml`, `/sitemap-2.xml`, ...).

> [!TIP]
> Stay at or below 50,000 URLs per file - search engines reject larger files.

### `routing.robots`

**Type:** `boolean`
**Default:** `true`

Controls the built-in `/robots.txt`. Set to `false` if you serve your own.

## `dashboard`

**Type:** `{ basePath, filterStylesheets }`

### `dashboard.basePath`

**Type:** `string`
**Default:** `'/dashboard/'`

URL prefix for the dashboard. Use `''` or `'/'` to serve the dashboard at the site root.

```ts
dashboard: { basePath: '/admin/' }
```

### `dashboard.filterStylesheets`

**Type:** `string[]`
**Default:** `['.p-', '.pui-', '--pui-', '[data-sonner-toaster]', '[data-tippy-root]', '.vue-inspector-', '.nuxt-devtools-']`

The dashboard disables every stylesheet whose rules do not contain at least one of these substrings (matched against `selectorText` or `cssText`). Keeps your site CSS from leaking into the admin UI.

## `debug`

**Type:** `{ verbose, logs, warnings }`

### `debug.verbose`

**Type:** `boolean`
**Default:** `false`

Detailed console logging. In production, enable with `NUXT_PRUVIOUS_DEBUG_VERBOSE=true`. In dev, the CLI flag `--pruviousVerbose` also works.

> [!WARNING]
> Verbose mode logs SQL queries with their parameters. Don't enable in production unless you understand the exposure.

### `debug.warnings`

**Type:** `'all' | 'critical'`
**Default:** `'all'`

How chatty Pruvious is about warnings during dev.

### `debug.logs`

**Type:** `boolean | { driver, api, queries, queue, errors, custom, cleanup }`
**Default:** `false`

When enabled, Pruvious logs API traffic, database queries, queue events, and errors to a dedicated database. Admins and users with `read-logs` can view them in the dashboard.

```ts
// Quick on/off
debug: { logs: true }

// Detailed
debug: {
  logs: {
    driver: 'sqlite://logs.sqlite',
    api: { exposeRequestData: false, exposeResponseData: false },
    queries: true,
    queue: true,
    errors: true,
    custom: true,
    cleanup: { maxAge: '30d', interval: '1h' },
  },
}
```

#### `debug.logs.driver`

**Type:** `sqlite | postgres | d1`
**Default:** `'sqlite://logs.sqlite'`

Where to write log entries. Separate from the main database by default so logs do not bloat your collections store.

#### `debug.logs.api`

**Type:** `boolean | { include, exclude, exposeRequestData, exposeResponseData }`
**Default:** `true`

API request/response logging.

- `include` (default `['/api/**']`) - glob patterns to log.
- `exclude` (default `['/api/_*', '/api/_*/**', '/api/logs/**']`) - glob patterns to skip.
- `exposeRequestData` (default `false`) - store full request bodies. When `false`, values are replaced with their type names.
- `exposeResponseData` (default `false`) - store full response bodies and sensitive headers.

> [!WARNING]
> Setting either expose flag to `true` may store passwords, tokens, or PII. Use cautiously.

#### `debug.logs.queries`

**Type:** `boolean | { include, exclude }`
**Default:** `true`

Database query logging.

- `include` (default `['**']`)
- `exclude` (default `['/api/logs/**']`)

For finer per-collection control, use `logs: ...` in `defineCollection`.

#### `debug.logs.queue`

**Type:** `boolean`
**Default:** `true`

Log queue job runs.

#### `debug.logs.errors`

**Type:** `boolean`
**Default:** `true`

Log server-side errors.

#### `debug.logs.custom`

**Type:** `boolean`
**Default:** `true`

Enable the `customLog()` helper.

```ts
import { customLog } from '#pruvious/server'

await customLog('New user registered', { type: 'info', payload: { email } })
```

#### `debug.logs.cleanup`

**Type:** `boolean | { maxAge, interval }`
**Default:** `true` -> `{ maxAge: '30d', interval: '1h' }`

Automatic log retention.

- `maxAge` - logs older than this are deleted. Duration string or seconds.
- `interval` - how often the cleanup job runs.

## `dir`

Customise the directory structure used by Pruvious.

| Option | Default | Relative to |
| :--- | :--- | :--- |
| `dir.actions.client` | `'actions'` | `srcDir` |
| `dir.actions.server` | `'actions'` | `serverDir` |
| `dir.api` | `'pruvious-api'` | `serverDir` |
| `dir.blocks` | `'blocks'` | `srcDir` |
| `dir.build` | `'.pruvious'` | `rootDir` |
| `dir.buildAutoload` | `'build'` | `serverDir` |
| `dir.collections` | `'collections'` | `serverDir` |
| `dir.fields.components` | `'fields'` | `srcDir` |
| `dir.fields.definitions` | `'fields'` | `serverDir` |
| `dir.filters.client` | `'filters'` | `srcDir` |
| `dir.filters.server` | `'filters'` | `serverDir` |
| `dir.hooks.client` | `'hooks'` | `srcDir` |
| `dir.hooks.server` | `'hooks'` | `serverDir` |
| `dir.jobs` | `'jobs'` | `serverDir` |
| `dir.singletons` | `'singletons'` | `serverDir` |
| `dir.translations` | `'translations'` | `serverDir` |
| `dir.templates` | `'templates'` | `serverDir` |

## `blocksPrefix`

**Type:** `string`
**Default:** `''`

String prepended to block component names during auto-registration. Use it to avoid namespace clashes with your own components.

```ts
pruvious: { blocksPrefix: 'My' }
// blocks/Hero.vue is registered as <MyHero />
```

## Next steps

- [Deployment](../deployment/overview.md) - Map config to env vars for production
- [Database overview](../database/overview.md) - Drivers and sync
- [REST API](../api/rest.md) - Endpoints generated from your config
