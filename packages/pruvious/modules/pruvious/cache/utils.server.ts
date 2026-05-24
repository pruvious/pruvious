import { Database } from '@pruvious/orm'
import { isDefined, isNull, randomIdentifier, toDate } from '@pruvious/utils'

/**
 * Stores a string `value` in the cache with the given `key`.
 * If `expiresAt` is `null`, the cache entry will never expire.
 *
 * The following secondary prefixes are reserved for internal use:
 *
 * - `invalidate:{token}` - Used for invalidating access tokens.
 * - `page:{path}` - Used for caching page content.
 * - `multipart:{id}` - Used for handling multipart uploads.
 *
 * The primary prefix is configurable in the `pruvious.cache.prefix` option in `nuxt.config.ts`.
 * It is automatically prepended to the provided `key`.
 *
 * @returns `true` if cache was set successfully, `false` otherwise.
 *
 * @example
 * ```ts
 * // Set a cache entry that never expires
 * await setCache('secondary-prefix:key', '...')
 *
 * // Set a cache entry that expires in 1 second
 * await setCache('secondary-prefix:key', '...', Date.now() + 1000)
 * ```
 */
export async function setCache(
  key: string,
  value: string,
  expiresAt: number | string | Date | null = null,
): Promise<boolean> {
  const { getCacheDatabase } = await import('#pruvious/server')
  const db = getCacheDatabase()
  const { prefix } = useRuntimeConfig().pruvious.cache
  key = prefix ? `${prefix}:${key}` : key

  if (db instanceof Database) {
    const result = await db.exec(
      `insert into "Cache" ("key", "value", "expiresAt", "createdAt") values ($key, $value, $expiresAt, $createdAt) on conflict ("key") do update set "value" = $value, "expiresAt" = $expiresAt`,
      { key, value, expiresAt: isNull(expiresAt) ? null : toDate(expiresAt).getTime(), createdAt: Date.now() },
    )
    return result === 1
  } else {
    return (await db.set(key, value, 'PX', isNull(expiresAt) ? -1 : toDate(expiresAt).getTime() - Date.now())) === 'OK'
  }
}

/**
 * Appends a string `value` to the cache entry with the given `key`.
 * If the cache entry does not exist, it is created with the provided `value`.
 *
 * The `expiresAt` parameter is optional and can be used to update the expiration time.
 * If `expiresAt` is `null`, the cache entry will never expire.
 *
 * The following secondary prefixes are reserved for internal use:
 *
 * - `invalidate:{token}` - Used for invalidating access tokens.
 * - `page:{path}` - Used for caching page content.
 * - `multipart:{id}` - Used for handling multipart uploads.
 *
 * The primary prefix is configurable in the `pruvious.cache.prefix` option in `nuxt.config.ts`.
 * It is automatically prepended to the provided `key`.
 *
 * @returns `true` if cache was appended successfully, `false` otherwise.
 *
 * @example
 * ```ts
 * await setCache('secondary-prefix:key', 'foo')
 * console.log(await getCache('secondary-prefix:key')) // 'foo'
 *
 * await appendCache('secondary-prefix:key', 'bar')
 * console.log(await getCache('secondary-prefix:key')) // 'foobar'
 * ```
 */
export async function appendCache(
  key: string,
  value: string,
  expiresAt: number | string | Date | null | undefined = undefined,
): Promise<boolean> {
  const { getCacheDatabase } = await import('#pruvious/server')
  const db = getCacheDatabase()
  const { prefix } = useRuntimeConfig().pruvious.cache
  key = prefix ? `${prefix}:${key}` : key

  if (db instanceof Database) {
    await removeExpiredCacheEntries()
    const result = isDefined(expiresAt)
      ? await db.exec(
          `insert into "Cache" ("key", "value", "expiresAt", "createdAt") values ($key, $value, $expiresAt, $createdAt) on conflict ("key") do update set "value" = "value" || $value, "expiresAt" = $expiresAt`,
          { key, value, expiresAt: isNull(expiresAt) ? null : toDate(expiresAt).getTime(), createdAt: Date.now() },
        )
      : await db.exec(
          `insert into "Cache" ("key", "value", "createdAt") values ($key, $value, $createdAt) on conflict ("key") do update set "value" = "value" || $value`,
          { key, value, createdAt: Date.now() },
        )
    return result === 1
  } else {
    const pipe = db.pipeline().append(key, value)
    if (isDefined(expiresAt)) {
      pipe.pexpire(key, isNull(expiresAt) ? -1 : toDate(expiresAt).getTime() - Date.now())
    }
    const result = await pipe.exec()
    return !isNull(result) && result.every(([err]) => isNull(err))
  }
}

