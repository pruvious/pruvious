# Authentication and Authorization

Pruvious ships with a JWT-based authentication system. The same tokens guard the dashboard, the REST API, and any custom endpoints you add. Authorization is handled with named permissions stored on roles, plus a per-collection `authGuard` that maps CRUD operations to `collection:{slug}:{operation}` permissions.

## How it works

When a user signs in, the server signs a JSON Web Token containing a random `tokenSubject` claim (a 32-byte hex string stored on the user record). The token is returned to the client in two parts:

- **Header and payload** - readable by client-side scripts so the app can know when the token expires.
- **Signature** - kept HTTP-only so JavaScript cannot read it.

Splitting the JWT into two cookies mitigates XSS: an attacker with script access cannot reconstruct the signed token without the HTTP-only signature cookie. On every request, the server reassembles the two cookies (or reads a `Bearer` token from the `Authorization` header), verifies the signature, looks up the user by `tokenSubject`, and populates `event.context.pruvious.auth`.

## Logging in

The login endpoint accepts an email and password, plus an optional `remember` flag for an extended session.

```ts
// POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "12345678",
  "remember": true
}
```

The response contains the signed token. When `auth.tokenStorage.storage` is `'cookies'` (the default), the server also sets the `token` and `signature` cookies automatically; the client does not need to store anything.

```ts
const { data } = await pruviousPost('auth/login', {
  body: {
    email: 'admin@example.com',
    password: '12345678',
    remember: false,
  },
})
```

Bad credentials return `401 Incorrect credentials`. The login handler always runs a dummy bcrypt comparison when the user does not exist, so timing cannot be used to enumerate accounts.

## JWT configuration

Token settings live under `pruvious.auth.jwt` in `nuxt.config.ts`.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  pruvious: {
    auth: {
      jwt: {
        secret: process.env.NUXT_PRUVIOUS_AUTH_JWT_SECRET,
        expiration: {
          default: '4h',
          extended: '7d',
        },
        claims: {},
      },
    },
  },
})
```

- **secret** - The signing key. In development, the default is the literal string `'dev'`, which is stable across restarts. In production, Pruvious generates a random secret when the module initializes - which means tokens are invalidated on every restart unless you set a stable secret yourself.

  > [!WARNING]
  > Always set `NUXT_PRUVIOUS_AUTH_JWT_SECRET` to a long, stable value in production environments. A quick way to generate one:

  ```sh
  openssl rand -hex 64
  ```

  Changing the secret invalidates every issued token immediately.

- **expiration.default** - Lifetime of a normal session token. Defaults to `4h`.
- **expiration.extended** - Lifetime when the login payload includes `remember: true`. Defaults to `7d`.
- **claims** - Extra claims to embed in every token's payload.

Expiration values accept a duration string (`'4h'`, `'14d'`, `'30m'`) or a number of seconds.

## Token storage and resolution

There are two separate concerns: how the **client** stores its token, and where the **server** looks for it.

### Client-side: `auth.tokenStorage`

Controls where the token lives in the browser.

```ts
// nuxt.config.ts
pruvious: {
  auth: {
    // Default - two cookies, signature is HTTP-only
    tokenStorage: 'cookies',

    // Or store in localStorage and send via Authorization header
    // tokenStorage: { storage: 'localStorage', key: 'token' },
  },
},
```

With `'cookies'`:

- `token` cookie holds `{header}.{payload}` and is readable by JavaScript so the client can detect expiry.
- `signature` cookie holds the signature and is HTTP-only.
- Both default to `sameSite: 'strict'` and `secure: 'auto'` (HTTPS in production, HTTP in development).

With `'localStorage'`, you become responsible for sending the token. The HTTP client built into `#pruvious/app` does this for you when configured for `localStorage`.

> [!TIP]
> Cookie storage is required for editor previews and page caching. With `localStorage`, the server cannot see the token on the first HTML request, so editors will receive the cached anonymous response.

### Server-side: `auth.tokenResolution`

Controls which sources the server consults to extract the token, and in what order. By default, both are checked:

```ts
// Default
pruvious: {
  auth: {
    tokenResolution: [
      { source: 'authorizationHeader' },
      { source: 'cookies', headerAndPayload: 'token', signature: 'signature' },
    ],
  },
},
```

For an API-only deployment (no dashboard, no browser cookies) you can narrow this to the `Authorization` header:

