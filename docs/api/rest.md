# REST API

Pruvious ships a full REST API for every collection, singleton, upload, log, and built-in feature. Endpoints are generated automatically from your definitions and live under `/api/` by default. You can change the prefix via [`pruvious.api.basePath`](../reference/configuration.md#api).

## Base path

```
/api/
```

You can move every Pruvious endpoint under a different prefix:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  pruvious: {
    api: { basePath: '/cms/' },
  },
})
```

For brevity, the rest of this page uses `/api/` in every example.

## Authentication

Pruvious uses JWT tokens. After login, you can pass the token in two ways:

- **Cookies** (default). The token is split across `token` and `signature` cookies and sent automatically by the browser.
- **`Authorization` header** in `Bearer` form. Useful for non-browser clients and when `auth.tokenStorage` is set to `localStorage`.

```sh
curl https://example.com/api/me \
  -H "Authorization: Bearer eyJhbGc..."
```

See the [auth configuration](../reference/configuration.md#auth) for cookie names and JWT options.

### Auth endpoints

| Method | Path | Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | `{ email, password, remember? }` | Authenticate. Returns `{ token }` and sets auth cookies. |
| `POST` | `/api/auth/logout` | _none_ | Invalidate the current token. |
| `POST` | `/api/auth/logout/others` | _none_ | Invalidate all other tokens for this user. Returns a fresh `{ token }`. Requires the `logout-other-users` permission. |
| `POST` | `/api/auth/renew-token` | _none_ | Issue a fresh token before the current one expires. |
| `GET` | `/api/auth/state` | - | Current `{ isLoggedIn, user, permissions }`. |
| `GET` | `/api/auth/permissions` | - | Returns the permissions held by the currently authenticated user. Requires authentication. |

### Example - log in with `curl`

```sh
curl -X POST https://example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@example.com", "password": "secret", "remember": true }'
```

Response:

```json
{ "token": "eyJhbGciOiJIUzI1NiIs..." }
```

The server also sets two cookies (`token` and `signature`). If you only consume the API outside the browser, store the token from the body and send it back as `Authorization: Bearer <token>`.

## Collections

For every collection that opts into the API (`api.read`, `api.create`, `api.update`, `api.delete` in the collection definition), Pruvious mounts the following endpoints:

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/collections/[collection]/` | List records. Supports `?select=`, `?where=`, `?orderBy=`, `?limit=`, `?offset=`, `?page=`, `?perPage=`, `?populate=`. |
| `GET` | `/api/collections/[collection]/[id]` | Read a single record by `id`. |
| `POST` | `/api/collections/[collection]/` | Create a record (or many if the body is an array). |
| `PATCH` | `/api/collections/[collection]/[id]` | Update a record by `id`. |
| `PATCH` | `/api/collections/[collection]/` | Update many records that match `?where=`. |
| `DELETE` | `/api/collections/[collection]/[id]` | Delete a record by `id`. |
| `DELETE` | `/api/collections/[collection]/` | Delete many records that match `?where=`. |

> [!TIP]
> The `[collection]` segment is the **snake_case plural** form of the collection name (`Articles` -> `articles`).

### Query parameters

The list and bulk endpoints share the same query-string syntax as the typed query builder. A few common examples:

```
GET /api/collections/articles?select=id,title&orderBy=createdAt:desc&limit=10
GET /api/collections/articles?where=status[=]published&page=2&perPage=20
GET /api/collections/articles?populate=true
```

For the full query string grammar, see the collection query builder docs.

### Example - list articles

```sh
curl "https://example.com/api/collections/articles?select=id,title&limit=5" \
  -H "Authorization: Bearer eyJhbGc..."
```

Response:

```json
{
  "records": [
    { "id": 1, "title": "Hello, world" },
    { "id": 2, "title": "Pruvious 4 is here" }
  ],
  "total": 2,
  "currentPage": 1,
  "lastPage": 1,
  "perPage": 5
}
```

### Example - create a record

```sh
curl -X POST https://example.com/api/collections/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{ "title": "New post", "body": "Hello there" }'
```

Successful response:

```json
{ "id": 3, "title": "New post", "body": "Hello there", "createdAt": 1716800000000, "updatedAt": 1716800000000 }
```

A validation failure returns `422` with field-level errors:

```json
{
  "statusCode": 422,
  "message": "Validation failed",
  "data": { "title": "This field is required" }
}
```

### Query endpoints

For more advanced queries, every collection also exposes POST-based query endpoints that accept a structured body:

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/collections/[collection]/query/read` | Run a read query with a JSON body. |
| `POST` | `/api/collections/[collection]/query/create` | Create with a JSON body. |
| `POST` | `/api/collections/[collection]/query/update` | Update with a JSON body. |
| `POST` | `/api/collections/[collection]/query/delete` | Delete with a JSON body. |

These are most useful when the query string would be too long, or when the client is the typed Pruvious query builder talking to the server.

### Validation endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/collections/[collection]/validate/create` | Validate a create payload without inserting. |
| `POST` | `/api/collections/[collection]/validate/update` | Validate an update payload without persisting. |
| `POST` | `/api/collections/[collection]/validate/update/[id]` | Validate an update payload against a specific record. |

### Convenience endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/collections/[collection]/[id]/duplicate` | Duplicate a record and return the new one. |
| `GET` | `/api/collections/[collection]/[id]/copy-translation` | Copy a translation into another language. |

## Singletons

