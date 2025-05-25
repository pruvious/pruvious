import type { Collections, Permission, PruviousContext, Singletons } from '#pruvious/server'
import type { QueryBuilderResult } from '@pruvious/orm'
import {
  defu,
  isArray,
  isNumber,
  isObject,
  isPositiveInteger,
  isString,
  isUndefined,
  kebabCase,
  toArray,
  uniqueArray,
  type DeepRequired,
} from '@pruvious/utils'
import { compareSync, hashSync } from 'bcrypt-edge'
import { decodeJwt, jwtVerify, SignJWT } from 'jose'
import { isProduction } from 'std-env'
import type { ClientTokenStorage, PruviousModuleOptions, ServerTokenSource } from '../PruviousModuleOptions'

/**
 * A reference hash table used for constant-time comparison.
 * Stores precomputed hashes for password '12345678' to mitigate timing attacks.
 * Each hash is generated using different algorithms and work factors.
 */
const hashTable = {
  bcrypt: {
    4: '$2a$04$Sz4AH6b/7Nee1zdwTgoAiuJuUbYGonvJosBbqTZ4Y3JTrobHUKghy',
    5: '$2a$05$3TQ77E57Xqzxp85GWjH.nOY/p1Oz5KkkhVj2vz0V/XVsdrv4PlxBC',
    6: '$2a$06$exsfhDofKtJF0he5kTKJHe.jlBEIGkK30v0ha4oYzortatj3Iegpu',
    7: '$2a$07$3GYY0pHmU4x98bterawKRegkc2idUB48H18lDMF.468xNuI7Bco4W',
    8: '$2a$08$D2Nco96af4oca6RDOkl0bOuJaraptJZzLBshI82vg.Su1FbtJwkFG',
    9: '$2a$09$bMB3JHD5KRekmNlA2q2tWuLd4lfvj.rCpz820EhFBj4s25VFtDCWS',
    10: '$2a$10$p5PcDQ8M9LTyNKaGyrIi5u72CybEIXxsPmGH7.Z3NlzF7P.tHbAQO',
    11: '$2a$11$E2k4Fn57PX2.Sr0tHjlOGuBJeeabFGGR7mccyWixKdJZBxa8I1Pfq',
    12: '$2a$12$zoCjs6KAvoEzIUx4codH6O2Lw/BFmRWrY9t/E3X3NeHSOlAomN/.q',
    13: '$2a$13$7YAajP.kVMQr0tm5jz7aKuuXANl/q1vA4PGvy7HeTcFFIHYeaD3qa',
    14: '$2a$14$AWo./XigBuZeW/k3dIj0tO2J7hyy8He4txaE3.7JVWu0n0JGAx9A2',
    15: '$2a$15$2SMGQXfuTL7E9wTjmblnleEkKwRCI3hLLals/KtmQa/E7Zu5fjHHy',
    16: '$2a$16$9/2sjyw3b84Yk7.TT1GIGuc8hYOmBq1yFUEwt4P9pQT5STpK0Jmfe',
    17: '$2a$17$lfsJHVHGg2vHoayOr053m.vu/1XOG8oP.ZzuKAPLRQjwZ4V76jqiK',
    18: '$2a$18$ZjTSgThAJSNwN48SQjmRkuFal7jS0Inc.L09hvMQr.H.64qFvY94i',
  },
}

/**
 * Resolves the `auth.tokenResolution` option from the `PruviousModuleOptions` to a list of `ServerTokenSource` objects.
 */
export function resolveAuthTokenResolutionConfig(
  resolution: PruviousModuleOptions['auth']['tokenResolution'],
): DeepRequired<ServerTokenSource>[] {
  const sources: DeepRequired<ServerTokenSource>[] = []
  const defaultSources = {
    authorizationHeader: { source: 'authorizationHeader' } satisfies ServerTokenSource,
    cookies: { source: 'cookies', headerAndPayload: 'token', signature: 'signature' } satisfies ServerTokenSource,
  } as const

  if (isUndefined(resolution)) {
    sources.push(defaultSources.authorizationHeader, defaultSources.cookies)
  } else if (isArray(resolution)) {
    // Resolve only the last two sources in the array
    for (const source of resolution.slice(-2)) {
      if (isString(source)) {
        sources.push(defaultSources[source])
      } else {
        sources.push(defu(source as any, defaultSources[source.source]))
      }
    }
  } else if (isString(resolution)) {
    sources.push(defaultSources[resolution])
  } else {
    sources.push(defu(resolution as any, defaultSources[resolution.source]))
  }

  return sources
}

