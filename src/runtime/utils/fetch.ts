import { isRef, useRuntimeConfig, type Ref } from '#imports'
import type { AuthUser, CreateInput, Field, SupportedLanguage } from '#pruvious'
import type { NitroFetchOptions } from 'nitropack'
import { getLanguage } from '../composables/language'
import type { PruviousPage } from '../composables/page'
import { getRawToken, removeToken } from '../composables/token'
import type { TranslatableStringsDefinition } from '../translatable-strings/translatable-strings.definition'
import { isObject } from './object'
import { joinRouteParts } from './string'

export type PruviousFetchResponse<T extends any> =
  | {
      /**
       * Represents the success state of the fetch request.
       */
      success: true

      /**
       * The response code.
       */
      code: number

      /**
       * The response data.
       */
      data: T
    }
  | {
      /**
       * Represents the success state of the fetch request.
       */
      success: false

      /**
       * The response code.
       */
      code: number

      /**
       * Contains the response error, which can be either a string message or a key-value object.
       * If it's an object, the keys typically represent field names, and the values are error messages.
       */
      error: string | Record<string, string>
    }

export type PruviousApiPath =
  | 'clear-cache.post'
  | 'dashboard.get'
  | 'install.post'
  | 'installed.get'
  | 'login.post'
  | 'logout.post'
  | 'logout-all.post'
  | 'logout-others.post'
  | 'pages.get'
  | 'previews.get'
  | 'profile.get'
  | 'profile.patch'
  | 'renew-token.post'
  | 'translatable-strings.get'

export type PruviousFetchOptions = Omit<NitroFetchOptions<any>, 'body' | 'params' | 'query'> & {
  /**
   * Subpath to add to the API route.
   */
  subpath?: string

  /**
   * Whether to dispatch the following events on the `window` object:
   *
   * - `pruvious-fetch-start`
   * - `pruvious-fetch-unauthorized`
   * - `pruvious-fetch-error`
   * - `pruvious-fetch-end`
   */
  dispatchEvents?: boolean
}

/**
 * Wrapper for `$fetch` for Pruvious API route requests.
 *
 * @example
 * ```typescript
 * const response = await pruviousFetch('login.post', { email: '...', password: '...' })
 *
 * if (response.success) {
 *   console.log(response.data)
 * } else {
 *   console.log(response.error)
 * }
 * ```
 */
