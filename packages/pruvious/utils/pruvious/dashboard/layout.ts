import { customComponents } from '#pruvious/client/custom-components'
import type { Collections, SerializableCollection, SerializableSingleton, Singletons } from '#pruvious/server'
import { isDefined } from '@pruvious/utils'
import type { Component } from 'vue'

/**
 * Composable that preserves the following layout states between navigation:
 *
 * - `sidebarExpanded` - Stores the sidebar visibility state on smaller screens.
 * - `sidebarScrollY` - Preserves the vertical scroll position of the `#sidebar` slot in the dashboard layout.
 * - `sidebarContentHeight` - Preserves the height of the content rendered in the `#sidebar` slot.
 */
export const usePruviousDashboardLayout = () =>
  useState<{
    sidebarExpanded: boolean
    sidebarScrollY: number
    sidebarContentHeight: number
  }>('pruvious-dashboard-layout', () => ({
    sidebarExpanded: false,
    sidebarScrollY: 0,
    sidebarContentHeight: 0,
  }))

/**
 * Returns the duration of the overlay transition in milliseconds.
 * The duration is read from the `--pui-overlay-transition-duration` CSS variable.
 */
export function getOverlayTransitionDuration(): number {
  const duration = getComputedStyle(document.body).getPropertyValue('--pui-overlay-transition-duration')
  return duration.endsWith('ms') ? parseInt(duration) : duration.endsWith('s') ? parseFloat(duration) * 1000 : 300
}

/**
 * Resolves the layout components for a specific `page` of a `collection`.
 */
export function resolveCollectionLayout(
  page: 'index' | 'create' | 'update',
  collection: {
    name: keyof Collections
    definition: SerializableCollection
  },
): Component | string {
  if (page === 'index') {
    if (collection.definition.ui.indexPage.dashboardLayout === 'standard') {
      return defineAsyncComponent(() => import('../../../components/Pruvious/Dashboard/Page.vue'))
    } else {
      const component = collection.definition.ui.indexPage.dashboardLayout
      if (isDefined(customComponents[component])) {
        return customComponents[component]()
      } else {
        throw new Error(
          `Unable to resolve custom dashboard layout component \`${component}\` for collection \`${collection.name}\`.`,
        )
      }
    }
  } else {
    if (collection.definition.ui[`${page}Page`].dashboardLayout === 'auto') {
      if (collection.definition.routing.enabled) {
        return defineAsyncComponent(() => import('../../../components/Pruvious/Dashboard/LivePreview.vue'))
      } else {
        return defineAsyncComponent(() => import('../../../components/Pruvious/Dashboard/Page.vue'))
      }
    } else if (collection.definition.ui[`${page}Page`].dashboardLayout === 'standard') {
      return defineAsyncComponent(() => import('../../../components/Pruvious/Dashboard/Page.vue'))
    } else if (collection.definition.ui[`${page}Page`].dashboardLayout === 'live-preview') {
      return defineAsyncComponent(() => import('../../../components/Pruvious/Dashboard/LivePreview.vue'))
    } else {
      const component = collection.definition.ui[`${page}Page`].dashboardLayout
      if (isDefined(customComponents[component])) {
        return customComponents[component]()
      } else {
        throw new Error(
          `Unable to resolve custom dashboard layout component \`${component}\` for collection \`${collection.name}\`.`,
        )
      }
    }
  }
}

/**
 * Resolves the layout component for a `singleton`.
 */
export function resolveSingletonLayout(singleton: {
  name: keyof Singletons
  definition: SerializableSingleton
}): Component | string {
  if (singleton.definition.ui.dashboardLayout === 'auto') {
    if (singleton.definition.routing.enabled) {
      return defineAsyncComponent(() => import('../../../components/Pruvious/Dashboard/LivePreview.vue'))
    } else {
      return defineAsyncComponent(() => import('../../../components/Pruvious/Dashboard/Page.vue'))
    }
  } else if (singleton.definition.ui.dashboardLayout === 'standard') {
    return defineAsyncComponent(() => import('../../../components/Pruvious/Dashboard/Page.vue'))
  } else if (singleton.definition.ui.dashboardLayout === 'live-preview') {
    return defineAsyncComponent(() => import('../../../components/Pruvious/Dashboard/LivePreview.vue'))
  } else {
    const component = singleton.definition.ui.dashboardLayout
    if (isDefined(customComponents[component])) {
      return customComponents[component]()
    } else {
      throw new Error(
        `Unable to resolve custom dashboard layout component \`${component}\` for singleton \`${singleton.name}\`.`,
      )
    }
  }
}
