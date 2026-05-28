# Caching

Pruvious has two caches sharing one backend:

1. A general-purpose key-value cache used for token invalidation, multipart upload state, and anything you want to store yourself.
2. A page cache that serves rendered HTML for anonymous GET requests without running SSR.

Both live behind the same driver and the same primary prefix, so configuring one configures the other.

## Drivers

Pick a driver based on where you deploy. The default is the main database, which works everywhere but uses more rows than a dedicated store.

```ts
export default defineNuxtConfig({
  extends: ['pruvious'],
  pruvious: {
    cache: {
      driver: 'redis://localhost:6379/0',
      prefix: 'my-site',
    },
  },
})
```

Supported drivers:

| Driver | Connection string |
| --- | --- |
| Main database | `mainDatabase` (creates a `Cache` table) |
| SQLite | `sqlite://path/to/cache.sqlite` |
| PostgreSQL | `postgres://user:pass@host:5432/db?ssl=true` |
| Cloudflare D1 | `d1://CACHE` (binding name) |
| Redis | `redis://user:pass@host:6379/db` or `rediss://...` |

Redis backends use the server's built-in TTL. Database-backed caches expire lazily on read and a sweep runs on every HTTP request through the Pruvious middleware.

## The prefix

The `cache.prefix` option (default `pruvious`) namespaces every key. Internally Pruvious uses three reserved secondary prefixes:

- `{prefix}:invalidate:{token}` - invalidated auth tokens.
- `{prefix}:page:{path}` - cached HTML.
- `{prefix}:multipart:{id}` - multipart upload state.

Pick your own secondary prefixes for your own data.

## Using the cache from code

`#pruvious/server` exposes the full key-value API. Keys are automatically scoped to the configured prefix.

```ts
import { setCache, getCache, hasCache, deleteCache, clearCache, appendCache } from '#pruvious/server'

// Set a value that never expires.
await setCache('my-prefix:session-meta', JSON.stringify({ ... }))

// Set with an expiry (epoch ms, Date, or ISO string).
await setCache('my-prefix:token', 'abc', Date.now() + 60_000)

// Read.
const value = await getCache('my-prefix:token') // string | null

// Check existence.
await hasCache('my-prefix:token') // boolean

// Append to an existing string entry (creates it if missing).
await appendCache('my-prefix:log', 'new line\n')

// Delete one key.
await deleteCache('my-prefix:token')

// Delete every key under a secondary prefix.
await clearCache('my-prefix')

// Delete everything.
await clearCache()
```

Values are always strings - serialize structured data yourself.

## Page cache

When enabled, anonymous `GET` responses for public pages are stored and replayed without running SSR. Logged-in editors always see fresh content because requests carrying any auth token bypass the cache automatically.

### Configuration

```ts
pruvious: {
  cache: {
    page: {
      enabled: true,
      default: 'cache',           // 'cache' | 'bypass'
      defaultTTL: 300,            // seconds, or null to disable expiry
      defaultDebounce: 250,       // ms a concurrent request waits for an in-flight render
      defaultTimeout: 1000,       // ms before an in-flight render claim is treated as stuck
      defaultQueryString: 'separate', // 'separate' | 'ignore' | 'baseOnly'
      headers: true,              // emit X-Pruvious-Cache HIT / MISS / BYPASS
    },
  },
}
```

`default` decides the global policy:

- `'cache'` - cache everything public. Opt routes out with per-route rules.
- `'bypass'` - run SSR for every request. Opt routes in with per-route rules.

`defaultQueryString` controls how the URL's query string fits into the cache key:

- `'separate'` - different query strings produce different entries (keys are sorted and deduplicated).
- `'ignore'` - the query string is dropped; all variants share one entry.
- `'baseOnly'` - only requests without a query string are cached.

### Per-route rules

Each Route record has a `cacheRules{LANG}` field (one per language). Rules are evaluated top to bottom; the first one whose `include` glob matches the subpath wins.

```ts
[
  {
    include: '/blog/**',
    action: 'cache',
    ttl: 600,
    queryString: 'ignore',
  },
  {
    include: '/account/**',
    action: 'bypass',
  },
  {
    include: '/products/*',
    exclude: '/products/preview-*',
    action: 'cache',
    queryString: 'whitelist',
    whitelistedParams: ['sort', 'page'],
  },
]
```

Anything not matched falls back to the module-level `default`.

### Per-collection invalidation

When a routable collection or singleton is updated, the matching cache entries are cleared. Out of the box:

- Routable singletons whole-flush the cache on every update.
- Non-routable singletons do nothing.
- Routable collections clear the path of the affected record.

To customize, use `pageCacheClearTriggers` on `defineCollection()` and `defineSingleton()`:

```ts
defineSingleton({
  fields: { siteTitle: textField({}), favicon: imageField({}) },
  pageCacheClearTriggers: {
    update: [
      { fields: ['siteTitle'] },           // whole-flush only when siteTitle changes
      { paths: ['/blog/**'], fields: ['featuredPosts'] }, // clear /blog/** when featuredPosts changes
    ],
  },
})
```

Boolean shortcuts:

- `true` - whole-flush on every update.
- `false` - never invalidate.

### The debug header

When `cache.page.headers` is `true`, every response carries an `X-Pruvious-Cache` header you can inspect in DevTools or use in CDN rules:

| Value | Meaning |
| --- | --- |
| `HIT` | Served from cache. |
| `MISS` | Rendered fresh and stored. |
| `BYPASS-AUTH` | Request had an auth token. |
| `BYPASS-RULE` | A matching rule said `action: 'bypass'`. |
| `BYPASS-QS` | Query string mode forbade caching this request. |
| `BYPASS-LOCK` | Another worker is currently rendering this entry and the debounce wait elapsed; this request rendered fresh without caching. |

### Editor preview

Editors with the `preview-drafts` permission need to see drafts on the initial HTML navigation. For this to work, `auth.tokenStorage.storage` must be `'cookies'` (the default). With `'localStorage'`, the server cannot see the token on first paint and serves the cached anonymous response.

The token presence alone is enough to bypass the cache - no extra config required.

### Clearing the page cache

Two helpers and one endpoint:

```ts
import { clearPageCache, clearPageCachePaths } from '#pruvious/server'

await clearPageCache()                       // drop every entry
await clearPageCachePaths(['/blog/**'])      // glob, language-aware
```

```bash
# Requires the `clear-page-cache` permission.
curl -X POST http://localhost:3000/api/cache/page/clear \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "paths": ["/blog/**"] }'

# Omit `paths` (or pass an empty array) to clear everything.
```

## How the page cache key is built

The key looks like `page:{language}:{lowercased path}` and, when query is included, gets a `:q={sorted querystring}` suffix. Equivalent requests with reordered or duplicate query params resolve to the same key.