/**
 * Retrieves a value from the cache using the provided `key`.
 *
 * The following secondary prefixes are reserved for internal use:
 *
 * - `invalidate:{token}` - Used for invalidating access tokens.
 * - `page:{path}` - Used for caching page content.
 * - `multipart:{id}` - Used for handling multipart uploads.
 *
 * The primary prefix is configurable in the `pruvious.cache.prefix` option in `nuxt.config.ts`.
 * It is automatically prepended to the provided `key`.
 *
 * @returns the cached value if found, `null` otherwise.
 *
 * @example
 * ```ts
 * await getCache('secondary-prefix:key')
 * ```
 */
export async function getCache(key: string): Promise<string | null> {
  const { getCacheDatabase } = await import('#pruvious/server')
  const db = getCacheDatabase()
  const { prefix } = useRuntimeConfig().pruvious.cache
  key = prefix ? `${prefix}:${key}` : key

  if (db instanceof Database) {
    const result = await db.exec(
      `select value from "Cache" where "key" = $key and ("expiresAt" is null or "expiresAt" >= $now)`,
      { key, now: Date.now() },
    )
    return result?.[0]?.value ?? null
  } else {
    return await db.get(key)
  }
}

/**
 * Retrieves an array of active cache keys.
 * The keys are returned without their primary prefix.
 *
 * The following secondary prefixes are reserved for internal use:
 *
 * - `invalidate:{token}` - Used for invalidating access tokens.
 * - `page:{path}` - Used for caching page content.
 * - `multipart:{id}` - Used for handling multipart uploads.
 */
export async function getCacheKeys(): Promise<string[]> {
  const { getCacheDatabase } = await import('#pruvious/server')
  const db = getCacheDatabase()
  const { prefix } = useRuntimeConfig().pruvious.cache

  if (db instanceof Database) {
    const result = await db.exec(`select "key" from "Cache" where "expiresAt" is null or "expiresAt" >= $now`, {
      now: Date.now(),
    })
    return result.map(({ key }) => (prefix ? key.slice(prefix.length + 1) : key))
  } else {
    return await db.keys(prefix ? `${prefix}:*` : '*')
  }
}

/**
 * Checks if a cache entry exists for the provided `key`.
 *
 * The following secondary prefixes are reserved for internal use:
 *
 * - `invalidate:{token}` - Used for invalidating access tokens.
 * - `page:{path}` - Used for caching page content.
 * - `multipart:{id}` - Used for handling multipart uploads.
 *
 * The primary prefix is configurable in the `pruvious.cache.prefix` option in `nuxt.config.ts`.
 * It is automatically prepended to the provided `key`.
 *
 * @returns `true` if cache entry exists, `false` otherwise.
 *
 * @example
 * ```ts
 * await hasCache('secondary-prefix:key')
 * ```
 */
export async function hasCache(key: string): Promise<boolean> {
  const { getCacheDatabase } = await import('#pruvious/server')
  const db = getCacheDatabase()
  const { prefix } = useRuntimeConfig().pruvious.cache
  key = prefix ? `${prefix}:${key}` : key

  if (db instanceof Database) {
    const result = await db.exec(
      `select "key" from "Cache" where "key" = $key and ("expiresAt" is null or "expiresAt" >= $now)`,
      { key, now: Date.now() },
    )
    return result.length === 1
  } else {
    return (await db.exists(key)) === 1
  }
}

/**
 * Deletes a cache entry using the provided `key`.
 *
 * The following secondary prefixes are reserved for internal use:
 *
 * - `invalidate:{token}` - Used for invalidating access tokens.
 * - `page:{path}` - Used for caching page content.
 * - `multipart:{id}` - Used for handling multipart uploads.
 *
 * The primary prefix is configurable in the `pruvious.cache.prefix` option in `nuxt.config.ts`.
 * It is automatically prepended to the provided `key`.
 *
 * @returns `true` if cache entry was deleted successfully, `false` otherwise.
 *
 * @example
 * ```ts
 * await deleteCache('secondary-prefix:key')
 * ```
 */
export async function deleteCache(key: string): Promise<boolean> {
  const { getCacheDatabase } = await import('#pruvious/server')
  const db = getCacheDatabase()
  const { prefix } = useRuntimeConfig().pruvious.cache
  key = prefix ? `${prefix}:${key}` : key

  if (db instanceof Database) {
    const result = await db.exec(`delete from "Cache" where "key" = $key`, { key })
    return result === 1
  } else {
    return (await db.del(key)) === 1
  }
}

