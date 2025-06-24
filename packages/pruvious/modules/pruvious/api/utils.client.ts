import type {
  Collections,
  FieldsLayout,
  GenericSerializableFieldOptions,
  httpStatusCodeMessages,
  PruviousDashboardState,
  PruviousState,
  StandardRoutes,
} from '#pruvious/server'
import { clear, isFunction } from '@pruvious/utils'
import type { $Fetch, NitroFetchOptions } from 'nitropack/types'
import type { AuthState } from '../auth/utils.client'
import { useLanguage } from '../translations/utils.client'

export interface PruviousFetchBaseOptions {
  /**
   * A reactive reference to the form's input errors.
   *
   * @example
   * ```vue
   * <template>
   *   <div v-if="inputErrors.email">{{ inputErrors.email }}</div>
   *   <div v-if="inputErrors.password">{{ inputErrors.password }}</div>
   * </template>
   *
   * <script lang="ts" setup>
   * import { pruviousPost } from '#pruvious/client'
   *
   * const body = ref({ email: '', password: '', remember: false })
   * const inputErrors = ref<Record<string, string>>({})
   *
   * const { success, data, error } = await pruviousPost('auth/login', {
   *   body,
   *   inputErrors,
   * })
   * </script>
   * ```
   */
  inputErrors?: MaybeRef<Record<string, string>>

  /**
   * A reactive reference for a form's disabled state.
   * This is useful for disabling the form while the request is being processed.
   *
   * @example
   * ```vue
   * <template>
   *   <form :disabled="isFormDisabled">
   *     ...
   *   </form>
   * </template>
   *
   * <script lang="ts" setup>
   * import { pruviousPost } from '#pruvious/client'
   *
   * const body = ref({ email: '', password: '', remember: false })
   * const isFormDisabled = ref(false)
   *
   * const { success, data, error } = await pruviousPost('auth/login', {
   *   body,
   *   isDisabledRef: isFormDisabled,
   * })
   * </script>
   * ```
   */
  isDisabledRef?: Ref<boolean>
}

interface Body {
  'auth/login': { email: string; password: string; remember?: boolean }
  'auth/logout': undefined
  'auth/logout/others': undefined
  'auth/renew-token': undefined
  'pruvious/install': { firstName?: string; lastName?: string; email: string; password: string }
}

interface PostResponse {
  'auth/login': { token: string }
  'auth/logout': { success: true }
  'auth/logout/others': { token: string }
  'auth/renew-token': { token: string }
  'pruvious/install': { token: string }
}

interface GetResponse {
  'auth/state': AuthState
  'me': Partial<Collections['Users']['TCastedTypes']>
  'me/structure': { fields: Record<string, GenericSerializableFieldOptions>; fieldsLayout?: FieldsLayout }
  'pruvious': PruviousState
  'pruvious/dashboard': PruviousDashboardState
}

interface PatchResponse {
  me: Partial<Collections['Users']['TCastedTypes']>
}

interface DeleteResponse {}

type Response = PostResponse & GetResponse & PatchResponse & DeleteResponse

export type PruviousPostRoute = keyof PostResponse

export type PruviousPostOptions<TRoute extends PruviousPostRoute> = NitroFetchOptions<string, 'post'> &
  PruviousFetchBaseOptions &
  (Body[TRoute] extends undefined ? {} : { body: MaybeRef<Body[TRoute]> })

export type PruviousPostResponse<TRoute extends PruviousPostRoute> = Response[TRoute]

export type PruviousGetRoute = keyof GetResponse

export type PruviousGetOptions<TRoute extends PruviousGetRoute> = NitroFetchOptions<string, 'get'> &
  PruviousFetchBaseOptions

export type PruviousGetResponse<TRoute extends PruviousGetRoute> = Response[TRoute]

export type PruviousPatchRoute = keyof PatchResponse

