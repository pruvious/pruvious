import type { TranslatableStringCallbackContext } from '#pruvious/server'
import type { icons } from '@iconify-json/tabler/icons.json'

export interface DefineDashboardPageOptions {
  /**
   * The URL path segment of the dashboard page.
   * This is the part of the URL that comes after `/dashboard/`.
   *
   * For example, if the URL is `http://localhost:3000/dashboard/custom-page`, the `path` is `custom-page`.
   *
   * If not provided, the kebab-cased file name of the Vue component where this function is called is used as the path.
   *
   * @default undefined
   */
  path?: string

  /**
   * A custom text label shown in the dashboard menu item.
   *
   * When not provided, the Title cased file name of the Vue component where this function is called is used as the label.
   * The resulting label is wrapped in the translation function `__('pruvious-dashboard', label)`.
   *
   * You can either provide a string or a function that returns a string.
   * The function receives an object with `_` and `__` properties to access the translation functions.
   *
   * Important: When using a function, only use simple anonymous functions without context binding.
   *
   * @default undefined
   *
   * @example
   * ```ts
   * // String (non-translatable)
   * label: 'CRM integration'
   *
   * // Function (translatable)
   * label: ({ __ }) => __('pruvious-dashboard', 'CRM integration')
   *
   * // File name transformation (default)
   * // Example: the Vue component `CustomPage.vue` is transformed into `__('pruvious-dashboard', 'Custom page')`
   * label: undefined
   * ```
   */
  label?: string | ((context: TranslatableStringCallbackContext) => string) | undefined

  /**
   * The icon to show in the dashboard menu item.
   * Must be a valid Tabler icon name.
   *
   * @see https://tabler-icons.io for available icons
   *
   * @default 'tools'
   */
  icon?: keyof typeof icons

  /**
   * Defines the menu category where the item will be displayed in the dashboard sidebar.
   *
   * @default 'general'
   */
  group?: 'general' | 'collections' | 'management' | 'utilities'

  /**
   * Controls the item's position in the dashboard navigation menu.
   * Items with lower numbers appear at the top.
   * When items have the same order number, they are sorted by their label alphabetically.
   *
   * @default 10
   */
  order?: number
}

/**
 * Registers a custom page in the Pruvious dashboard menu.
 *
 * Use this in `<script setup>` of a Vue component located in the `app/pages/` directory.
 *
 * Note: This function is a compiler macro and is compiled away when `<script setup>` is processed.
 *
 * @see https://pruvious.com/docs/custom-dashboard-pages
 *
 * @example
 * ```vue
 * <!-- app/pages/dashboard/crm-integration.vue -->
 * <template>
 *   <PruviousDashboardPage noMainPadding>
 *     <div>...</div>
 *   </PruviousDashboardPage>
 * </template>
 *
 * <script lang="ts" setup>
 * import { __, dashboardMiddleware, defineDashboardPage } from '#pruvious/client'
 *
 * defineDashboardPage({
 *   label: ({ __ }) => __('pruvious-dashboard', 'CRM integration'),
 *   icon: 'bolt',
 *   group: 'general',
 *   order: 3,
 * })
 *
 * definePageMeta({
 *   middleware: [
 *     (to) => dashboardMiddleware(to, 'default'),
 *     (to) => dashboardMiddleware(to, 'auth-guard'),
 *   ],
 * })
 *
 * useHead({
 *   title: __('pruvious-dashboard', 'CRM integration'),
 * })
 * </script>
 * ```
 */
export function defineDashboardPage(options: DefineDashboardPageOptions) {
  return {
    path: options.path,
    label: options.label,
    icon: options.icon ?? 'tools',
    group: options.group ?? 'general',
    order: options.order ?? 10,
    _path: (options as any)._path ?? '',
  }
}
