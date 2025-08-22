import type { StandardRoutes } from '#pruvious/server'
import { puiQueueToast } from '@pruvious/ui/pui/toast'
import { isFunction } from '@pruvious/utils'
import type { $Fetch, NitroFetchOptions } from 'nitropack/types'
import { usePruviousLoginPopup } from '../../../app/utils/pruvious/dashboard/login'
import {
  $pfetch,
  pruviousDelete,
  pruviousFetchHeaders,
  pruviousGet,
  pruviousPatch,
  pruviousPost,
  type PruviousDeleteOptions,
  type PruviousDeleteResponse,
  type PruviousDeleteRoute,
  type PruviousFetchBaseOptions,
  type PruviousFetchResponse,
  type PruviousGetOptions,
  type PruviousGetResponse,
  type PruviousGetRoute,
  type PruviousPatchOptions,
  type PruviousPatchResponse,
  type PruviousPatchRoute,
  type PruviousPostOptions,
  type PruviousPostResponse,
  type PruviousPostRoute,
} from './utils.client'

/**
 * Makes a POST request to the Pruvious API using Nuxt's `$fetch` utility.
 * This utility is intended to be used in the Pruvious dashboard.
 *
 * Automatically resolves:
 *
 * - `Accept-Language` header based on the `dashboardLanguage` of the current user.
 * - `Authorization` header based on the current user's token.
 *   - This only applies if `pruvious.auth.tokenStorage` is set to `localStorage` in the Nuxt config.
 *   - If `pruvious.auth.tokenStorage` is set to `cookies`, no `Authorization` header will be sent.
 * - Common error responses by displaying a toast message.
 * - API base path from the `pruvious.api.basePath` option in the Nuxt config.
 *
 * @example
 * ```vue
 * <script lang="ts" setup>
 * import { pruviousDashboardPost } from '#pruvious/client'
 *
 * const body = ref({ email: '', password: '', remember: false })
 * const isFormDisabled = ref(false)
 * const inputErrors = ref<Record<string, string>>({})
 *
 * const { success, data } = await pruviousDashboardPost('auth/login', {
 *   body,
 *   isDisabledRef: isFormDisabled,
 *   inputErrors,
 * })
 *
 * if (success) {
 *   console.log('Login successful:', data.token)
 * } else {
 *   // No need to handle errors here, the utility will display a toast message
 * }
 * </script>
 */
export function pruviousDashboardPost<TRoute extends PruviousPostRoute>(
  route: TRoute,
  options: PruviousPostOptions<TRoute>,
): Promise<PruviousFetchResponse<PruviousPostResponse<TRoute>>> {
  return _pruviousDashboardFetch(route, 'post', options)
}

/**
 * Makes a GET request to the Pruvious API using Nuxt's `$fetch` utility.
 * This utility is intended to be used in the Pruvious dashboard.
 *
 * Automatically resolves:
 *
 * - `Accept-Language` header based on the `dashboardLanguage` of the current user.
 * - `Authorization` header based on the current user's token.
 *   - This only applies if `pruvious.auth.tokenStorage` is set to `localStorage` in the Nuxt config.
 *   - If `pruvious.auth.tokenStorage` is set to `cookies`, no `Authorization` header will be sent.
 * - Common error responses by displaying a toast message.
 * - API base path from the `pruvious.api.basePath` option in the Nuxt config.
 *
 * @example
 * ```vue
 * <script lang="ts" setup>
 * import { pruviousDashboardGet } from '#pruvious/client'
 *
 * const isFormDisabled = ref(false)
 * const inputErrors = ref<Record<string, string>>({})
 *
 * const { success, data } = await pruviousDashboardGet('@todo', {
 *   isDisabledRef: isFormDisabled,
 *   inputErrors,
 * })
 *
 * if (success) {
 *   console.log('@todo')
 * } else {
 *   // No need to handle errors here, the utility will display a toast message
 * }
 * </script>
 * ```
 */
export function pruviousDashboardGet<TRoute extends PruviousGetRoute>(
  route: TRoute,
  options?: PruviousGetOptions<TRoute>,
): Promise<PruviousFetchResponse<PruviousGetResponse<TRoute>>> {
  return _pruviousDashboardFetch(route, 'get', options ?? {})
}

/**
 * Makes a PATCH request to the Pruvious API using Nuxt's `$fetch` utility.
 * This utility is intended to be used in the Pruvious dashboard.
 *
 * Automatically resolves:
 *
 * - `Accept-Language` header based on the `dashboardLanguage` of the current user.
 * - `Authorization` header based on the current user's token.
 *   - This only applies if `pruvious.auth.tokenStorage` is set to `localStorage` in the Nuxt config.
 *   - If `pruvious.auth.tokenStorage` is set to `cookies`, no `Authorization` header will be sent.
 * - Common error responses by displaying a toast message.
 * - API base path from the `pruvious.api.basePath` option in the Nuxt config.
 *
 * @example
 * ```vue
 * <script lang="ts" setup>
 * import { pruviousDashboardPatch } from '#pruvious/client'
 *
 * const body = ref('@todo')
 * const isFormDisabled = ref(false)
 * const inputErrors = ref<Record<string, string>>({})
 *
 * const { success, data } = await pruviousDashboardPatch('@todo', {
 *   body,
 *   isDisabledRef: isFormDisabled,
 *   inputErrors,
 * })
 *
 * if (success) {
 *   console.log('@todo')
 * } else {
 *   // No need to handle errors here, the utility will display a toast message
 * }
 * </script>
 * ```
 */
