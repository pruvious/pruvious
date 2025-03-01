import { Database } from '@pruvious/orm'
import { isDefined, isNull, toDate } from '@pruvious/utils'

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
    return await db.del(prefix ? `${prefix}:*` : '*')
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