/**
 * Resolves the `auth.tokenStorage` option from the `PruviousModuleOptions` to a `ClientTokenStorage` object.
 */
export function resolveAuthTokenStorageConfig(
  tokenStorage: PruviousModuleOptions['auth']['tokenStorage'],
): DeepRequired<ClientTokenStorage> {
  const defaultStorages = {
    cookies: {
      storage: 'cookies',
      headerAndPayload: {
        name: 'token',
        secure: 'auto',
        sameSite: 'strict',
      },
      signature: {
        name: 'signature',
        httpOnly: true,
        secure: 'auto',
        sameSite: 'strict',
      },
    } satisfies ClientTokenStorage,
    localStorage: {
      storage: 'localStorage',
      key: 'token',
    } satisfies ClientTokenStorage,
  } as const

  if (isString(tokenStorage)) {
    return defaultStorages[tokenStorage]
  } else if (isObject(tokenStorage)) {
    return defu(tokenStorage as any, defaultStorages[tokenStorage.storage])
  }

  return defaultStorages.cookies
}

/**
 * Creates and signs a JSON Web Token (JWT) using the configured `auth.jwt` settings.
 *
 * The `userResultOrSubject` parameter can be:
 *
 * - A `QueryBuilderResult` containing the user's `tokenSubject`.
 * - A direct user `tokenSubject` string to sign.
 *
 * You can specify whether to use the extended expiration time by setting `extended` to `true`.
 *
 * @returns a `Promise` that resolves to the signed JWT string.
 * @throws an error if the `tokenSubject` is missing or invalid.
 */
export async function signToken(
  userResultOrSubject: QueryBuilderResult<{ tokenSubject: string } | null> | string | undefined,
  extended?: boolean,
): Promise<string>

/**
 * Creates and signs a JSON Web Token (JWT) using the configured `auth.jwt` settings.
 *
 * The `userResultOrSubject` parameter can be:
 *
 * - A `QueryBuilderResult` containing the user's `tokenSubject`.
 * - A direct user `tokenSubject` string to sign.
 *
 * You can specify the token `expiration` time as a number of seconds, a string (e.g. `1h`), or a `Date` object.
 *
 * @returns a `Promise` that resolves to the signed JWT string.
 * @throws an error if the `tokenSubject` is missing or invalid.
 */
export async function signToken(
  userResultOrSubject: QueryBuilderResult<{ tokenSubject: string } | null> | string | undefined,
  expiration: number | string | Date,
): Promise<string>

export async function signToken(
  userResultOrSubject: QueryBuilderResult<{ tokenSubject: string } | null> | string | undefined,
  extendedOrExpiration: boolean | number | string | Date = false,
): Promise<string> {
  const subject = isObject(userResultOrSubject) ? userResultOrSubject.data?.tokenSubject : userResultOrSubject

  if (!subject) {
    throw new Error('The token subject is missing')
  } else if (!/^[a-f0-9]{64}$/.test(subject)) {
    throw new Error('The token subject must be a 32-byte hexadecimal string')
  }

  const runtimeConfig = useRuntimeConfig()
  const { secret, claims, expiration } = runtimeConfig.pruvious.auth.jwt
  const alg = 'HS256'
  const key = new TextEncoder().encode(secret)
  const exp = isNumber(extendedOrExpiration)
    ? extendedOrExpiration
    : extendedOrExpiration
      ? expiration.extended
      : expiration.default

  return await new SignJWT(claims)
    .setProtectedHeader({ alg })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key)
}

