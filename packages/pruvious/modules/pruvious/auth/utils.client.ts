import type { Collections, Permission, PruviousContext } from '#pruvious/server'
import { pruviousGet } from '../api/utils.client'

export type AuthState = PruviousContext<
  { id: number } & Omit<Collections['Users']['TPopulatedTypes'], 'password' | 'tokenSubject'>
>['auth']

let _authStatePayload: string | null = null

/**
 * Composable that provides access to the current user's authentication state.
 * The authentication is automatically resolved through either the `pruvious-auth` or `pruvious` middleware.
 */
export const useAuth = () =>
  useState<AuthState>('pruvious-auth', () => ({ isLoggedIn: false, user: null, permissions: [] }))

/**
 * Retrieves the current user authentication state from `/<pruvious.api.basePath>/auth/state`
 * if an auth token is present and not expired.
 * The HTTP request runs once per unique and valid token by default.
 * Set `force` to true to make the request run on every function call.
 *
 * Authentication is handled using the auth token stored in either cookies or `localStorage`.
 * You can customize this behavior in the `pruvious.auth.tokenStorage` option in `nuxt.config.js`.
 *
 * This function automatically updates the `useAuth` composable and returns the new auth state.
 *
 * If the current token is not valid or expired, it gets automatically removed from storage.
 *
 * Use this function only in client-side code.
 */
export async function refreshAuthState(force = false) {
  const auth = useAuth()
  const payload = getAuthTokenPayload()

  if (payload && payload.exp * 1000 > Date.now()) {
    const stringifiedPayload = JSON.stringify(payload)

    if (force || stringifiedPayload !== _authStatePayload) {
      const { success, data, error } = await pruviousGet('auth/state')

      if (success) {
        auth.value = data
        _authStatePayload = stringifiedPayload
      } else {
        removeAuthToken()
        _authStatePayload = null
        console.error(error)
      }
    }
  } else {
    removeAuthToken()
    _authStatePayload = null
  }

  return auth.value
}

/**
 * Retrieves the auth token payload from either cookies or `localStorage`.
 * You can customize this behavior in the `pruvious.auth.tokenStorage` option in `nuxt.config.js`.
 *
 * Use this function only in client-side code.
 */
export function getAuthTokenPayload(): { exp: number; iat: number; sub: string } | null {
  const { tokenStorage } = useRuntimeConfig().public.pruvious
  const hap =
    tokenStorage.storage === 'cookies'
      ? getAuthTokenCookies().headerAndPayload.value?.split('.')[1]
      : localStorage.getItem(tokenStorage.key)?.split('.')[1]

  if (hap) {
    try {
      return JSON.parse(atob(hap))
    } catch {}
  }

  return null
}

/**
 * Retrieves the time in milliseconds until the auth token expires.
 *
 * - If the token is already expired, it returns `0`.
 * - If no token is present, it returns `null`.
 *
 * Use this function only in client-side code.
 */
export function getAuthTokenExpiresIn(): number | null {
  const payload = getAuthTokenPayload()

  if (payload) {
    return Math.max(0, payload.exp * 1000 - Date.now())
  }

  return null
}

/**
 * Stores the auth token in `localStorage`.
 * Only executes when the `pruvious.auth.tokenStorage` is set to `localStorage`.
 * For cookie-based storage, token management is handled server-side.
 *
 * Use this function only in client-side code.
 */
export function storeAuthToken(token: string) {
  const { tokenStorage } = useRuntimeConfig().public.pruvious

  if (tokenStorage.storage === 'localStorage') {
    localStorage.setItem(tokenStorage.key, token)
  }
}

/**
 * Logs out the current user by removing the auth token from the local storage or cookies.
 *
 * This function automatically updates the `useAuth` composable and returns the updated value (`isLoggedIn: false`).
 *
 * Use this function only in client-side code.
 */
export function removeAuthToken() {
  const { tokenStorage } = useRuntimeConfig().public.pruvious

  if (tokenStorage.storage === 'cookies') {
    const { headerAndPayload } = getAuthTokenCookies()
    headerAndPayload.value = null
  } else {
    localStorage.removeItem(tokenStorage.key)
  }

  const auth = useAuth()
  auth.value = { isLoggedIn: false, user: null, permissions: [] }
  return auth.value
}

function getAuthTokenCookies(expires?: Date) {
  const { tokenStorage } = useRuntimeConfig().public.pruvious

  if (tokenStorage.storage !== 'cookies') {
    throw new Error()
  }

  const headerAndPayload = useCookie(tokenStorage.headerAndPayload.name, {
    expires,
    httpOnly: false,
    sameSite: tokenStorage.headerAndPayload.sameSite,
    secure: tokenStorage.headerAndPayload.secure === 'auto' ? !import.meta.dev : tokenStorage.headerAndPayload.secure,
  })

  const signature = useCookie(tokenStorage.signature.name, {
    expires,
    httpOnly: tokenStorage.signature.httpOnly,
    sameSite: tokenStorage.signature.sameSite,
    secure: tokenStorage.signature.secure === 'auto' ? !import.meta.dev : tokenStorage.signature.secure,
  })

  return { headerAndPayload, signature }
}

/**
 * Checks if a user is currently logged in.
 *
 * Alternatively, you can use the `useAuth()` composable to access the current user's authentication state.
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
  return useAuth().value.isLoggedIn
}

/**
 * Retrieves the current user object if a user is logged in.
 * Returns `null` if no user is currently logged in.
 *
 * Alternatively, you can use the `useAuth()` composable to access the current user's authentication state.
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
export function getUser(): AuthState['user'] {
  return useAuth().value.user
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
 * ```
 */
export function hasPermission(permission: Permission, ...permissions: Permission[]): boolean {
  const auth = useAuth()
  return (
    auth.value.isLoggedIn &&
    [permission, ...permissions].every((p) => (auth.value.permissions as Permission[]).includes(p))
  )
}