export function pruviousDashboardPatch<TRoute extends PruviousPatchRoute>(
  route: TRoute,
  options: PruviousPatchOptions<TRoute>,
): Promise<PruviousFetchResponse<PruviousPatchResponse<TRoute>>> {
  return _pruviousDashboardFetch(route, 'patch', options)
}

/**
 * Makes a DELETE request to the Pruvious API using Nuxt's `$fetch` utility.
 * This utility is intended to be used in the Pruvious dashboard.
 *
 * Automatically resolves:
 *
 * - `Accept-Language` header based on the `dashboardLanguage` of the current user.
 * - `Authorization` header based on the current user's token.
 *   - This only applies if `pruvious.auth.tokenStorage` is set to `localStorage` in the Nuxt config.
 *   - If `pruvious.auth.tokenStorage` is set to `cookies`, no `Authorization` header will be sent.
 * - Common error responses by displaying a toast message.
 * - API base path from the `pruvious.api.basePath` option in the Nuxt config.
 *
 * @example
 * ```vue
 * <script lang="ts" setup>
 * import { pruviousDashboardDelete } from '#pruvious/client'
 *
 * const isFormDisabled = ref(false)
 * const inputErrors = ref<Record<string, string>>({})
 *
 * const { success, data } = await pruviousDashboardDelete('@todo', {
 *   isDisabledRef: isFormDisabled,
 *   inputErrors,
 * })
 *
 * if (success) {
 *   console.log('@todo')
 * } else {
 *   // No need to handle errors here, the utility will display a toast message
 * }
 * </script>
 * ```
 */
export function pruviousDashboardDelete<TRoute extends PruviousDeleteRoute>(
  route: TRoute,
  options?: PruviousDeleteOptions<TRoute>,
): Promise<PruviousFetchResponse<PruviousDeleteResponse<TRoute>>> {
  return _pruviousDashboardFetch(route, 'delete', options ?? {})
}

function _pruviousDashboardFetch(
  route: string,
  method: 'post' | 'get' | 'patch' | 'delete',
  options: NitroFetchOptions<string> & PruviousFetchBaseOptions,
) {
  const fn: any = {
    post: pruviousPost,
    get: pruviousGet,
    patch: pruviousPatch,
    delete: pruviousDelete,
  }

  return fn[method](route, {
    ...options,
    headers: pruviousFetchHeaders(options.headers),
    onResponse: async (payload) => {
      if (isFunction(options.onResponse)) {
        await options.onResponse(payload)
      }

      const data = payload.response._data ?? {}

      if (!payload.response.ok) {
        if (payload.response.status === 401) {
          if (route === 'auth/login') {
            puiQueueToast(data.message, { type: 'error' })
          } else if (route !== 'auth/logout') {
            usePruviousLoginPopup().value = true
          }
        } else if (payload.response.status !== 422) {
          puiQueueToast(data.message, { type: 'error' })
        }
      }
    },
  } satisfies NitroFetchOptions<string>)
}

/**
 * A custom wrapper around `$fetch` that automatically handles:
 *
 * - `Accept-Language` header based on the current page language.
 * - `Authorization` header based on the current user's token.
 *   - This only applies if `pruvious.auth.tokenStorage` is set to `localStorage` in the Nuxt config.
 *   - If `pruvious.auth.tokenStorage` is set to `cookies`, no `Authorization` header will be sent.
 * - Common error responses by displaying a toast message.
 *
 * Use this utility for making custom authenticated API requests from the dashboard.
 * For standard Pruvious API routes, prefer using:
 *
 * - `pruviousDashboardGet()`
 * - `pruviousDashboardPost()`
 * - `pruviousDashboardPatch()`
 * - `pruviousDashboardDelete()`
 */
export async function $pfetchDashboard<
  TRoute extends Exclude<Parameters<$Fetch>['0'], StandardRoutes>,
  TOptions extends NitroFetchOptions<TRoute> & PruviousFetchBaseOptions,
>(route: TRoute, options?: TOptions) {
  return $pfetch(route, {
    ...options,
    headers: pruviousFetchHeaders(options?.headers),
    onResponse: async (payload) => {
      if (isFunction(options?.onResponse)) {
        await options.onResponse(payload)
      }

      const data = payload.response._data ?? {}

      if (!payload.response.ok) {
        if (payload.response.status === 401) {
          if (route === 'auth/login') {
            puiQueueToast(data.message, { type: 'error' })
          } else if (route !== 'auth/logout') {
            usePruviousLoginPopup().value = true
          }
        } else if (payload.response.status !== 422) {
          puiQueueToast(data.message, { type: 'error' })
        }
      }
    },
  } as TOptions)
}

/**
 * @alias $pfetchDashboard
 */
export const pruviousDashboardFetch = $pfetchDashboard