export type PruviousPatchOptions<TRoute extends PruviousPatchRoute> = NitroFetchOptions<string, 'patch'> &
  PruviousFetchBaseOptions

export type PruviousPatchResponse<TRoute extends PruviousPatchRoute> = Response[TRoute]

export type PruviousDeleteRoute = keyof DeleteResponse

export type PruviousDeleteOptions<TRoute extends PruviousDeleteRoute> = NitroFetchOptions<string, 'delete'> &
  PruviousFetchBaseOptions

export type PruviousDeleteResponse<TRoute extends PruviousDeleteRoute> = Response[TRoute]

export type PruviousFetchResponse<T> =
  | { success: true; data: T; error: undefined }
  | { success: false; data: undefined; error: PruviousFetchError }

export type PruviousFetchError = (
  | { statusCode: Exclude<keyof typeof httpStatusCodeMessages, 422> }
  | { statusCode: 422; data: Record<string, string> | Record<string, string>[] }
) & { message: string }

/**
 * Makes a POST request to the Pruvious API using Nuxt's `$fetch` utility.
 *
 * Automatically resolves:
 *
 * - `Accept-Language` header based on the current page language.
 * - `Authorization` header based on the current user's token.
 *   - This only applies if `pruvious.auth.tokenStorage` is set to `localStorage` in the Nuxt config.
 *   - If `pruvious.auth.tokenStorage` is set to `cookies`, no `Authorization` header will be sent.
 * - API base path from the `pruvious.api.basePath` option in the Nuxt config.
 *
 * @example
 * ```vue
 * <script lang="ts" setup>
 * import { pruviousPost } from '#pruvious/client'
 *
 * const body = ref({ email: '', password: '', remember: false })
 * const isFormDisabled = ref(false)
 * const inputErrors = ref<Record<string, string>>({})
 *
 * const { success, data, error } = await pruviousPost('auth/login', {
 *   body,
 *   isDisabledRef: isFormDisabled,
 *   inputErrors,
 * })
 *
 * if (success) {
 *   console.log('Login successful:', data.token)
 * } else {
 *   console.error('Login failed:', error)
 * }
 * </script>
 * ```
 */
export function pruviousPost<TRoute extends PruviousPostRoute>(
  route: TRoute,
  options: PruviousPostOptions<TRoute>,
): Promise<PruviousFetchResponse<PruviousPostResponse<TRoute>>> {
  return pruviousFetch(route, 'post', options)
}

/**
 * Makes a GET request to the Pruvious API using Nuxt's `$fetch` utility.
 *
 * Automatically resolves:
 *
 * - `Accept-Language` header based on the current page language.
 * - `Authorization` header based on the current user's token.
 *   - This only applies if `pruvious.auth.tokenStorage` is set to `localStorage` in the Nuxt config.
 *   - If `pruvious.auth.tokenStorage` is set to `cookies`, no `Authorization` header will be sent.
 * - API base path from the `pruvious.api.basePath` option in the Nuxt config.
 *
 * @example
 * ```vue
 * <script lang="ts" setup>
 * import { pruviousGet } from '#pruvious/client'
 *
 * const isFormDisabled = ref(false)
 * const inputErrors = ref<Record<string, string>>({})
 *
 * const { success, data, error } = await pruviousGet('me', {
 *   isDisabledRef: isFormDisabled,
 *   inputErrors,
 * })
 *
 * if (success) {
 *   console.log('User data:', data)
 * } else {
 *   console.error('User not authenticated:', error)
 * }
 * </script>
 * ```
 */
export function pruviousGet<TRoute extends PruviousGetRoute>(
  route: TRoute,
  options?: PruviousGetOptions<TRoute>,
): Promise<PruviousFetchResponse<PruviousGetResponse<TRoute>>> {
  return pruviousFetch(route, 'get', options ?? {})
}

