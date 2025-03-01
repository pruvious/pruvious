<template>
  <PUIVerticalMenu
    v-if="items?.length"
    :ariaCollapseLabel="__('pruvious-dashboard', 'Collapse')"
    :ariaExpandLabel="__('pruvious-dashboard', 'Expand')"
    :items="items"
  />
</template>

<script lang="ts" setup>
import {
  __,
  applyFilters,
  loadFilters,
  prepareDashboardMenu,
  usePruviousDashboard,
  type DashboardMenuItem,
} from '#pruvious/client'
import { collator } from '@pruvious/utils'
import { collectionsToMenuItems, singletonsToMenuItems } from '../../../utils/pruvious/dashboard/menu'

await loadFilters('dashboard:menu:general')

const route = useRoute()
const dashboard = usePruviousDashboard()
const orderedItems: (DashboardMenuItem & { order: number })[] = [
  {
    to: 'overview',
    label: __('pruvious-dashboard', 'Overview'),
    icon: 'dashboard',
    order: 1,
  },
  ...collectionsToMenuItems(dashboard.value?.collections).filter(({ group }) => group === 'general'),
  ...singletonsToMenuItems(dashboard.value?.singletons).filter(({ group }) => group === 'general'),
]
const items = await applyFilters(
  'dashboard:menu:general',
  orderedItems.sort((a, b) => a.order - b.order || collator.compare(a.label, b.label)),
  {},
).then((orderedItems) => prepareDashboardMenu(orderedItems, route))
</script>
