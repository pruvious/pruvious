import type { AuthUser } from '#pruvious'
import { getHeader, type H3Event } from 'h3'
import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'
import { Op } from 'sequelize'
import { query } from '../collections/query'
import { cache } from '../instances/cache'
import { db } from '../instances/database'
import { getModuleOption } from '../instances/state'
import { isPositiveInteger } from '../utils/number'

export interface TokenData {
  /**
   * The ID of the user to whom the token is issued.
   */
  userId: number

  /**
   * The timestamp (in seconds since the Unix epoch) indicating when the token was issued.
   */
  iat: number

  /**
   * The timestamp (in seconds since the Unix epoch) indicating the expiration date of the token.
   */
  exp: number
}

/**
 * Delete expired tokens from the internal database table `_tokens`.
 *
 * @returns The number of deleted tokens.
 */
export async function cleanExpiredTokens(): Promise<number> {
  return await (await db()).model('_tokens').destroy({ where: { exp: { [Op.lt]: Date.now() / 1000 } } })
}

/**
 * Check if a token exists in the cache or the internal '_tokens' database table.
 * If found, return the token data, or `null` if not found.
 */
export async function fetchToken(token: string): Promise<(TokenData & { token: string }) | null> {
  try {
    const tokenData = jwt.decode(token) as TokenData
    const cacheKey = `pruvious:token:${tokenData.userId}:${token}`

    if (!isValidTokenData(tokenData)) {
      return null
    }

    if (await (await cache())?.exists(cacheKey)) {
      return { token, ...tokenData }
    }

    if (await (await db()).model('_tokens').count({ where: { token } })) {
      await (await cache())?.set(cacheKey, tokenData.exp, { PX: tokenData.exp * 1000 - Date.now() })
      return { token, ...tokenData }
    }
  } catch {}

  return null
}

/**
 * Get the `Bearer` token from the `Authorization` request header.
 *
 * If no token is available, an empty string is returned.
 */
export function getBearerToken(event: H3Event): string {
  return getHeader(event, 'Authorization')?.slice(7) ?? ''
}

/**
 * Generate a new JSON Web Token (JWT) for a user with the given `userId`.
 *
 * The `expiresIn` parameter is expressed in seconds or a string describing a time span (e.g., 60, '2 minutes', '10h', '7d').
 *
 * @example
 * ```typescript
 * generateToken(1, '4 hours')
 * ```
 */
export function generateToken(userId: number, expiresIn: string | number) {
  return jwt.sign({ userId, jti: nanoid() }, getModuleOption('jwt').secretKey, { expiresIn })
}

/**
 * Delete a specific token from the database and cache.
 *
 * @returns `true` if the token is successfully deleted, `false` if not.
 */
export async function removeToken(token: string): Promise<boolean> {
  try {
    const tokenData = jwt.decode(token) as TokenData

    if (!isValidTokenData(tokenData)) {
      return false
    }

    const deleted = await (await db()).model('_tokens').destroy({ where: { token } })
    await (await cache())?.del(`pruvious:token:${tokenData.userId}:${token}`)
    return !!deleted
  } catch {}

  return false
}

/**
 * Delete all stored tokens associated with a `userId`.
 *
 * @returns The number of deleted tokens.
 */
export async function removeUserTokens(userId: number, except?: string): Promise<number> {
  const where: Record<string, any> = { user_id: userId }

  if (except) {
    where.token = { [Op.ne]: except }
  }

  const rows: any[] = await (await db()).model('_tokens').findAll({ attributes: ['token'], where, raw: true })
  const deleted = await (await db()).model('_tokens').destroy({ where })

  for (const { token } of rows) {
    await (await cache())?.del(`pruvious:token:${userId}:${token}`)
  }

  return deleted
}

/**
 * Store a token into the internal database table `_tokens` and cache if possible.
 */
export async function storeToken(token: string): Promise<void> {
  const { userId, iat, exp } = jwt.decode(token) as TokenData
  await (await db()).model('_tokens').create({ token, user_id: userId, iat, exp })
  await (await cache())?.set(`pruvious:token:${userId}:${token}`, exp, { PX: exp * 1000 - Date.now() })
}

/**
 * Verify a JSON Web Token (JWT) and return an object with the verification results.
 *
 * @returns An object with the verification results, including the following properties:
 * - `isValid` (boolean) - Indicates whether the token is valid or not.
 * - `user` (AuthUser|null) - The user record if the token is valid, or `null` if not.
 * - `tokenData` (TokenData|null) - The data extracted from the JWT if the token is valid, or `null` if not.
 *
 * @example
 * ```typescript
 * const { isValid, user, tokenData } = await verifyToken(token)
 * ```
 */
export async function verifyToken(
  token: string,
): Promise<{ isValid: true; user: AuthUser; tokenData: TokenData } | { isValid: false; user: null; tokenData: null }> {
  try {
    const tokenData = jwt.verify(token, getModuleOption('jwt').secretKey) as TokenData

    if (isValidTokenData(tokenData)) {
      const stored = await fetchToken(token)

      if (stored?.userId === tokenData.userId && stored.iat === tokenData.iat && stored.exp === tokenData.exp) {
        const user = await query('users').deselect({ password: true }).where('id', tokenData.userId).populate().first()

        if (user && user.isActive) {
          return { isValid: true, user, tokenData }
        }
      }
    }
  } catch {}

  return { isValid: false, user: null, tokenData: null }
}

function isValidTokenData(tokenData: TokenData): boolean {
  return isPositiveInteger(tokenData?.userId) && isPositiveInteger(tokenData.exp) && tokenData.exp >= Date.now() / 1000
}