```ts
pruvious: {
  auth: {
    tokenResolution: 'authorizationHeader',
    tokenStorage: { storage: 'localStorage', key: 'token' },
  },
},
```

When using the header, clients send `Authorization: Bearer <token>`.

## Renewing and invalidating tokens

- **Renew** - `POST /api/auth/renew-token` issues a new token with the same lifetime class (regular or extended) and invalidates the old one. The renewed token replaces the existing cookies.
- **Logout** - `POST /api/auth/logout` invalidates the current token by storing it in the cache until its natural expiry. The cookie is cleared on the response. Invalidated tokens are rejected by `verifyToken()` even if their signature is still valid.

Invalidation entries live under the cache key `{prefix}:invalidate:{token}` and expire on their own when the token would have expired.

## Inspecting the current session

### `GET /api/auth/state`

Returns the current authentication state, excluding sensitive fields:

```json
{
  "isLoggedIn": true,
  "user": { "id": 1, "email": "admin@example.com", "isAdmin": true, "...": "..." },
  "permissions": ["access-dashboard", "collection:posts:read", "..."]
}
```

When no user is authenticated, the response is `{ isLoggedIn: false, user: null, permissions: [] }`.

### `GET /api/auth/permissions`

Returns just the flat list of permission strings for the authenticated user. Useful for clients that only need to gate UI elements.

## Passwords

Passwords are hashed with bcrypt. The work factor lives under `pruvious.auth.hash`.

```ts
pruvious: {
  auth: {
    hash: {
      algorithm: 'bcrypt',
      bcrypt: { rounds: 12 },
    },
  },
},
```

Higher rounds increase resistance to brute-force attacks at the cost of CPU time per login. The default of `12` is a balanced choice. Passwords are validated to be at least 8 characters by the built-in `Users` collection template.

The hash is applied automatically by the `password` field's `beforeQueryExecution` input filter, so you never have to hash by hand:

```ts
import { insertInto } from '#pruvious/server'

await insertInto('Users').values({
  email: 'jane@example.com',
  password: 'plain-text-here', // hashed before insertion
})
```

To verify a password manually:

```ts
import { selectFrom, verifyPassword } from '#pruvious/server'

const user = await selectFrom('Users')
  .select(['password'])
  .where('email', '=', email)
  .withCustomContextData({ _ignoreMaskFieldsHook: true })
  .first()

const ok = await verifyPassword(plainText, user)
```

`verifyPassword` runs a dummy comparison when the user record is missing, preventing timing-based account enumeration.

## The `Users` collection

Built-in fields on the `Users` collection:

- `email` - unique, case-insensitive, validated as an email address.
- `password` - hashed on write, masked on read.
- `tokenSubject` - 32-byte hex string used as the JWT subject. Rotated to log all sessions of that user out.
- `isActive` - inactive users cannot log in.
- `isAdmin` - admins implicitly have every permission.
- `roles` - many-to-many link into the `Roles` collection.
- `firstName`, `lastName` - profile fields.
- `contentLanguage`, `dashboardLanguage`, `timezone`, `dateFormat`, `timeFormat` - personal preferences.
- `smartClipboard`, `bookmarks` - dashboard preferences.

The collection enforces several built-in guards:

- Only admins can edit another admin's email or password.
- Only admins can toggle `isAdmin` or `isActive` on another admin.
- Only admins can delete another admin.
- Only users with `logout-other-users` can rotate someone else's `tokenSubject`.

## The `Roles` collection

A role is a name plus a list of permissions:

```ts
{
  name: 'Editor',
  permissions: [
    'access-dashboard',
    'collection:posts:read',
    'collection:posts:create',
    'collection:posts:update',
  ],
}
```

A user gets the union of permissions from all their roles. Users with `isAdmin: true` skip the role lookup entirely and receive every permission.

## Built-in permissions

Pruvious generates a typed `Permission` union from the project schema. Out of the box you get:

- `access-dashboard` - required to log into the dashboard at all.
- `clear-page-cache` - flush the HTML page cache.
- `delete-logs` - delete log entries.
- `logout-other-users` - force-log out other accounts.
- `pause-logs` - pause logging.
- `preview-drafts` - bypass the page cache to preview drafts.
- `read-logs` - view the logs page.
- `update-own-account` - edit one's own profile.

Plus, for every collection slug:

- `collection:{slug}:create`
- `collection:{slug}:read`
- `collection:{slug}:update`
- `collection:{slug}:delete`
- `collection:{slug}:manage` - manage `author` and `editors` on records.