/**
 * Makes a PATCH request to the Pruvious API using Nuxt's `$fetch` utility.
 *
 * Automatically resolves:
 *
 * - `Accept-Language` header based on the current page language.
 * - `Authorization` header based on the current user's token.
 *   - This only applies if `pruvious.auth.tokenStorage` is set to `localStorage` in the Nuxt config.
 *   - If `pruvious.auth.tokenStorage` is set to `cookies`, no `Authorization` header will be sent.
 * - API base path from the `pruvious.api.basePath` option in the Nuxt config.
 *
 * @example
 * ```vue
 * <script lang="ts" setup>
 * import { pruviousPatch } from '#pruvious/client'
 *
 * const body = ref({ email: '', password: '', remember: false })
 * const isFormDisabled = ref(false)
 * const inputErrors = ref<Record<string, string>>({})
 *
 * const { success, data, error } = await pruviousPatch('@todo', {
 *   body,
 *   isDisabledRef: isFormDisabled,
 *   inputErrors,
 * })
 *
 * if (success) {
 *   console.log('@todo')
 * } else {
 *   console.error('Login failed:', error)
 * }
 * </script>
 * ```
 */
export function pruviousPatch<TRoute extends PruviousPatchRoute>(
  route: TRoute,
  options: PruviousPatchOptions<TRoute>,
): Promise<PruviousFetchResponse<PruviousPatchResponse<TRoute>>> {
  return pruviousFetch(route, 'patch', options)
}

/**
 * Makes a DELETE request to the Pruvious API using Nuxt's `$fetch` utility.
 *
 * Automatically resolves:
 *
 * - `Accept-Language` header based on the current page language.
 * - `Authorization` header based on the current user's token.
 *   - This only applies if `pruvious.auth.tokenStorage` is set to `localStorage` in the Nuxt config.
 *   - If `pruvious.auth.tokenStorage` is set to `cookies`, no `Authorization` header will be sent.
 * - API base path from the `pruvious.api.basePath` option in the Nuxt config.
 *
 * @example
 * ```vue
 * <script lang="ts" setup>
 * import { pruviousDelete } from '#pruvious/client'
 *
 * const isFormDisabled = ref(false)
 * const inputErrors = ref<Record<string, string>>({})
 *
 * const { success, data, error } = await pruviousDelete('@todo', {
 *   isDisabledRef: isFormDisabled,
 *   inputErrors,
 * })
 *
 * if (success) {
 *   console.log('@todo')
 * } else {
 *   console.error('Login failed:', error)
 * }
 * </script>
 * ```
 */
export function pruviousDelete<TRoute extends PruviousDeleteRoute>(
  route: TRoute,
  options?: PruviousDeleteOptions<TRoute>,
): Promise<PruviousFetchResponse<PruviousDeleteResponse<TRoute>>> {
  return pruviousFetch(route, 'delete', options ?? {})
}

/**
 * Generates `$fetch` headers for Pruvious API requests.
 *
 * Automatically resolves:
 *
 * - `Accept-Language` header based on the current page language.
 * - `Authorization` header based on the current user's token.
 *   - This only applies if `pruvious.auth.tokenStorage` is set to `localStorage` in the Nuxt config.
 *   - If `pruvious.auth.tokenStorage` is set to `cookies`, no `Authorization` header will be sent.
 *
 * @example
 * ```vue
 * <script lang="ts" setup>
 * import { pruviousFetchHeaders } from '#pruvious/client'
 *
 * await $fetch('my-endpoint', { headers: pruviousFetchHeaders() })
 * </script>
 * ```
 */
export function pruviousFetchHeaders(headers?: HeadersInit): HeadersInit {
  const authorizationHeader: Record<string, string> = {}
  const { tokenStorage } = useRuntimeConfig().public.pruvious

  if (tokenStorage.storage === 'localStorage') {
    const token = localStorage.getItem(tokenStorage.key)

    if (token) {
      authorizationHeader['Authorization'] = `Bearer ${token}`
    }
  }

  return {
    ...headers,
    'Accept-Language': useLanguage().value,
    ...authorizationHeader,
  }
}

