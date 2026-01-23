<template>
  <PUIVerticalMenu
    v-if="items?.length"
    :ariaCollapseLabel="__('pruvious-dashboard', 'Collapse')"
    :ariaExpandLabel="__('pruvious-dashboard', 'Expand')"
    :items="items"
  />
</template>

<script lang="ts" setup>
import { __, applyFilters, hasPermission, loadFilters } from '#pruvious/app'
import {
  maybeTranslate,
  prepareDashboardMenu,
  usePruviousDashboard,
  type OrderedDashboardMenuItem,
} from '#pruvious/dashboard'
import { dashboardPages } from '#pruvious/dashboard/dashboard-pages'
import { collator, isArray, isDefined, omit, titleCase } from '@pruvious/utils'
import { collectionsToMenuItems, singletonsToMenuItems } from '../../../utils/pruvious/dashboard/menu'

await loadFilters('dashboard:menu:general')

const route = useRoute()
const dashboard = usePruviousDashboard()
const orderedItems: OrderedDashboardMenuItem[] = [
  ...Object.entries(dashboardPages)
    .filter(
      ([_, { group, permissions }]) =>
        group === 'general' &&
        permissions.every((outer) =>
          isArray(outer) ? outer.some((inner) => hasPermission(inner)) : hasPermission(outer),
        ),
    )
    .map(([_, d]) => ({
      ...omit(d, ['_path']),
      to: d.path ?? d._path,
      label: isDefined(d.label) ? maybeTranslate(d.label) : __('pruvious-dashboard', titleCase(d._path, false) as any),
    })),
  ...collectionsToMenuItems(dashboard.value?.collections).filter(({ group }) => group === 'general'),
  ...singletonsToMenuItems(dashboard.value?.singletons).filter(({ group }) => group === 'general'),
]
const items = await applyFilters(
  'dashboard:menu:general',
  orderedItems.sort((a, b) => a.order - b.order || collator.compare(a.label, b.label)),
  {},
).then((orderedItems) => prepareDashboardMenu(orderedItems, route))
</script>