/**
 * Deletes all cache entries by the provided secondary `prefix`.
 * If no `prefix` is provided, all cache entries are deleted.
 *
 * The following secondary prefixes are reserved for internal use:
 *
 * - `token` - Used for invalidating access tokens.
 * - `page` - Used for caching page content.
 * - `multipart` - Used for handling multipart uploads.
 *
 * The primary prefix is configurable in the `pruvious.cache.prefix` option in `nuxt.config.ts`.
 * It is automatically prepended to the provided secondary `prefix`.
 *
 * @returns the number of cache entries deleted.
 *
 * @example
 * ```ts
 * await clearCache('secondary-prefix')
 * ```
 */
export async function clearCache(prefix?: 'token' | 'page' | 'multipart' | (string & {})): Promise<number> {
  const { getCacheDatabase } = await import('#pruvious/server')
  const db = getCacheDatabase()
  const { prefix: primaryPrefix } = useRuntimeConfig().pruvious.cache
  prefix = primaryPrefix ? (prefix ? `${primaryPrefix}:${prefix}` : primaryPrefix) : undefined

  if (db instanceof Database) {
    const result = prefix
      ? await db.exec(`delete from "Cache" where "key" like $key`, { key: `${prefix}:%` })
      : await db.exec(`delete from "Cache"`)
    return result
  } else {
    const keys = await db.keys(prefix ? `${prefix}:*` : '*')
    if (!keys.length) {
      return 0
    }
    const BATCH = 500
    let deleted = 0
    for (let i = 0; i < keys.length; i += BATCH) {
      deleted += await db.del(...keys.slice(i, i + BATCH))
    }
    return deleted
  }
}

/**
 * Removes expired cache entries from the database.
 * Only applies for cache drivers that don't have built-in TTL support.
 *
 * This function runs automatically on each HTTP request through the `pruvious` middleware.
 *
 * @returns number of cache entries that were removed.
 */
export async function removeExpiredCacheEntries(): Promise<number> {
  const { getCacheDatabase } = await import('#pruvious/server')
  const db = getCacheDatabase()

  if (db instanceof Database) {
    const now = Date.now()
    const where = `where "expiresAt" is not null and "expiresAt" < $now`
    const hasExpired = await db.exec(`select count(*) as count from "Cache" ${where}`, { now })

    if (hasExpired[0]!.count > 0) {
      return await db.exec(`delete from "Cache" ${where}`, { now })
    }
  }

  return 0
}

/**
 * Result of a page cache lookup.
 */
export interface PageCacheEntry {
  /**
   * The rendered HTML body stored in the cache.
   */
  value: string

  /**
   * The pending claim token (`{deadlineMs}:{nonce}`) when another worker is currently rendering this entry,
   * or `null` when the entry is complete and freely serveable.
   */
  pending: string | null
}

/**
 * Internal page-cache helper. Returns the cached HTML for the given key, or `null` when nothing usable is in cache.
 *
 * Pending entries past their deadline are treated as stale and not returned - the next caller is expected to
 * re-render. Expired entries are not returned either.
 *
 * Use {@link tryMarkPagePending} and {@link writePageCacheEntry} for the writer path. The primary `pruvious.cache.prefix`
 * is prepended automatically.
 */
export async function getPageCacheEntry(key: string): Promise<PageCacheEntry | null> {
  const { getCacheDatabase } = await import('#pruvious/server')
  const db = getCacheDatabase()
  const { prefix } = useRuntimeConfig().pruvious.cache
  const fullKey = prefix ? `${prefix}:${key}` : key
  const now = Date.now()

  if (db instanceof Database) {
    const rows = await db.exec(
      `select "value", "pending" from "Cache" where "key" = $key and ("expiresAt" is null or "expiresAt" >= $now)`,
      { key: fullKey, now },
    )
    const row = rows[0]
    if (!row) {
      return null
    }
    const pendingDeadline = parsePendingDeadline(row.pending)
    if (pendingDeadline !== null && pendingDeadline >= now) {
      return null
    }
    return { value: row.value, pending: pendingDeadline === null ? row.pending : null }
  } else {
    const value = await db.get(fullKey)
    if (!value) {
      return null
    }
    const pendingToken = await db.get(pendingCompanionKey(key))
    const pendingDeadline = parsePendingDeadline(pendingToken)
    if (pendingDeadline !== null && pendingDeadline >= now) {
      return null
    }
    return { value, pending: pendingDeadline === null ? pendingToken : null }
  }
}

