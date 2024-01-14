import { useState, type Ref } from '#imports'
import type { AuthUser, CreateInput } from '#pruvious'
import { pruviousFetch } from '../utils/fetch'
import { getToken, removeToken, setToken } from './token'

interface PruviousAuth {
  /**
   * Indicates whether the user is logged in.
   */
  isLoggedIn: boolean

  /**
   * The ID of the currently logged-in user or `null` if the user is not authenticated.
   * The user is resolved from the JSON Web Token from the browser's local storage.
   */
  userId: number | null
}

/**
 * The current Pruvious authentication state.
 */
export const useAuth: () => Ref<PruviousAuth> = () =>
  useState('pruvious-auth', () => ({
    isLoggedIn: false,
    userId: null,
  }))

/**
 * Logs the user in with the given credentials.
 *
 * @returns The login response from the server.
 */
export async function login(email: string, password: string, remember = false) {
  const response = await pruviousFetch('login.post', { body: { email, password, remember } })
  const auth = useAuth()

  if (response.success) {
    setToken(response.data)

    auth.value.isLoggedIn = true
    auth.value.userId = getToken()?.userId ?? null
  }

  return response
}

/**
 * Logs the user out from the current session.
 */
export async function logout() {
  await pruviousFetch('logout.post')
  removeToken()
  const auth = useAuth()
  auth.value.isLoggedIn = false
  auth.value.userId = null
}

/**
 * Logs the user out from all sessions.
 *
 * @returns The number of sessions that were logged out.
 */
export async function logoutAll() {
  const response = await pruviousFetch('logout-all.post')
  removeToken()
  const auth = useAuth()
  auth.value.isLoggedIn = false
  auth.value.userId = null

  if (response.success) {
    return response.data
  }

  return 0
}

/**
 * Logs the user out from all sessions except the current one.
 *
 * @returns The number of sessions that were logged out.
 */
export async function logoutOtherSessions() {
  const response = await pruviousFetch('logout-others.post')

  if (response.success) {
    return response.data
  }

  return 0
}

/**
 * Renews the current JSON Web Token.
 *
 * @returns The response from the server.
 */
export async function renewToken() {
  const response = await pruviousFetch('renew-token.post')

  if (response.success) {
    setToken(response.data)
  } else {
    removeToken()
    const auth = useAuth()
    auth.value.isLoggedIn = false
    auth.value.userId = null
  }

  return response
}

/**
 * Fetches the current user profile.
 */
export async function getUserProfile(): Promise<AuthUser | null> {
  const response = await pruviousFetch('profile.get')

  if (response.success) {
    return response.data
  }

  return null
}

/**
 * Updates the current user profile.
 *
 * Note: The user must have the `update-profile` capability to be able to update their profile.
 *
 * @returns The response from the server.
 */
export async function updateUserProfile(
  user: Partial<Omit<CreateInput['users'], 'capabilities' | 'email' | 'isActive' | 'isAdmin' | 'role'>>,
) {
  return await pruviousFetch('profile.patch', { body: user })
}
