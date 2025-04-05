import type {
  __,
  getCollectionBySlug,
  getSingletonBySlug,
  hasPermission,
  isValidLanguageCode,
  usePruvious,
  usePruviousDashboard,
} from '#pruvious/client'
import type { puiQueueToast } from '@pruvious/ui/pui/toast'
import { isString, type slugify } from '@pruvious/utils'
import type { RouteLocationNormalizedGeneric } from 'vue-router'

export type DashboardMiddleware =
  | 'default'
  | 'auth-guard'
  | 'guest-guard'
  | ((context: DashboardMiddlewareContext) => any)

export interface DashboardMiddlewareContext {
  /**
   * The route being navigated to.
   */
  to: RouteLocationNormalizedGeneric

  /**
   * Retrieves a translated string for a given `domain` and `handle`, with optional `input` parameters.
   * The language is automatically resolved from the current page language.
   *
   * @example
   * ```vue
   * <template>
   *   <div>{{ __('my-domain', 'Hello!') }}</div>
   * </template>
   *
   * <script lang="ts" setup>
   * import { __, preloadTranslatableStrings } from '#pruvious/client'
   *
   * // You can also preload custom translatable string domains in your Nuxt config:
   * // `pruvious.i18n.preloadTranslatableStrings`
   * await preloadTranslatableStrings('my-domain')
   * </script>
   * ```
   */
  __: typeof __

  /**
   * Retrieves a collection object containing its name and serializable definition using its URL path identifier (`slug`).
   * The collection must be available in the current `usePruviousDashboard()` context.
   *
   * The collection `slug` is a URL-safe version of the collection name in kebab-case format.
   * For example, a collection named `MyCollection` will have a slug of `my-collection`.
   *
   * @returns an object containing the collection name and its serializable definition or `null` if the collection does not exist.
   */
  getCollectionBySlug: typeof getCollectionBySlug

  /**
   * Retrieves a singleton object containing its name and serializable definition using its URL path identifier (`slug`).
   * The singleton must be available in the current `usePruviousDashboard()` context.
   *
   * The singleton `slug` is a URL-safe version of the singleton name in kebab-case format.
   * For example, a singleton named `ThemeOptions` will have a slug of `theme-options`.
   *
   * @returns an object containing the singleton name and its serializable definition or `null` if the singleton does not exist.
   */
  getSingletonBySlug: typeof getSingletonBySlug

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
  hasPermission: typeof hasPermission

  /**
   * Verifies if a language `code` exists in the configured languages list.
   * The function checks against the language codes defined in the `pruvious.i18n.languages` array within `nuxt.config.ts`.
   */
  isValidLanguageCode: typeof isValidLanguageCode

  /**
   * Queues a toast notification with Markdown formatting.
   * Uses the [`vue-sonner`](https://github.com/xiaoluoboding/vue-sonner) library under the hood.
   *
   * Call this function to display toast notifications when the `PUIToaster` component is not loaded.
   * The notification will be added to a queue and displayed in order.
   */
  puiQueueToast: typeof puiQueueToast

  /**
   * Converts a `string` to a URL-friendly slug.
   *
   * @example
   * ```ts
   * slugify('Hello, World!') // hello-world
   * ```
   */
  slugify: typeof slugify

  /**
   * Composable that provides access to the current state of the Pruvious CMS.
   */
  usePruvious: typeof usePruvious

  /**
   * Composable that manages the Pruvious dashboard state and data.
   * Contains dashboard data based on user authentication status and role permissions.
   */
  usePruviousDashboard: typeof usePruviousDashboard
}

/**
 * Loads a dashboard middleware function.
 * You can provide either a string to use a pre-defined middleware function, or pass your own custom middleware function.
 *
 * Dashboard middleware functions load their dependencies dynamically to minimize bundle size impact.
 *
 * @example
 * ```ts
 * import { dashboardBasePath, dashboardMiddleware } from '#pruvious/client'
 *
 * definePageMeta({
 *   path: dashboardBasePath + 'custom-dashboard-page',
 *   middleware: [
 *     (to) => dashboardMiddleware(to, 'default'),
 *     (to) => dashboardMiddleware(to, 'auth-guard'),
 *     (to) => dashboardMiddleware(to, (context) => { ... }),
 *   ],
 * })
 * ```
 */
export async function dashboardMiddleware(
  to: RouteLocationNormalizedGeneric,
  middleware: DashboardMiddleware,
): Promise<any> {
  if (isString(middleware)) {
    if (middleware === 'default') {
      const { dashboardDefaultMiddleware } = await import('#pruvious/client')
      return dashboardDefaultMiddleware()
    } else if (middleware === 'auth-guard') {
      const { dashboardAuthGuard } = await import('#pruvious/client')
      return dashboardAuthGuard(to)
    } else if (middleware === 'guest-guard') {
      const { dashboardGuestGuard } = await import('#pruvious/client')
      return dashboardGuestGuard()
    } else {
      throw new Error(`Invalid dashboard middleware option: ${middleware}`)
    }
  } else {
    const {
      __,
      getCollectionBySlug,
      getSingletonBySlug,
      isValidLanguageCode,
      hasPermission,
      usePruvious,
      usePruviousDashboard,
    } = await import('#pruvious/client')
    const { puiQueueToast } = await import('@pruvious/ui/pui/toast')
    const { slugify } = await import('@pruvious/utils')

    return middleware({
      to,
      __,
      getCollectionBySlug,
      getSingletonBySlug,
      isValidLanguageCode,
      hasPermission,
      puiQueueToast,
      slugify,
      usePruvious,
      usePruviousDashboard,
    })
  }
}
