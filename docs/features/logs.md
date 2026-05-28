# Logging

Pruvious can record everything that happens on the server - requests, responses, database queries, job runs, errors, and your own custom events - in a dedicated logs database. Logs are visible in the dashboard at `/dashboard/logs` for admins and users with the `read-logs` permission.

Logging is opt-in and disabled by default.

## Enabling logs

Flip the master switch in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['pruvious'],
  pruvious: {
    debug: {
      logs: true,
    },
  },
})
```

`true` enables every channel (API, queries, queue, errors, custom) with their default settings and turns on the cleanup job. Pass an object for finer control:

```ts
pruvious: {
  debug: {
    logs: {
      driver: 'sqlite://logs.sqlite',
      api: true,
      queries: true,
      queue: true,
      errors: true,
      custom: true,
      cleanup: { maxAge: '30d', interval: '1h' },
    },
  },
}
```

Logs go to a separate database so they never compete with your content tables.

## Drivers

```ts
pruvious: {
  debug: {
    logs: {
      driver: 'sqlite://logs.sqlite',
      // 'sqlite://path/to/logs.sqlite' (relative to cwd)
      // 'postgres://user:pass@host:5432/db?ssl=true'
      // 'd1://LOGS'  (Cloudflare D1 binding)
    },
  },
}
```

Default is `sqlite://logs.sqlite`. A separate file/database is created and the log tables are synced on startup.

## What gets logged

Five channels, each independently toggleable:

### API requests and responses

Every matching HTTP request becomes one `Requests` row and one `Responses` row, joined by a `requestDebugId`. The defaults capture every `/api/**` path except internal helpers.

```ts
api: {
  include: ['/api/**'],
  exclude: ['/api/_*', '/api/_*/**', '/api/logs/**'],
  exposeRequestData: false,  // see below
  exposeResponseData: false, // see below
}
```

If you change `api.basePath`, update `include` accordingly.

### Database queries

Every query against the main database becomes a `Queries` row with the SQL, parameters, execution time, operation, and serialized result. Defaults capture every path except the logs API.

```ts
queries: {
  include: ['**'],
  exclude: ['/api/logs/**'],
}
```

Per-collection control lives on `defineCollection()` via its `logs` option if you want to silence individual collections.

### Queue

Every queued and processed job becomes a `Queue` log row. Whether the row is written respects both the global `debug.logs.queue` flag and the per-job `logs` option from `defineJob()`. Status transitions from `pending` to `success` or `error`.

```ts
queue: true
```

### Errors

Server-side errors caught by Pruvious become `Errors` rows with a category, severity, message, and optional payload. Internal subsystems (image optimization, storage, etc.) use this to surface failures without crashing the request.

```ts
errors: true
```

Log an error yourself:

```ts
import { logError } from '#pruvious/server'

await logError('Failed to send email', {
  category: 'mailing',
  severity: 1,
  payload: { to: 'a@b.c', reason: 'smtp-timeout' },
})
```

### Custom logs

Anything you want, written as `Custom` rows.

```ts
import { customLog } from '#pruvious/server'

await customLog('New user registered', {
  type: 'info',       // free-form category for filtering
  severity: 0,        // 0+, higher is more important
  payload: { email: 'foo@bar.baz' },
})
```

Both `logError` and `customLog` automatically capture the current request path, method, query string, and authenticated user.

## Sensitive data

**The two `expose*` flags decide whether real payloads are stored.** With both off (the default), Pruvious replaces values with their data types - so a log row reads `string`, `number`, `object`, etc. instead of the actual contents. `Authorization`, `Cookie`, and `Set-Cookie` headers are masked to `***`.

```ts
api: {
  exposeRequestData: true,  // store request body inputs and raw sensitive headers
  exposeResponseData: true, // store response body values and raw sensitive headers
}
```

Turn either on only if you accept that secrets, tokens, passwords, and personal data will land in the logs database.

The same idea applies to job payloads:

```ts
defineJob({
  logs: { exposePayload: false }, // store types instead of values
  handler: async () => { ... },
})
```

## Cleanup

The `pruvious-cleanup-logs` job runs on a schedule and deletes rows older than `maxAge`. Defaults are 30 days, swept every hour.

```ts
cleanup: {
  maxAge: '30d',    // '60d', '7d', or seconds
  interval: '1h',   // '30m', '6h', or seconds
}
```

Set `cleanup: false` to keep logs forever (your DB will grow accordingly).

## Viewing logs

The dashboard mounts a Logs section at `/dashboard/logs` with one tab per channel:

- `Requests` - method, path, headers, body, user.
- `Responses` - status, headers, body, error message.
- `Queries` - SQL, params, timing, result.
- `Queue` - job name, payload, status, result, attempt.
- `Errors` - category, severity, message, payload.
- `Custom` - type, severity, message, payload.

Admins always see this section. To grant other users access, add the `read-logs` permission to their role.

## Verbose console logging

`debug.logs` writes to a database. `debug.verbose` writes to the console - useful in development for tracing SQL queries, job lifecycle, cache decisions, and other internal events as they happen.

```ts
pruvious: {
  debug: {
    verbose: true,
  },
}
```

Verbose mode is independent of `debug.logs`. You can also toggle it at runtime:

- Production: `NUXT_PRUVIOUS_DEBUG_VERBOSE=true`.
- Development: pass `--pruviousVerbose` on the dev command.

> [!WARNING]
> Verbose mode can include the parameter values of SQL queries. Do not enable it in production unless you are sure those values are safe to print.