/**
 * Validates and decodes a JSON Web Token (JWT) and verifies whether a corresponding valid user record exists.
 *
 * @returns a `Promise` that resolves to the user record if token is valid, otherwise `null`.
 */
export async function verifyToken(
  token: string,
): Promise<({ id: number } & Collections['Users']['TPopulatedTypes']) | null> {
  const runtimeConfig = useRuntimeConfig()
  const { secret } = runtimeConfig.pruvious.auth.jwt
  const key = new TextEncoder().encode(secret)

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })

    if (isString(payload.sub) && isPositiveInteger(payload.exp) && isPositiveInteger(payload.iat)) {
      const { selectFrom } = await import('#pruvious/server')
      const [{ success, data }, _isInvalidatedToken] = await Promise.all([
        selectFrom('Users')
          .where('tokenSubject', '=', payload.sub)
          .where('isActive', '=', true)
          .populate()
          .withCustomContextData({ _ignoreDenyWhereHook: true, _ignoreMaskFieldsHook: true })
          .first(),
        isInvalidatedToken(token),
      ])

      if (success && !_isInvalidatedToken) {
        return data
      }
    }
  } catch {}

  return null
}

/**
 * Invalidates a `token` by storing it in the cache with an expiration time equal to the token's expiration time.
 * The token must be a valid JWT string.
 */
export async function invalidateToken(token: string): Promise<boolean> {
  const { setCache } = await import('#pruvious/server')
  const runtimeConfig = useRuntimeConfig()
  const { secret } = runtimeConfig.pruvious.auth.jwt
  const key = new TextEncoder().encode(secret)

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })

    if (isString(payload.sub) && isPositiveInteger(payload.exp) && isPositiveInteger(payload.iat)) {
      return setCache(`invalidate:${token}`, Date.now().toString(), payload.exp * 1000)
    }
  } catch {}

  return false
}

/**
 * Checks whether a `token` has been invalidated.
 */
export async function isInvalidatedToken(token: string): Promise<boolean> {
  const { getCache } = await import('#pruvious/server')
  return !!(await getCache(`invalidate:${token}`))
}

/**
 * Stores an authentication `token` in two separate cookies based on the configuration defined in `auth.tokenStorage`.
 * This function only executes if the `auth.tokenStorage.storage` type is set to 'cookies'.
 *
 * @throws an error if the `token` is not a valid JWT string.
 */
export function setTokenCookies(token: string) {
  const runtimeConfig = useRuntimeConfig()
  const { tokenStorage } = runtimeConfig.pruvious.auth

  if (tokenStorage.storage === 'cookies') {
    const event = useEvent()
    const { exp } = decodeJwt(token)
    const [headerAndPayload, signature] = token.split(/\.(?=[^.]+$)/)

    setCookie(event, tokenStorage.headerAndPayload.name, headerAndPayload!, {
      expires: new Date(exp! * 1000),
      secure: tokenStorage.headerAndPayload.secure === 'auto' ? isProduction : tokenStorage.headerAndPayload.secure,
      sameSite: tokenStorage.headerAndPayload.sameSite,
    })

    setCookie(event, tokenStorage.signature.name, signature!, {
      expires: new Date(exp! * 1000),
      httpOnly: tokenStorage.signature.httpOnly,
      secure: tokenStorage.signature.secure === 'auto' ? isProduction : tokenStorage.signature.secure,
      sameSite: tokenStorage.signature.sameSite,
    })
  }
}

/**
 * Removes the authentication token from the request cookies based on the configuration defined in `auth.tokenStorage`.
 * This function only executes if the `auth.tokenStorage.storage` type is set to 'cookies'.
 */
export function removeTokenCookies() {
  const runtimeConfig = useRuntimeConfig()
  const { tokenStorage } = runtimeConfig.pruvious.auth
  const event = useEvent()

  if (tokenStorage.storage === 'cookies') {
    deleteCookie(event, tokenStorage.headerAndPayload.name, {
      secure: tokenStorage.headerAndPayload.secure === 'auto' ? isProduction : tokenStorage.headerAndPayload.secure,
      sameSite: tokenStorage.headerAndPayload.sameSite,
    })

    deleteCookie(event, tokenStorage.signature.name, {
      httpOnly: tokenStorage.signature.httpOnly,
      secure: tokenStorage.signature.secure === 'auto' ? isProduction : tokenStorage.signature.secure,
      sameSite: tokenStorage.signature.sameSite,
    })
  }
}

