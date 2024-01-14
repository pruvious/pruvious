import { useRuntimeConfig, useState, type Ref } from '#imports'
import decode from 'jwt-decode'
import { isPositiveInteger } from '../utils/number'

export interface PruviousToken {
  /**
   * The JSON Web Token.
   */
  token: string

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
 * The current JSON Web Token, including the token string, user ID, issue timestamp, and expiration timestamp.
 * Returns `null` if no token is available.
 */
export const useToken: () => Ref<PruviousToken | null> = () => useState('pruvious-token', () => null)

/**
 * Read the raw JSON Web Token from the local storage.
 */
export function getRawToken(): string | null {
  if (process.client) {
    const runtimeConfig = useRuntimeConfig()
    return localStorage.getItem(runtimeConfig.public.pruvious.jwtLocalStorageKey)
  }

  return null
}

/**
 * Read the JSON Web Token from the local storage.
 */
export function getToken(): PruviousToken | null {
  if (process.client) {
    const storedToken = useToken()

    let tmpToken: PruviousToken | null = storedToken.value

    if (!tmpToken) {
      const rawToken = getRawToken()

      if (rawToken) {
        try {
          tmpToken = { token: rawToken, ...(decode(rawToken) as Omit<PruviousToken, 'token'>) }
        } catch {
          removeToken()
        }
      }
    }

    if (tmpToken) {
      if (
        isPositiveInteger(tmpToken.userId) &&
        isPositiveInteger(tmpToken.iat) &&
        isPositiveInteger(tmpToken.exp) &&
        tmpToken.exp * 1000 > Date.now()
      ) {
        storedToken.value = tmpToken
      } else {
        removeToken()
      }
    }

    return storedToken.value
  }

  return null
}

/**
 * Delete the JSON Web Token from the local storage.
 */
export function removeToken() {
  if (process.client) {
    const runtimeConfig = useRuntimeConfig()
    const storedToken = useToken()

    localStorage.removeItem(runtimeConfig.public.pruvious.jwtLocalStorageKey)
    storedToken.value = null
  }
}

/**
 * Store the JSON Web Token in local storage.
 */
export function setToken(token: string) {
  if (process.client) {
    const runtimeConfig = useRuntimeConfig()
    localStorage.setItem(runtimeConfig.public.pruvious.jwtLocalStorageKey, token)
  }
}
