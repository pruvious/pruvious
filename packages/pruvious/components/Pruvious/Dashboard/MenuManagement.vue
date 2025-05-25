<template>
  <PUIVerticalMenu
    v-if="items?.length"
    :ariaLabelCollapse="__('pruvious-dashboard', 'Collapse')"
    :ariaLabelExpand="__('pruvious-dashboard', 'Expand')"
    :items="items"
    :title="__('pruvious-dashboard', 'Management')"
  />
</template>

<script lang="ts" setup>
import {
  __,
  applyFilters,
  hasPermission,
  loadFilters,
  maybeTranslate,
  preloadTranslatableStrings,
  prepareDashboardMenu,
  useLanguage,
  usePruviousDashboard,
  type DashboardMenuItem,
} from '#pruvious/client'
import { dashboardPages } from '#pruvious/client/dashboard-pages'
import { collator, isArray, isDefined, omit, titleCase } from '@pruvious/utils'
import { collectionsToMenuItems, singletonsToMenuItems } from '../../../utils/pruvious/dashboard/menu'

await preloadTranslatableStrings('pruvious-dashboard', useLanguage().value as any)
await loadFilters('dashboard:menu:management')

const route = useRoute()
const dashboard = usePruviousDashboard()
const orderedItems: (DashboardMenuItem & { order: number })[] = [
  ...Object.entries(dashboardPages)
    .filter(
      ([_, { group, permissions }]) =>
        group === 'management' &&
        permissions.every((outer) =>
          isArray(outer) ? outer.some((inner) => hasPermission(inner)) : hasPermission(outer),
        ),
    )
    .map(([_, d]) => ({
      ...omit(d, ['_path']),
      to: d.path ?? d._path,
      label: isDefined(d.label) ? maybeTranslate(d.label) : __('pruvious-dashboard', titleCase(d._path, false) as any),
    })),
  ...collectionsToMenuItems(dashboard.value?.collections).filter(({ group }) => group === 'management'),
  ...singletonsToMenuItems(dashboard.value?.singletons).filter(({ group }) => group === 'management'),
]
const items = await applyFilters(
  'dashboard:menu:management',
  orderedItems.sort((a, b) => a.order - b.order || collator.compare(a.label, b.label)),
  {},
).then((orderedItems) => prepareDashboardMenu(orderedItems, route))
</script>