Singletons expose a smaller surface - there is always one record per language.

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/singletons/[singleton]/` | Read the singleton. |
| `PATCH` | `/api/singletons/[singleton]/` | Update the singleton. |
| `POST` | `/api/singletons/[singleton]/validate` | Validate an update payload. |
| `GET` | `/api/singletons/[singleton]/copy-translation` | Copy a translation into another language. |

## Uploads

The uploads API handles direct uploads, multipart uploads for large files, and metadata.

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/uploads/` | Upload one or more files (multipart/form-data) or create directories. |
| `PATCH` | `/api/uploads/[id]` | Patch metadata for a file by id. Accepts any Uploads field except `isLocked` (commonly `author`, `editors`, `description`). |
| `DELETE` | `/api/uploads/[id]` | Delete an upload by id. |
| `PATCH` | `/api/uploads/path/[...]` | Patch metadata by path. |
| `DELETE` | `/api/uploads/path/[...]` | Delete an upload by path. |
| `PATCH` | `/api/uploads/move/[id]` | Move an upload (rename / change directory). |
| `PATCH` | `/api/uploads/move/path/[...]` | Move an upload by path. |
| `GET` | `/api/uploads/optimize-image/[...]` | Return a transformed image variant. |

### Multipart uploads

For files larger than ~8 MB the client should use the multipart flow:

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/uploads/multipart/` | Begin a multipart upload. Returns a `key`. |
| `PUT` | `/api/uploads/multipart/[key]?partNumber=N` | Upload part N. |
| `POST` | `/api/uploads/multipart/[key]` | Complete the upload. |
| `DELETE` | `/api/uploads/multipart/[key]` | Abort and clean up. |
| `GET` | `/api/uploads/multipart/[key]` | Inspect progress. |

The client-side [`upload()`](./composables.md#upload-files) helper handles this flow automatically.

## Translations

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/translations?domain=X&language=Y` | Return the translatable strings for a domain and language, falling back through `i18n.fallbackLanguages`. |

## Routes

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/routes/[...]` | Resolve a public route. Returns the route data or a redirect. Used by the `pruvious-route` middleware. |
| `GET` | `/api/routes/` | Resolve the root (`/`) route. |

The sitemap is not served from `/api/routes/`. It is exposed directly at `/sitemap.xml`.

## Cache

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/cache/page/clear` | Clear cached pages. Optional body `{ paths: ['/about', '/blog/*'] }`. Requires the `clear-page-cache` permission. |

## Queue

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/process-queue` | Process the next pending job. **Requires a bearer token equal to `pruvious.queue.secret`**, not a user token. |

```sh
curl -X POST https://example.com/api/process-queue \
  -H "Authorization: Bearer $PRUVIOUS_QUEUE_SECRET"
```

Set up a cron job (or a Cloudflare Cron Trigger) to hit this endpoint on a schedule when `queue.mode` is `'manual'`.

## Logs

When `debug.logs` is enabled, log endpoints become available. `GET` endpoints require the `read-logs` permission; `DELETE` endpoints (single, bulk, and `query/delete`) require `delete-logs`.

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/logs/requests/` | List logged API requests. |
| `GET` | `/api/logs/responses/` | List logged API responses. |
| `GET` | `/api/logs/queries/` | List database query logs. |
| `GET` | `/api/logs/queue/` | List queue job logs. |
| `GET` | `/api/logs/errors/` | List error logs. |
| `GET` | `/api/logs/custom/` | List custom logs from `customLog()`. |

Each set also exposes `[id]` (read one), `DELETE` (single and bulk), and `POST .../query/read` / `query/delete` for structured queries.

## Built-in account routes

All three endpoints require the `update-own-account` permission.

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/me` | Current user record. |
| `PATCH` | `/api/me` | Update the current user. |
| `GET` | `/api/me/structure` | Field definitions and layout for the current user's profile form (used by the dashboard). |

## Dashboard helpers

These endpoints back the dashboard UI. Most require `access-dashboard`. The `/api/pruvious` bootstrap, `/api/pruvious/install` (first-run installer), and `/api/pruvious/dashboard` endpoints are intentionally public - they have to be reachable before a user can log in.

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/pruvious` | Bootstrap data for the dashboard shell. |
| `POST` | `/api/pruvious/install` | First-run installer endpoint that creates the initial admin user. |
| `GET` | `/api/pruvious/dashboard` | Resolved dashboard manifest. |
| `GET` | `/api/pruvious/overview-routes` | Routes overview card data. |
| `GET` | `/api/pruvious/overview-drafts` | Drafts overview card data. |
| `GET` | `/api/pruvious/overview-recent-edits` | Recent edits card data. |
| `GET` | `/api/pruvious/resolved-subpaths` | Resolve route subpaths. |
| `GET` | `/api/pruvious/link-choices` | Picker data for the link field. |
| `POST` | `/api/populate-route-data` | Populate field data for previews. |

## Errors

All Pruvious endpoints use the same error envelope:

```json
{
  "statusCode": 422,
  "message": "Validation failed",
  "data": { "title": "This field is required" }
}
```

| Status | Meaning |
| :--- | :--- |
| `400` | Invalid request payload or parameters |
| `401` | Missing or invalid auth token |
| `403` | Missing permissions for this action |
| `404` | Resource (or API surface) not found |
| `422` | Field-level validation errors (in `data`) |
| `429` | Rate-limited |
| `500` | Internal server error |

## Next steps

- [Composables](./composables.md) - Typed clients for Vue components
- [Configuration reference](../reference/configuration.md#api) - All API options
- [Authentication feature guide](../features/authentication.md) - Users, roles, permissions
