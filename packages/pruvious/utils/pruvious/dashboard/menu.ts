import { dashboardBasePath } from '#pruvious/client/base'
import { __ } from '#pruvious/client/i18n'
import type { SerializableCollection, SerializableSingleton } from '#pruvious/server'
import { decodeQueryString, selectQueryBuilderParamsToQueryString } from '@pruvious/orm/query-string'
import type { PUIVerticalMenuItemModel } from '@pruvious/ui/components/PUIVerticalMenuItem.vue'
import { isDefined, isEmpty, isString, slugify, titleCase, withTrailingSlash } from '@pruvious/utils'
import type {
  RouteLocationAsPathGeneric,
  RouteLocationAsRelativeGeneric,
  RouteLocationNormalizedLoadedGeneric,
} from 'vue-router'
import { getUser } from '../../../modules/pruvious/auth/utils.client'
import type { CollectionUIOptions } from '../../../modules/pruvious/collections/define'
import type { SingletonUIOptions } from '../../../modules/pruvious/singletons/define'
import { maybeTranslate } from '../../../modules/pruvious/translations/utils.client'

export type DashboardMenuItem = Pick<PUIVerticalMenuItemModel, 'action' | 'label' | 'icon' | 'submenu'> & {
  /**
   * Defines the target route location for navigation when the item is clicked.
   *
   * Either provide a `to` or an `action` property, but not both.
   *
   * When providing a string, exclude the `dashboardBasePath` prefix and the leading slash.
   * For example, use `custom-dashboard-page` instead of `/dashboard/custom-dashboard-page`.
   */
  to?: string | RouteLocationAsRelativeGeneric | RouteLocationAsPathGeneric

  /**
   * Whether the item is active.
   * This is automatically resolved when providing a `to` property.
   *
   * @default false
   */
  active?: boolean
}

/**
 * Composable containing the expanded states of the dashboard menu.
 */
export const usePruviousDashboardMenuExpanded = () =>
  useState<Record<string, Record<string, boolean>>>('pruvious-dashboard-menu-expanded', () => ({}))

/**
 * Prepares the dashboard menu items.
 *
 * @example
 * ```ts
 * prepareDashboardMenu([{
 *   label: 'Custom dashboard page',
 *   to: 'custom-dashboard-page',
 *   icon: 'automation',
 * }])
 *
 * // Returns:
 * // [{
 * //   label: 'Custom dashboard page',
 * //   to: '/dashboard/custom-dashboard-page',
 * //   icon: h(Icon, { name: 'tabler:automation' }),
 * //   active: withoutTrailingSlash(route.path) === dashboardBasePath + '/custom-dashboard-page',
 * // }]
 * ```
 */
export function prepareDashboardMenu(
  items: Partial<DashboardMenuItem>[],
  route: RouteLocationNormalizedLoadedGeneric,
): PUIVerticalMenuItemModel[] {
  return items.map((item) => ({
    label: item.label,
    to: isString(item.to) && !item.to.startsWith('/') ? dashboardBasePath + item.to : item.to,
    action: item.action,
    icon: item.icon,
    active:
      item.active ??
      (isString(item.to)
        ? withTrailingSlash(route.path).startsWith(withTrailingSlash(dashboardBasePath + item.to.split('?')[0]))
        : undefined),
    submenu: item.submenu ? prepareDashboardMenu(item.submenu, route) : undefined,
    expanded: true,
  })) as any
}

/**
 * Converts serializable `collections` to menu items.
 */
export function collectionsToMenuItems(
  collections: Record<string, SerializableCollection> | undefined,
): (DashboardMenuItem & Pick<CollectionUIOptions['menu'], 'group' | 'order'>)[] {
  return Object.entries(collections ?? {})
    .filter(([_, definition]) => !definition.ui.hidden && !definition.ui.menu.hidden)
    .map(([name, definition]) => {
      const _bookmark = getUser()?.bookmarks.find(({ collection }) => collection === name)
      const bookmark = _bookmark ? { ..._bookmark, data: JSON.parse(_bookmark.data) } : undefined
      const queryParams: string[] = isEmpty(bookmark?.data?.columns)
        ? []
        : [
            'columns=' +
              Object.entries(bookmark!.data!.columns)
                .map(([columnName, { width, minWidth }]: any) => {
                  const parts = [columnName]
                  if (!isEmpty(width)) {
                    parts.push(width)
                  } else if (!isEmpty(minWidth) && minWidth !== '16rem') {
                    parts.push(minWidth)
                  }
                  return parts.join('|')
                })
                .join(','),
          ]

      if (bookmark?.data) {
        queryParams.push(
          ...selectQueryBuilderParamsToQueryString(bookmark.data)
            .split('&')
            .filter(Boolean)
            .map((param) => {
              const parts = param.split('=')
              return [parts.shift()!, decodeQueryString(parts.join('='))].map(decodeQueryString).join('=')
            }),
        )
      }

      return {
        to: `collections/${slugify(name)}` + (isEmpty(queryParams) ? '' : `?${queryParams.join('&')}`),
        label: isDefined(definition.ui.label)
          ? maybeTranslate(definition.ui.label)
          : __('pruvious-dashboard', titleCase(name, false) as any),
        icon: definition.ui.menu.icon,
        group: definition.ui.menu.group as any,
        order: definition.ui.menu.order,
      }
    })
}

/**
 * Converts serializable `singletons` to menu items.
 */
export function singletonsToMenuItems(
  singletons: Record<string, SerializableSingleton> | undefined,
): (DashboardMenuItem & Pick<SingletonUIOptions['menu'], 'group' | 'order'>)[] {
  return Object.entries(singletons ?? {})
    .filter(([_, definition]) => !definition.ui.hidden && !definition.ui.menu.hidden)
    .map(([name, definition]) => ({
      to: `singletons/${slugify(name)}`,
      label: isDefined(definition.ui.label)
        ? maybeTranslate(definition.ui.label)
        : __('pruvious-dashboard', titleCase(name, false) as any),
      icon: definition.ui.menu.icon,
      group: definition.ui.menu.group as any,
      order: definition.ui.menu.order,
    }))
}