/**
 * Retrieves the authentication token from the request cookies or `Authorization` header.
 * The sources are resolved based on the configuration defined in `auth.tokenResolution`.
 *
 * @returns the token string or `null` if not found.
 */
export function getToken(): string | null {
  const runtimeConfig = useRuntimeConfig()
  const { tokenResolution } = runtimeConfig.pruvious.auth

  for (const resolution of tokenResolution) {
    let token: string | null = null

    if (resolution.source === 'cookies') {
      token = getTokenFromCookies(resolution.headerAndPayload, resolution.signature)
    } else if (resolution.source === 'authorizationHeader') {
      token = getTokenFromAuthorizationHeader()
    }

    if (token) {
      return token
    }
  }

  return null
}

/**
 * Extracts a JWT authentication token by combining data from two separate cookies.
 *
 * This function reads two cookies that together form a complete JWT token:
 *
 * 1. `headerAndPayload` - Contains the header and payload portions of the JWT.
 * 2. `signature` - Contains the signature portion of the JWT.
 *
 * @returns the token string or `null` if not found.
 */
export function getTokenFromCookies(headerAndPayload: string, signature: string): string | null {
  const event = useEvent()
  const hap = getCookie(event, headerAndPayload)
  const sig = getCookie(event, signature)

  if (hap && sig) {
    return `${hap}.${sig}`
  }

  return null
}

/**
 * Extracts the Bearer token from the HTTP `Authorization` header.
 *
 * The token should be in the format: `Bearer <token>`.
 *
 * @returns the token string or `null` if not found.
 */
export function getTokenFromAuthorizationHeader(): string | null {
  const event = useEvent()
  const authorization = getHeader(event, 'Authorization')

  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.slice(7)
  }

  return null
}

/**
 * Hashes a `password` using the algorithm specified in the `auth.hash` options.
 *
 * @returns a `Promise` that resolves to the hashed password string.
 */
export async function hashPassword(password: string): Promise<string> {
  const runtimeConfig = useRuntimeConfig()

  if (runtimeConfig.pruvious.auth.hash.algorithm === 'bcrypt') {
    return hashSync(password, runtimeConfig.pruvious.auth.hash.bcrypt.rounds)
  } else {
    throw new Error('Unsupported hash algorithm')
  }
}

/**
 * Verifies a `password` by comparing it against a hash or user record.
 *
 * The `userQueryResultOrHash` parameter can be:
 *
 * - A `QueryBuilderResult` containing the user's hashed password.
 * - A direct hash string to compare against.
 * - `undefined`, in which case a dummy comparison is performed to prevent timing attacks.
 *
 * @returns a `Promise` that resolves to `true` if the password is valid, `false` otherwise.
 */
export async function verifyPassword(
  password: string,
  userQueryResultOrHash: QueryBuilderResult<{ password: string } | null> | string | undefined,
): Promise<boolean> {
  const runtimeConfig = useRuntimeConfig()

  if (runtimeConfig.pruvious.auth.hash.algorithm === 'bcrypt') {
    if (isObject(userQueryResultOrHash)) {
      if (userQueryResultOrHash.success && isString(userQueryResultOrHash.data?.password)) {
        return compareSync(password, userQueryResultOrHash.data.password)
      }
    } else if (isString(userQueryResultOrHash)) {
      return compareSync(password, userQueryResultOrHash)
    }

    // Prevent timing attacks
    const rounds = runtimeConfig.pruvious.auth.hash.bcrypt.rounds as keyof typeof hashTable.bcrypt
    compareSync(password, hashTable.bcrypt[rounds] ?? hashTable.bcrypt[12])
  } else {
    throw new Error('Unsupported hash algorithm')
  }

  return false
}

