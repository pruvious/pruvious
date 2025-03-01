<template>
  <PUIVerticalMenu
    v-if="items?.length"
    :ariaLabelCollapse="__('pruvious-dashboard', 'Collapse')"
    :ariaLabelExpand="__('pruvious-dashboard', 'Expand')"
    :items="items"
    :title="__('pruvious-dashboard', 'Collections')"
  />
</template>

<script lang="ts" setup>
import { __, applyFilters, prepareDashboardMenu, usePruviousDashboard, type DashboardMenuItem } from '#pruvious/client'
import { collator } from '@pruvious/utils'
import { collectionsToMenuItems, singletonsToMenuItems } from '../../../utils/pruvious/dashboard/menu'

const route = useRoute()
const dashboard = usePruviousDashboard()
const orderedItems: (DashboardMenuItem & { order: number })[] = [
  ...collectionsToMenuItems(dashboard.value?.collections).filter(({ group }) => group === 'collections'),
  ...singletonsToMenuItems(dashboard.value?.singletons).filter(({ group }) => group === 'collections'),
]
const items = await applyFilters(
  'dashboard:menu:collections',
  orderedItems.sort((a, b) => a.order - b.order || collator.compare(a.label, b.label)),
  {},
).then((orderedItems) => prepareDashboardMenu(orderedItems, route))
</script>
