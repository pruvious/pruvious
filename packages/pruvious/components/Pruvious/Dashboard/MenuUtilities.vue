<template>
  <PUIVerticalMenu
    v-if="items?.length"
    :ariaCollapseLabel="__('pruvious-dashboard', 'Collapse')"
    :ariaExpandLabel="__('pruvious-dashboard', 'Expand')"
    :expandedState="expanded.utilities"
    :items="items"
    :title="__('pruvious-dashboard', 'Utilities')"
    @update:expandedState="expanded = { ...expanded, utilities: $event }"
  />
</template>

<script lang="ts" setup>
import {
  __,
  applyFilters,
  loadFilters,
  maybeTranslate,
  preloadTranslatableStrings,
  prepareDashboardMenu,
  useAuth,
  useLanguage,
  usePruviousDashboard,
  usePruviousDashboardMenuExpanded,
  type DashboardMenuItem,
} from '#pruvious/client'
import { dashboardPages } from '#pruvious/client/dashboard-pages'
import { decodeQueryString, selectQueryBuilderParamsToQueryString } from '@pruvious/orm/query-string'
import { collator, isDefined, isEmpty, omit, slugify, titleCase } from '@pruvious/utils'
import { collectionsToMenuItems, singletonsToMenuItems } from '../../../utils/pruvious/dashboard/menu'

await preloadTranslatableStrings('pruvious-dashboard', useLanguage().value as any)
await loadFilters('dashboard:menu:utilities')

const route = useRoute()
const auth = useAuth()
const dashboard = usePruviousDashboard()
const expanded = usePruviousDashboardMenuExpanded()
const orderedItems: (DashboardMenuItem & { order: number })[] = [
  ...Object.entries(dashboardPages)
    .filter(([_, { group }]) => group === 'utilities')
    .map(([_, d]) => ({
      ...omit(d, ['_path']),
      to: d.path ?? d._path,
      label: isDefined(d.label) ? maybeTranslate(d.label) : __('pruvious-dashboard', titleCase(d._path, false) as any),
    })),
  ...collectionsToMenuItems(dashboard.value?.collections).filter(({ group }) => group === 'utilities'),
  ...singletonsToMenuItems(dashboard.value?.singletons).filter(({ group }) => group === 'utilities'),
]

if (dashboard.value?.logs) {
  const logItems: DashboardMenuItem[] = []

  if (dashboard.value.logs.api) {
    logItems.push(
      { to: resolveLogRoute('Requests'), label: __('pruvious-dashboard', 'Requests') },
      { to: resolveLogRoute('Responses'), label: __('pruvious-dashboard', 'Responses') },
    )
  }

  if (dashboard.value.logs.queries) {
    logItems.push({ to: resolveLogRoute('Queries'), label: __('pruvious-dashboard', 'Queries') })
  }

  if (dashboard.value.logs.queue) {
    logItems.push({ to: resolveLogRoute('Queue'), label: __('pruvious-dashboard', 'Queue') })
  }

  if (dashboard.value.logs.custom) {
    logItems.push({ to: resolveLogRoute('Custom'), label: __('pruvious-dashboard', 'Custom') })
  }

  if (!isEmpty(logItems)) {
    orderedItems.push({ label: __('pruvious-dashboard', 'Logs'), icon: 'bug', order: 50, submenu: logItems })
  }
}

const items = await applyFilters(
  'dashboard:menu:utilities',
  orderedItems.sort((a, b) => a.order - b.order || collator.compare(a.label, b.label)),
  {},
).then((orderedItems) => prepareDashboardMenu(orderedItems, route))

function resolveLogRoute(logCollectionName: string) {
  const _bookmark = auth.value.user?.bookmarks.find(({ collection }) => collection === `logs:${logCollectionName}`)
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

  return `logs/${slugify(logCollectionName)}` + (isEmpty(queryParams) ? '' : `?${queryParams.join('&')}`)
}
</script>