And for every singleton slug:

- `singleton:{slug}:read`
- `singleton:{slug}:update`

## Using auth in your app

### `useAuth()` composable

The composable exposes the reactive authentication state. The `pruvious-auth` (or `pruvious`) middleware resolves it automatically on every navigation.

```vue
<script setup lang="ts">
import { useAuth, hasPermission } from '#pruvious/app'

const auth = useAuth()
</script>

<template>
  <div v-if="auth.isLoggedIn">
    Welcome, {{ auth.user.firstName }}
    <button v-if="hasPermission('collection:posts:create')">New post</button>
  </div>
  <NuxtLink v-else to="/login">Sign in</NuxtLink>
</template>
```

Other client utilities from `#pruvious/app`:

- `isLoggedIn()` - shorthand for `useAuth().value.isLoggedIn`.
- `getUser()` - the current user object or `null`.
- `hasPermission(permission)` - check one or more permissions.
- `refreshAuthState(force?)` - re-fetch `/api/auth/state`. Used after login or when the token may have changed.
- `getAuthTokenPayload()` - read the decoded JWT payload from the active token storage.
- `getAuthTokenExpiresIn()` - milliseconds until the current token expires (or `0` if expired, `null` if absent).
- `storeAuthToken(token)` - write the token (only meaningful with `localStorage` storage).
- `removeAuthToken()` - clear the token and reset `useAuth()`.

### Server-side checks

On the server, the resolved state lives on `event.context.pruvious.auth`:

```ts
export default defineEventHandler((event) => {
  const { isLoggedIn, user, permissions } = event.context.pruvious.auth

  if (isLoggedIn && permissions.includes('collection:posts:update')) {
    // ...
  }
})
```

Two helpers cover the common case of failing fast with the right HTTP status:

```ts
import { assertUser, assertUserPermissions } from '#pruvious/server'

export default defineEventHandler((event) => {
  // 401 if not logged in
  assertUser(event)

  // 401 if not logged in, 403 if missing a permission
  assertUserPermissions(event, ['access-dashboard', 'collection:posts:read'])
})
```

Inside a request you can also use the no-arg helpers from `#pruvious/server`:

- `isLoggedIn()` and `getUser()` mirror the client API.
- `hasPermission(permission, ...rest)` checks one or several permissions.
- `hasCollectionPermission(collection, operation)` and `hasSingletonPermission(singleton, operation)` are shorthands for `collection:{slug}:{op}` and `singleton:{slug}:{op}`.

### Working with tokens directly

```ts
import {
  signToken,
  verifyToken,
  invalidateToken,
  getToken,
  setTokenCookies,
  removeTokenCookies,
} from '#pruvious/server'

// Sign for a user record (resolves the tokenSubject automatically)
const token = await signToken(userQueryResult)

// Or sign with a custom expiry
const oneTimer = await signToken(userQueryResult, '15m')

// Verify a token string and load the user
const user = await verifyToken(token)

// Invalidate a token (stored in cache until natural expiry)
await invalidateToken(token)

// Cookie helpers (only act when tokenStorage.storage is 'cookies')
setTokenCookies(token)
removeTokenCookies()
```

## Guarding collections

Every collection runs an authorization guard by default. It maps each CRUD operation to the matching `collection:{slug}:{operation}` permission.

```ts
// server/collections/Posts.ts
import { defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    title: textField({}),
  },

  // Default - require permissions for every CRUD operation
  authGuard: true,

  // Only protect writes; reads are public
  // authGuard: ['create', 'update', 'delete'],

  // Disable the default permission guard entirely
  // authGuard: false,
})
```

The guard only applies when you use the guarded query builders (`guardedSelectFrom`, `guardedInsertInto`, `guardedUpdate`, `guardedDeleteFrom`) or hit the auto-generated API endpoints. The plain `selectFrom` family bypasses guards entirely - use it for trusted, server-internal code.

For finer control, add your own functions to the `guards` array:

```ts
import { defineCollection, hasPermission, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    title: textField({}),
  },
  guards: [
    ({ operation }) => {
      if (operation === 'delete' && !hasPermission('access-dashboard')) {
        throw new Error('Only dashboard users can delete posts')
      }
    },
  ],
})
```

A guard that throws stops the operation immediately and, by default, returns `401` or `403` to the client.
