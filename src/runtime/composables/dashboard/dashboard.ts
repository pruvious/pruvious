import { navigateTo, useRuntimeConfig, useState, type Ref } from '#imports'
import type { BlockName, CollectionName, Field, ResolvedCollectionDefinition, Slot } from '#pruvious'
import type { LocationQueryValue } from '#vue-router'
import type { NuxtApp } from 'nuxt/app'
import type { NavigateToOptions } from 'nuxt/dist/app/composables/router'
import type { RouteLocationNormalized } from 'vue-router'
import type { CollectionFieldAdditional } from '../../fields/field.definition'
import type { ModuleOptions } from '../../module-types'
import tooltipDirective from '../../plugins/pruvious-tooltip'
import { isArray, toArray } from '../../utils/array'
import { pruviousFetch } from '../../utils/fetch'
import { joinRouteParts } from '../../utils/string'
import { useAuth } from '../auth'
import { getToken, setToken } from '../token'

export type DashboardCollectionFields = Record<
  string,
  Required<Pick<Field, 'options' | 'type'>> & {
    additional: Pick<CollectionFieldAdditional, 'conditionalLogic'> &
      Required<Pick<CollectionFieldAdditional, 'emptyLabel' | 'hidden' | 'immutable' | 'protected'>>
    default: any
  }
>

export type SimpleCollection = Pick<
  ResolvedCollectionDefinition,
  'apiRoutes' | 'contentBuilder' | 'label' | 'mode' | 'name' | 'publicPages' | 'translatable'
> & {
  canDuplicate: boolean
  dashboard: Omit<ResolvedCollectionDefinition['dashboard'], 'icon'> & {
    icon: string
  }
  fields: DashboardCollectionFields
  search: boolean
}

export interface PruviousDashboard {
  /**
   * Resolved block metadata.
   */
  blocks: Record<string, BlockMeta>

  /**
   * The name of the currently active collection in the dashboard.
   */
  collection: CollectionName | null

  /**
   * The collections that are visible to the current user.
   */
  collections: Record<string, SimpleCollection>

  /**
   * Indicates whether the dashboard state has been initialized.
   */
  initialized: boolean

  /**
   * Indicates whether the CMS is installed by checking for the presence of an admin user.
   */
  installed: boolean

  /**
   * Indicates whether the cache is active.
   */
  isCacheActive: boolean

  /**
   * Links displayed beneath forms on authentication screens within the dashboard.
   */
  legalLinks: Required<ModuleOptions['dashboard']>['legalLinks']

  /**
   * Indicates whether the dashboard metadata has been retrieved from the server.
   */
  loaded: boolean

  /**
   * The dashboard menu items.
   */
  menu: {
    collection?: CollectionName
    icon: string
    label: string
    path: string
    priority: number
  }[]

  /**
   * A normalized array of route parameters after the `dashboard.prefix`.
   *
   * Example: For the URL http://localhost:3000/dashboard/collections/users/1, the `routeParams` will be `['users', '1']`
   */
  routeParams: string[]

  /**
   * Indicates whether the dashboard metadata should be refreshed.
   */
  refresh: boolean
}

export interface BlockMeta {
  name: BlockName
  label: string
  icon: string
  fields: Record<string, Field>
  description: string
  slots: Record<string, Slot>
}

/**
 * The current Pruvious dashboard state.
 */
export const usePruviousDashboard: () => Ref<PruviousDashboard> = () =>
  useState('pruvious-dashboard', () => ({
    blocks: {},
    collection: null,
    collections: {},
    initialized: false,
    installed: false,
    isCacheActive: false,
    legalLinks: [],
    loaded: false,
    menu: [],
    routeParams: [],
    refresh: false,
  }))

/**
 * Update the Pruvious dashboard state on route and authentication changes.
 *
 * Call this function within the `<script setup>` of the dashboard page.
 */
export async function updatePruviousDashboard(route: RouteLocationNormalized) {
  const dashboard = usePruviousDashboard()
  const runtimeConfig = useRuntimeConfig()

  // Update current route parameters
  dashboard.value.routeParams = route.path
    .replace(runtimeConfig.public.pruvious.dashboardPrefix, '')
    .split('/')
    .filter(Boolean)

  // Initialize
  if (!dashboard.value.initialized) {
    const auth = useAuth()
    const installedResponse = await pruviousFetch('installed.get')

    dashboard.value.installed = installedResponse.success ? installedResponse.data : false

    if (auth.value.isLoggedIn && dashboard.value.installed) {
      const renewTokenResponse = await pruviousFetch('renew-token.post')

      if (renewTokenResponse.success) {
        setToken(renewTokenResponse.data)
      } else {
        auth.value.userId = null
        auth.value.isLoggedIn = false
      }
    }

    if (process.client) {
      setInterval(async () => {
        if (auth.value.isLoggedIn) {
          const renewTokenResponse = await pruviousFetch('renew-token.post')

          if (renewTokenResponse.success) {
            setToken(renewTokenResponse.data)
          }
        }
      }, runtimeConfig.public.pruvious.jwtRenewInterval * 60000)

      window.addEventListener('focus', () => {
        const token = getToken()

        if (auth.value.isLoggedIn && token && token.exp < Date.now() / 1000) {
          // @todo show login popup instead (more user friendly and prevents content editors from losing data)
          // ^ fire event to show login popup
        }
      })
    }

    dashboard.value.initialized = true
  }
}

/**
 * Dynamically register Nuxt plugins.
 */
export function registerDynamicPruviousDashboardPlugins(nuxtApp: NuxtApp) {
  if (!nuxtApp.vueApp._context.directives['pruvious-tooltip']) {
    tooltipDirective(nuxtApp)
  }
}

/**
 * Navigate to a dashboard `path` (excluding the `dashboardPrefix`).
 *
 * @example
 * ```typescript
 * navigateToPruviousDashboardPath('/collections', 'users', 1)
 * // Navigates to: '/dashboard/collections/users/1'
 * ```
 */
export function navigateToPruviousDashboardPath(
  path: string | number | (string | number)[],
  options?: (NavigateToOptions & { to?: LocationQueryValue | LocationQueryValue[] }) | undefined,
  route?: RouteLocationNormalized,
) {
  const runtimeConfig = useRuntimeConfig()
  const dest = joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, ...toArray(path).map(String))
  const to = options?.to?.toString().split('?').shift()
  const toPath = to ? joinRouteParts(to) : null
  const pathString = isArray(path) ? path.join('/') : String(path)
  const query = {
    ...(pathString.includes('?') ? Object.fromEntries(new URLSearchParams(pathString.split('?')[1])) : {}),
    ...(route?.query ?? {}),
  }

  return navigateTo(
    {
      path: dest,
      query: {
        ...query,
        to:
          toPath && toPath !== dest && toPath !== joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix)
            ? toPath
            : undefined,
      },
    },
    options,
  )
}