async function pruviousFetch(
  route: string,
  method: 'post' | 'get' | 'patch' | 'delete',
  options: NitroFetchOptions<string> & PruviousFetchBaseOptions,
) {
  const { apiBasePath } = useRuntimeConfig().public.pruvious
  const fetchResponse: any = {
    success: false,
    data: undefined,
    error: undefined as any,
  }

  // Disable UI
  if (options.isDisabledRef) {
    options.isDisabledRef.value = true
  }

  await $fetch(apiBasePath + route, {
    ...options,
    body: method === 'post' || method === 'patch' ? unref(options.body) : undefined,
    headers: pruviousFetchHeaders(options.headers),
    ignoreResponseError: true,
    method,
    onResponse: async (payload) => {
      if (isFunction(options.onResponse)) {
        await options.onResponse(payload)
      }

      const data = payload.response._data ?? {}

      if (payload.response.ok) {
        // Set fetch success
        fetchResponse.success = true
        fetchResponse.data = data

        // Clear input errors
        if (isRef(options.inputErrors)) {
          options.inputErrors.value = {}
        } else if (options.inputErrors) {
          clear(options.inputErrors)
        }
      } else {
        // Set fetch error
        fetchResponse.error = {
          statusCode: data.statusCode,
          message: data.message,
          data: data.data,
        }

        // Set input errors
        if (isRef(options.inputErrors)) {
          options.inputErrors.value = data.statusCode === 422 ? data.data : {}
        } else if (options.inputErrors) {
          options.inputErrors = data.statusCode === 422 ? data.data : {}
        }
      }
    },
  } satisfies NitroFetchOptions<string>)

  // Enable UI
  if (options.isDisabledRef) {
    options.isDisabledRef.value = false
  }

  return fetchResponse
}

/**
 * A custom wrapper around `$fetch` that automatically handles:
 *
 * - `Accept-Language` header based on the current page language.
 * - `Authorization` header based on the current user's token.
 *   - This only applies if `pruvious.auth.tokenStorage` is set to `localStorage` in the Nuxt config.
 *   - If `pruvious.auth.tokenStorage` is set to `cookies`, no `Authorization` header will be sent.
 *
 * Use this utility for custom API requests requiring authentication and language headers.
 * For standard Pruvious API routes, prefer using:
 *
 * - `pruviousGet()`
 * - `pruviousPost()`
 * - `pruviousPatch()`
 * - `pruviousDelete()`
 */
export async function pfetch<
  TRoute extends Exclude<Parameters<$Fetch>['0'], StandardRoutes>,
  TOptions extends NitroFetchOptions<TRoute> & PruviousFetchBaseOptions,
>(route: TRoute, options?: TOptions) {
  // Disable UI
  if (options?.isDisabledRef) {
    options.isDisabledRef.value = true
  }

  return $fetch(route, {
    ...options,
    headers: pruviousFetchHeaders(options?.headers),
    onResponse: async (payload) => {
      if (isFunction(options?.onResponse)) {
        await options.onResponse(payload)
      }

      const data = payload.response._data ?? {}

      if (payload.response.ok) {
        // Clear input errors
        if (isRef(options?.inputErrors)) {
          options.inputErrors.value = {}
        } else if (options?.inputErrors) {
          clear(options.inputErrors)
        }
      } else {
        // Set input errors
        if (isRef(options?.inputErrors)) {
          options.inputErrors.value = data.statusCode === 422 ? data.data : {}
        } else if (options?.inputErrors) {
          options.inputErrors = data.statusCode === 422 ? data.data : {}
        }
      }
    },
  } as TOptions).finally(() => {
    // Enable UI
    if (options?.isDisabledRef) {
      options.isDisabledRef.value = false
    }
  })
}
