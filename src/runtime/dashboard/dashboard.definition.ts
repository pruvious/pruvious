import type { PruviousIcon, UserCapability } from '#pruvious'
import { slugify } from '../utils/slugify'
import { capitalize } from '../utils/string'

export interface DashboardPageDefinition {
  /**
   * A Vue route path that will be used to render this page in the dashboard.
   * Example: `export` will render the page at `/dashboard/export`.
   *
   * You can also use dynamic route parameters, e.g., `export/:id`.
   */
  path: string

  /**
   * The label used for this page in the dashboard menu.
   *
   * When not provided, the label will be generated from the path (e.g., `export` will become `Export`).
   */
  label?: string

  /**
   * The relative path of the Vue component that renders this page in the dashboard.
   * The path should be relative to your Nuxt app directory (e.g., `./components/dashboard/export.vue`).
   */
  vueComponent: string

  /**
   * The icon displayed in the dashboard menu for this page.
   *
   * @default 'Tool'
   */
  icon?: PruviousIcon

  /**
   * The priority of this page in the dashboard menu.
   *
   * - 0 - Pages
   * - 1 - Presets
   * - 2 - Media
   * - 3 - Custom multi-entry collections
   * - 4 - Users
   * - 5 - Roles
   * - 6 - Custom single-entry collections
   *
   * @default 7
   */
  priority?: number

  /**
   * The user capabilities required to access this page.
   *
   * Note: Admin users can access all pages regardless of their capabilities.
   *
   * @default []
   */
  capabilities?: UserCapability[]
}

export type ResolvedDashboardPageDefinition = Required<DashboardPageDefinition>

/**
 * Define a custom page in the dashboard.
 *
 * @example
 * ```typescript
 * defineDashboardPage({
 *   path: 'export',
 *   vueComponent: './components/dashboard/export.vue',
 * })
 * ```
 */
export function defineDashboardPage(options: DashboardPageDefinition): ResolvedDashboardPageDefinition {
  return {
    path: options.path,
    label: options.label ?? capitalize(slugify(options.path), false),
    vueComponent: options.vueComponent,
    icon: options.icon ?? 'Tool',
    priority: options.priority ?? 7,
    capabilities: options.capabilities ?? [],
  }
}
