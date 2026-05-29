# Contributing to Pruvious

Thanks for taking the time to help out. This guide covers how to get the monorepo running locally, how the test suite expects to be set up, and the conventions we use.

> Pruvious v4 is in active alpha development. APIs change frequently. If you plan to ship a larger change, please open an issue first so we can sync on the approach.

## Prerequisites

- **Node.js** matching [`.nvmrc`](.nvmrc) (currently Node 24). `nvm use` will pick the right version.
- **pnpm** 10+. The monorepo is pinned via the `packageManager` field in [`package.json`](package.json).
- **Git**.

For the integration test suite and the playground, you will also need:

- A local **PostgreSQL** server (for `@pruvious/orm` tests).
- A local **MinIO** instance (S3-compatible storage for `@pruvious/storage` tests).
- A local **Verdaccio** registry (only for `pnpm play`, which publishes the workspace packages and installs them into a real Nuxt app).

Install whichever you prefer. Project-wide containerised setup is not provided yet.

## Installing the monorepo

The monorepo needs a one-time bootstrap step before the first install. Two packages (`@pruvious/hub` and `@pruvious/plugin`) are built into other packages during the normal build chain, so an empty `dist/index.mjs` stub has to exist before `pnpm install`'s `postinstall` hook runs `pnpm build`.

```sh
pnpm bootstrap   # create dist stubs for @pruvious/hub and @pruvious/plugin
pnpm install     # install dependencies and build every package (postinstall)
```

After that, `pnpm install` on its own is enough for follow-up installs.

If a build ever ends up in a weird state, you can wipe everything and start over:

```sh
pnpm purge
pnpm bootstrap
pnpm install
```

## Project layout

This is a pnpm workspace. The published packages live under [`packages/`](packages):

| Package | Description |
|:---|:---|
| [`pruvious`](packages/pruvious) | The Nuxt module: collections, singletons, fields, API, dashboard. |
| [`@pruvious/orm`](packages/orm) | ORM with SQLite, PostgreSQL, and Cloudflare D1 drivers. |
| [`@pruvious/i18n`](packages/i18n) | Translation primitives and message patterns. |
| [`@pruvious/storage`](packages/storage) | File storage drivers (filesystem, S3, R2). |
| [`@pruvious/ui`](packages/ui) | Dashboard component library. |
| [`@pruvious/utils`](packages/utils) | Shared utilities used across the project. |
| [`@pruvious/cli-utils`](packages/cli-utils) | Helpers used by CLI commands. |
| [`@pruvious/i18n`](packages/i18n) | i18n runtime and helpers. |
| [`@pruvious/local-path`](packages/local-path) | Filesystem path helpers. |
| [`@pruvious/plugin`](packages/plugin) | Plugin runtime (built late in the chain). |
| [`@pruvious/hub`](packages/hub), [`@pruvious/hub-app`](packages/hub-app) | Hub server and app. |
| [`create-pruvious`](packages/create-pruvious) | Scaffolder CLI behind `npm create pruvious`. |

Documentation lives in [`docs/`](docs).

## Building and typechecking

The full build runs automatically after install. You usually only need to invoke it manually after pulling large changes.

```sh
pnpm build                 # build every package in dependency order
pnpm build:utils           # build a single package
pnpm typecheck             # typecheck every package
pnpm typecheck:pruvious    # typecheck a single package
```

Per-package `build:*` and `typecheck:*` scripts are listed in the root [`package.json`](package.json).

## Running the test suite

Tests use Vitest from the repo root.

```sh
pnpm test                  # run every test
pnpm test:orm              # run a single package's tests
pnpm test:storage
```

A few packages talk to real services, so they need a `.env.test` at the repo root. Start from the example:

```sh
cp .env.test.example .env.test
```

The variables it expects:

| Variable | Used by | Purpose |
|:---|:---|:---|
| `VITE_PG_USER` | `@pruvious/orm` | PostgreSQL user. Tests create and drop a fresh database per run. |
| `VITE_PG_PASSWORD` | `@pruvious/orm` | PostgreSQL password. |
| `VITE_PG_HOST` (optional) | `@pruvious/orm` | Defaults to `localhost`. |
| `VITE_PG_PORT` (optional) | `@pruvious/orm` | Defaults to `5432`. |
| `VITE_PG_DATABASE_PREFIX` (optional) | `@pruvious/orm` | Defaults to `pruvious_test_`. |
| `VITE_MINIO_CONNECTION_STRING` | `@pruvious/storage` | S3-compatible URL, e.g. `s3://pruvious:pruvious@127.0.0.1:9000/pruvious?region=pruvious`. |

The PostgreSQL user needs permission to create and drop databases - tests provision a per-suite database and tear it down at the end. To keep the database around for inspection after a test run, pass `--config.preserve`:

```sh
pnpm test:orm --config.preserve
```

MinIO must have a bucket matching the one in `VITE_MINIO_CONNECTION_STRING` (default: `pruvious`) and credentials matching the URL.

SQLite-backed tests need no extra setup; they write into `packages/orm/tmp/` and clean up after themselves.

## Running the playground

`pnpm play` scaffolds a real Nuxt app under `PLAYGROUND_DIR`, publishes every workspace package to a local Verdaccio registry, installs them into the playground, and starts the dev server. It is the closest thing to a full end-to-end smoke test.

```sh
cp .env.play.example .env.play
# edit PLAYGROUND_DIR and PRIVATE_REGISTRY_BASE_URL if needed

# in another terminal: start Verdaccio listening on the URL from .env.play
# (default: http://localhost:4873)

pnpm play                  # dev server, Node runtime
pnpm play --node           # build + start with Node
pnpm play --cf             # build + start with Wrangler against Cloudflare bindings
pnpm play --cf --deploy    # build + deploy to Cloudflare
pnpm play --test           # run the playground's vitest suite
pnpm play --no-publish     # skip the publish step (faster reruns)
```

The Cloudflare modes also need `D1_DATABASE_ID`, `D1_LOGS_DATABASE_ID`, and `R2_BUCKET_NAME` in `.env.play`.

## Code style

- Format with Prettier before committing: `pnpm format`.
- Prefer utilities in [`@pruvious/utils`](packages/utils) over local helpers. If a helper is genuinely shared, add it to `@pruvious/utils` instead of duplicating it.
- Comment intent, edge cases, and non-obvious reasoning - not what the code already says. Match the comment density of the surrounding file.

## Commits and pull requests

- We follow Conventional Commits. The prefixes in current use are `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`. Scope the message where it helps (`fix(create-pruvious): ...`). Skim `git log` for the established tone.
- Keep PRs focused. A single PR per logical change is easier to review than a bundle of unrelated edits.
- Make sure the relevant `pnpm test` and `pnpm typecheck` commands pass locally before opening the PR.
- If you change anything user-facing, update the matching page under [`docs/`](docs).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