/**
 * Resolves the current user's authentication status and permissions.
 * The resolved data is stored in the `event.context.pruvious.auth` object.
 */
export async function resolveCurrentUser() {
  const event = useEvent()
  const { permissions } = await import('#pruvious/server')

  event.context.pruvious ??= {} as any
  event.context.pruvious.auth = { isLoggedIn: false, user: null, permissions: [] }

  const token = getToken()
  if (token) {
    const user = await verifyToken(token)
    if (user) {
      event.context.pruvious.auth = { isLoggedIn: true, user, permissions: [] }
      if (user.isAdmin) {
        event.context.pruvious.auth.permissions = permissions
      } else {
        event.context.pruvious.auth.permissions = uniqueArray(user.roles.flatMap(({ permissions }) => permissions))
      }
    }
  }

  return event.context.pruvious.auth
}

/**
 * Checks if a user is currently logged in.
 *
 * Alternatively, you can use the `event.context.pruvious.auth` object to access the current user's authentication state.
 *
 * @example
 * ```ts
 * if (isLoggedIn()) {
 *   // User is authenticated
 * } else {
 *   // No user is logged in
 * }
 * ```
 */
export function isLoggedIn(): boolean {
  return useEvent().context.pruvious.auth.isLoggedIn
}

/**
 * Retrieves the current user object if a user is logged in.
 * Returns `null` if no user is currently logged in.
 *
 * Alternatively, you can use the `event.context.pruvious.auth` object to access the current user's authentication state.
 *
 * @example
 * ```ts
 * const user = getUser()
 *
 * if (user) {
 *   console.log(user.id)
 * }
 * ```
 */
export function getUser(): PruviousContext['auth']['user'] {
  return useEvent().context.pruvious.auth.user
}

/**
 * Verifies if the authenticated user has all specified permissions.
 * Returns `false` if no user is currently logged in.
 *
 * Multiple permissions can be checked simultaneously.
 * The function only returns `true` if ALL requested permissions are present.
 *
 * @example
 * ```ts
 * // Check single permission
 * hasPermission('collection:users:read')
 *
 * // Check multiple permissions (all must be present)
 * hasPermission('collection:users:create', 'collection:users:read')
 * hasPermission(['collection:users:create', 'collection:users:read'])
 * ```
 */
export function hasPermission(permission: Permission | Permission[], ...permissions: Permission[]): boolean {
  const event = useEvent()
  return (
    event.context.pruvious.auth.isLoggedIn &&
    [...toArray(permission), ...permissions].every((p) =>
      (event.context.pruvious.auth.permissions as Permission[]).includes(p),
    )
  )
}

/**
 * Checks if the authenticated user has permission to perform a specific `operation` on a `collection`.
 * Returns `false` if no user is currently logged in.
 *
 * A shorthand for checking collection-specific permissions using the format `collection:{slug}:{operation}`.
 *
 * @example
 * ```ts
 * if (hasCollectionPermission('users', 'read')) {
 *   // User can read from users collection
 * }
 *
 * if (hasCollectionPermission('pages', 'create')) {
 *   // User can create new pages
 * }
 * ```
 */
export function hasCollectionPermission(
  collection: keyof Collections,
  operation: 'create' | 'read' | 'update' | 'delete',
) {
  return hasPermission(`collection:${kebabCase(collection)}:${operation}` as Permission)
}

/**
 * Checks if the authenticated user has permission to perform a specific `operation` on a `singleton`.
 * Returns `false` if no user is currently logged in.
 *
 * A shorthand for checking singleton-specific permissions using the format `singleton:{slug}:{operation}`.
 *
 * @example
 * ```ts
 * if (hasSingletonPermission('seo', 'read')) {
 *   // User can read SEO settings
 * }
 *
 * if (hasSingletonPermission('seo', 'update')) {
 *   // User can create update SEO settings
 * }
 * ```
 */
export function hasSingletonPermission(singleton: keyof Singletons, operation: 'read' | 'update') {
  return hasPermission(`singleton:${kebabCase(singleton)}:${operation}` as Permission)
}
