# Deployment

Pruvious is a Nuxt layer. Anywhere Nuxt runs, Pruvious runs. This page covers the three main targets - Node, Cloudflare, and traditional VPS - plus the environment variables and the production checklist you should walk through before going live.

## Build for production

```sh
nuxt build
```

This produces a Nitro output in `.output/`. The exact layout depends on the preset. By default Nuxt picks `node-server`; configure `nitro.preset` or `NITRO_PRESET` for other targets.

## Environment variables

Nuxt maps any environment variable of the form `NUXT_<DOTTED_PATH>` onto `pruvious.<path>`. So `pruvious.auth.jwt.secret` becomes `NUXT_PRUVIOUS_AUTH_JWT_SECRET`. Use this for every secret and every value that differs between environments.

```sh
# Required in production
NUXT_PRUVIOUS_AUTH_JWT_SECRET="long-random-string-32-chars-min"

# Main database
NUXT_PRUVIOUS_DATABASE_DRIVER="postgres://app:secret@db:5432/pruvious?ssl=true"

# Uploads
NUXT_PRUVIOUS_UPLOADS_DRIVER="s3://AKIA...:SECRET@s3.amazonaws.com/my-bucket?region=us-east-1&ssl=true"

# Queue secret (for cron-triggered queue processing)
NUXT_PRUVIOUS_QUEUE_SECRET="another-long-random-string"
```

Optional but commonly set:

```sh
NUXT_PRUVIOUS_API_BASE_PATH="/api/"
NUXT_PRUVIOUS_DASHBOARD_BASE_PATH="/dashboard/"
NUXT_PRUVIOUS_CACHE_DRIVER="redis://default:password@redis.example.com:6379/0"
NUXT_PRUVIOUS_DEBUG_VERBOSE="false"
```

See the [configuration reference](../reference/configuration.md) for the full option tree.

## Database migrations

Pruvious auto-syncs the schema when the database connects. In development this is exactly what you want. In production, you have two choices:

1. **Keep sync on (default).** The schema is updated on the first request after deploy. By default Pruvious preserves tables not declared in your collection schema (`dropNonCollectionTables: false`) but drops columns not declared in your field models (`dropNonFieldColumns: true`). If another application writes columns to your collection tables, set `dropNonFieldColumns: false` so unexpected differences do not destroy data.
2. **Turn sync off.** Set `pruvious.database.sync = false` and run a separate sync step from a build pipeline or a one-shot job. Useful for zero-downtime deploys behind a load balancer.

See [Schema sync](../database/overview.md#schema-sync-auto-migrations) for the algorithm.

> [!WARNING]
> Cloudflare D1 does not support transactions. A failed sync there can leave the database in a partial state. Back up before deploys that change the schema.

## Target: Node

The default Nitro output runs as a standalone Node server:

```sh
nuxt build
node .output/server/index.mjs
```

Behind a reverse proxy (nginx, Caddy, Traefik), this is the simplest production setup.

```sh
# Provide config via env vars
NUXT_PRUVIOUS_AUTH_JWT_SECRET="..." \
NUXT_PRUVIOUS_DATABASE_DRIVER="postgres://..." \
node .output/server/index.mjs
```

For local-only file storage, mount a persistent volume to your `uploads` directory (the default is `.uploads` relative to the working directory). For multi-instance Node deployments, use S3 / R2 instead.

### Database choice

- **SQLite** works fine for single-instance Node deployments. Keep the file on a persistent volume and back it up.
- **PostgreSQL** is the right choice for multi-instance or high-traffic deployments.

## Target: Cloudflare Workers / Pages

Use the `cloudflare_pages` or `cloudflare-module` Nitro preset:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: { preset: 'cloudflare_pages' },
  extends: ['pruvious'],
})
```

Configure D1 and R2 bindings in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "pruvious"
database_id = "..."

[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "pruvious-uploads"
```

Then point Pruvious at those bindings:

```ts
pruvious: {
  database: { driver: 'd1://DB' },
  uploads: { driver: 'r2://UPLOADS' },
  cache: { driver: 'd1://DB' },   // or a redis:// URL
  queue: { mode: 'manual' },      // see below
}
```

> [!WARNING]
> On Workers, the auto queue mode (`event.waitUntil(...)` after each request) is unreliable. Use `queue.mode: 'manual'` and a [Cron Trigger](https://developers.cloudflare.com/workers/configuration/cron-triggers/) that hits `/api/process-queue` with your `queue.secret`.

## Target: Traditional VPS

The same Node setup, plus a process manager (`pm2`, `systemd`, or your favorite) and a reverse proxy for TLS. Pruvious has no special VPS requirements beyond what Nuxt itself needs.

A minimal `systemd` unit:

```ini
[Service]
WorkingDirectory=/opt/pruvious
ExecStart=/usr/bin/node /opt/pruvious/.output/server/index.mjs
EnvironmentFile=/opt/pruvious/.env
Restart=always
User=pruvious

[Install]
WantedBy=multi-user.target
```

## Production checklist

Before promoting a build:

- [ ] Set `NUXT_PRUVIOUS_AUTH_JWT_SECRET` to at least 32 random characters.
- [ ] Set `NUXT_PRUVIOUS_QUEUE_SECRET` to a long random string.
- [ ] Configure `pruvious.database.driver` for your production database.
- [ ] Configure `pruvious.uploads.driver` to use S3 / R2 (not local FS) when running multiple instances.
- [ ] Pick a `pruvious.cache.driver` that all instances can reach (e.g. Redis or PostgreSQL).
- [ ] Decide on `queue.mode`. Use `'manual'` + cron on serverless.
- [ ] Back up your data and run a dry deploy against a staging copy of the database before each schema-changing release.
- [ ] Confirm `pruvious.i18n.languages` matches what you actually publish - renaming codes is destructive.
- [ ] Confirm `auth.tokenStorage.storage` is `'cookies'` if editors rely on draft previews (`localStorage` breaks first-paint detection).
- [ ] Disable `debug.verbose` and `debug.logs.api.exposeRequestData` in production unless you have a reason.
- [ ] Set up a reverse proxy or platform that handles TLS for you.
- [ ] Pin a specific Pruvious build (see [installation](../guide/installation.md)) - do not deploy against a moving `@v4` tag.

## Path translation in production

The optional `@pruvious/local-path` plugin exposes a server-side file system browser inside the dashboard - useful when an editor needs to pick a path on the host machine.

It relies on Node's native `fs` module, so it **only works on Node deployments**. On Cloudflare Workers, Vercel Edge, and similar runtimes it will not function. If you bundle the plugin, gate it with `nitro.preset` or remove it from `nuxt.config.ts` for non-Node builds.

## Health checks

Pruvious does not currently ship a dedicated health endpoint. Most platforms use a simple `GET /` check that hits a public page. If you need a lightweight liveness probe, define a small custom endpoint under `server/pruvious-api/`:

```ts
// server/pruvious-api/health.get.ts
export default defineEventHandler(() => ({ ok: true }))
```

That endpoint is excluded from auth and middleware by default (it is under a path the middleware does match, though - if you want to bypass it, add it to `api.middleware.exclude`).

## Next steps

- [Configuration reference](../reference/configuration.md) - All options that map to env vars
- [Database overview](../database/overview.md) - Sync behavior and multiple databases
- [REST API](../api/rest.md) - Endpoints you may want to expose or restrict at the proxy
