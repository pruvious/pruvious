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
  prepareDashboardMenu,
  usePruviousDashboard,
  usePruviousDashboardMenuExpanded,
  type DashboardMenuItem,
} from '#pruvious/client'
import { collator, isEmpty } from '@pruvious/utils'
import { collectionsToMenuItems, singletonsToMenuItems } from '../../../utils/pruvious/dashboard/menu'

await loadFilters('dashboard:menu:utilities')

const route = useRoute()
const dashboard = usePruviousDashboard()
const expanded = usePruviousDashboardMenuExpanded()
const orderedItems: (DashboardMenuItem & { order: number })[] = [
  ...collectionsToMenuItems(dashboard.value?.collections).filter(({ group }) => group === 'utilities'),
  ...singletonsToMenuItems(dashboard.value?.singletons).filter(({ group }) => group === 'utilities'),
]

if (dashboard.value?.logs) {
  const logItems: DashboardMenuItem[] = []

  if (dashboard.value.logs.api) {
    logItems.push(
      { to: 'logs/requests', label: __('pruvious-dashboard', 'Requests') },
      { to: 'logs/responses', label: __('pruvious-dashboard', 'Responses') },
    )
  }

  if (dashboard.value.logs.queries) {
    logItems.push({ to: 'logs/queries', label: __('pruvious-dashboard', 'Queries') })
  }

  if (dashboard.value.logs.queue) {
    logItems.push({ to: 'logs/queue', label: __('pruvious-dashboard', 'Queue') })
  }

  if (dashboard.value.logs.custom) {
    logItems.push({ to: 'logs/custom', label: __('pruvious-dashboard', 'Custom') })
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
</script>