export async function pruviousFetch<Data = { fields: Record<Field['type'], string> }>(
  path: 'clear-cache.post',
  options?: PruviousFetchOptions,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data = { fields: Record<Field['type'], string> }>(
  path: 'dashboard.get',
  options?: PruviousFetchOptions,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data = string>(
  path: 'install.post',
  options: {
    body: {
      firstName?: string | Ref<string>
      lastName?: string | Ref<string>
      email: string | Ref<string>
      password: string | Ref<string>
    }
  } & PruviousFetchOptions,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data = boolean>(
  path: 'installed.get',
  options?: PruviousFetchOptions,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data = string>(
  path: 'login.post',
  options: {
    body: { email: string | Ref<string>; password: string | Ref<string>; remember?: boolean | Ref<boolean> }
  } & PruviousFetchOptions,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data = undefined>(
  path: 'logout.post',
  options?: PruviousFetchOptions,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data = number>(
  path: 'logout-all.post',
  options?: PruviousFetchOptions,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data = number>(
  path: 'logout-others.post',
  options?: PruviousFetchOptions,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data = PruviousPage>(
  path: 'pages.get',
  options?: PruviousFetchOptions,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data = PruviousPage>(
  path: 'previews.get',
  options?: PruviousFetchOptions,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data = AuthUser>(
  path: 'profile.get',
  options?: PruviousFetchOptions,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data = AuthUser>(
  path: 'profile.patch',
  options: {
    body: Omit<CreateInput['users'], 'capabilities' | 'email' | 'isActive' | 'isAdmin' | 'role'>
  } & PruviousFetchOptions,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data = string>(
  path: 'renew-token.post',
  options?: PruviousFetchOptions,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data = TranslatableStringsDefinition['strings']>(
  path: 'translatable-strings.get',
  options?: PruviousFetchOptions & { query: { language: SupportedLanguage } },
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data>(
  path: string,
  options?: PruviousFetchOptions & NitroFetchOptions<any>,
): Promise<PruviousFetchResponse<Data>>

export async function pruviousFetch<Data>(
  path: PruviousApiPath | string,
  options?: Record<string, any>,
): Promise<PruviousFetchResponse<Data>> {
  const defaultOptions: PruviousFetchOptions = {}
  const dispatchEvents = options?.dispatchEvents !== false

  let resolvedPath = '/'
  let error: { data: string | Record<string, string>; message?: string } | undefined
  let code!: number

  defaultOptions.method = path.split('.').pop()!.toUpperCase() as any
  defaultOptions.method =
    defaultOptions.method && ['GET', 'POST', 'PATCH', 'DELETE'].includes(defaultOptions.method)
      ? defaultOptions.method
      : 'GET'

  resolvedPath = pruviousApiPath(path)

  if (options?.subpath) {
    resolvedPath = joinRouteParts(resolvedPath, options.subpath)
  }

  if (options && isObject(options.body)) {
    options.body = Object.fromEntries(
      Object.entries(options.body).map(([key, value]) => [key, isRef(value) ? value.value : value]),
    )
  }

  // Resolve headers
  const token = getRawToken()
  const headers = (options?.headers ?? {}) as Record<string, any>

  if (!headers['Accept-Language']) {
    headers['Accept-Language'] = getLanguage()
  }

  if (!headers['Authorization'] && token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const data = await $fetch<Data>(resolvedPath, {
    headers,
    onRequest() {
      if (process.client && dispatchEvents) {
        window.dispatchEvent(new CustomEvent('pruvious-fetch-start'))
      }
    },
    onResponse: ({ response }) => {
      code = response.status
    },
    onResponseError: ({ response }) => {
      if (response.status === 401) {
        removeToken()
        // navigateToPruviousDashboardPath('login')
        // @todo show login popup instead (more friendly and prevents content editors from losing data)
        // ^ don't load anything dashboard related here, rather fire an event (client only)
        if (process.client && dispatchEvents) {
          window.dispatchEvent(new CustomEvent('pruvious-fetch-unauthorized'))
        }
      }

      if (process.client && dispatchEvents) {
        window.dispatchEvent(new CustomEvent('pruvious-fetch-error', { detail: response._data || response.statusText }))
      }
    },
    ...defaultOptions,
    ...(options ?? ({} as any)),
  })
    .catch((e) => (error = e))
    .finally(() => {
      if (process.client && dispatchEvents) {
        window.dispatchEvent(new CustomEvent('pruvious-fetch-end'))
      }
    })

  return error ? { success: false, code, error: error.data || error.message || '' } : { success: true, code, data }
}

/**
 * Generates API route paths for various endpoints.
 *
 * @example
 * ```typescript
 * pruviousApiPath('login.post') // Output: '/api/login'
 * ```
 */
export function pruviousApiPath(
  base:
    | 'clear-cache.post'
    | 'dashboard.get'
    | 'install.post'
    | 'installed.get'
    | 'login.post'
    | 'logout.post'
    | 'logout-all.post'
    | 'logout-others.post'
    | 'pages.get'
    | 'previews.get'
    | 'profile.get'
    | 'profile.patch'
    | 'renew-token.post'
    | 'translatable-strings.get'
    | string,
): string

export function pruviousApiPath(base: string, ...path: (string | number)[]): string {
  const runtimeConfig = useRuntimeConfig()

  return joinRouteParts(
    runtimeConfig.app.baseURL, // The subdirectory
    runtimeConfig.public.pruvious.api.prefix,
    (runtimeConfig.public.pruvious.api.routes as any)[base] || base.split('.')[0],
    ...path.map(String),
  )
}