/**
 * Internal page-cache helper. Attempts to atomically claim the right to render the page at `key`.
 *
 * Stores a uniqueness token (`{deadlineMs}:{nonce}`) in the `pending` column / Redis companion key.
 * If another worker already holds an unexpired claim, this caller loses (returns `null`).
 *
 * @returns the claim token on success, `null` if another worker is currently rendering.
 */
export async function tryMarkPagePending(key: string, timeoutMs: number): Promise<string | null> {
  const { getCacheDatabase } = await import('#pruvious/server')
  const db = getCacheDatabase()
  const { prefix } = useRuntimeConfig().pruvious.cache
  const fullKey = prefix ? `${prefix}:${key}` : key
  const now = Date.now()
  const deadline = now + timeoutMs
  const deadlineStr = String(deadline).padStart(PENDING_DEADLINE_WIDTH, '0')
  const token = `${deadlineStr}:${randomIdentifier(8)}`

  if (db instanceof Database) {
    await db.exec(
      `insert into "Cache" ("key", "value", "pending", "createdAt") values ($key, '', $token, $now)
       on conflict ("key") do update set "pending" = $token, "createdAt" = $now
       where "Cache"."pending" is null
          or cast(substr("Cache"."pending", 1, ${PENDING_DEADLINE_WIDTH}) as integer) < $now`,
      { key: fullKey, token, now },
    )
    const rows = await db.exec(`select "pending" from "Cache" where "key" = $key`, { key: fullKey })
    return rows[0]?.pending === token ? token : null
  } else {
    const pendingKey = pendingCompanionKey(key)
    const result = await db.set(pendingKey, token, 'PX', timeoutMs, 'NX')
    return result === 'OK' ? token : null
  }
}

/**
 * Internal page-cache helper. Completes an in-flight render by writing the rendered HTML body
 * and clearing the pending claim. Pass the token returned from {@link tryMarkPagePending} to ensure
 * we only overwrite our own claim (defense against late writes by losers).
 */
export async function writePageCacheEntry(
  key: string,
  value: string,
  expiresAt: number | null,
  token: string,
): Promise<boolean> {
  const { getCacheDatabase } = await import('#pruvious/server')
  const db = getCacheDatabase()
  const { prefix } = useRuntimeConfig().pruvious.cache
  const fullKey = prefix ? `${prefix}:${key}` : key
  const now = Date.now()

  if (expiresAt !== null && expiresAt - now <= 0) {
    return false
  }

  if (db instanceof Database) {
    const result = await db.exec(
      `update "Cache" set "value" = $value, "pending" = null, "expiresAt" = $expiresAt, "createdAt" = $now where "key" = $key and "pending" = $token`,
      { key: fullKey, value, expiresAt, now, token },
    )
    return result === 1
  } else {
    const pendingKey = pendingCompanionKey(key)
    const ttl = isNull(expiresAt) ? null : expiresAt - now
    const result = await db.eval(
      WRITE_PAGE_CACHE_LUA,
      2,
      fullKey,
      pendingKey,
      token,
      value,
      ttl === null ? '' : String(ttl),
    )
    return result === 1
  }
}

const WRITE_PAGE_CACHE_LUA = `
if redis.call('GET', KEYS[2]) ~= ARGV[1] then
  return 0
end
if ARGV[3] == '' then
  redis.call('SET', KEYS[1], ARGV[2])
else
  redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
end
redis.call('DEL', KEYS[2])
return 1
`

const PENDING_DEADLINE_WIDTH = 13

/**
 * Parses the deadline portion of a `{deadlineMs}:{nonce}` pending token.
 * Returns `null` when the token is missing or malformed.
 */
function parsePendingDeadline(token: string | null | undefined): number | null {
  if (!token || typeof token !== 'string') {
    return null
  }
  const parsed = parseInt(token.slice(0, PENDING_DEADLINE_WIDTH), 10)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Builds the Redis companion key for an in-flight render claim.
 *
 * Given a primary key of the form `page:{rest}`, returns `{primaryPrefix}:page:pending:{rest}`.
 * The result lives under the `page:` namespace so `clearCache('page')` evicts it together with the value entry.
 */
function pendingCompanionKey(key: string): string {
  const { prefix } = useRuntimeConfig().pruvious.cache
  const withPendingNamespace = key.replace(/^page:/, 'page:pending:')
  return prefix ? `${prefix}:${withPendingNamespace}` : withPendingNamespace
}
