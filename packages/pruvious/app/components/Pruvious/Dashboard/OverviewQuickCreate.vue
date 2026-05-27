<template>
  <PUICard v-if="filteredShortcuts.length" class="p-overview-quick-create">
    <template #header>
      <div class="p-overview-quick-create-header">
        <Icon mode="svg" name="tabler:plus" />
        <span>{{ __('pruvious-dashboard', 'Quick create') }}</span>
      </div>
    </template>

    <div class="p-overview-quick-create-grid">
      <PUIButton
        v-for="shortcut in filteredShortcuts"
        :key="shortcut.name"
        :size="-2"
        :title="shortcut.label"
        :to="shortcut.to"
        variant="outline"
        class="p-overview-quick-create-button"
      >
        <Icon v-if="shortcut.icon" :name="`tabler:${shortcut.icon}`" mode="svg" />
        <span>{{ shortcut.label }}</span>
      </PUIButton>
    </div>
  </PUICard>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { dashboardBasePath, maybeTranslate, useOverviewSearch, usePruviousDashboard } from '#pruvious/dashboard'
import { collator, isDefined, slugify, titleCase } from '@pruvious/utils'

interface QuickCreateShortcut {
  name: string
  label: string
  icon: string | undefined
  to: string
}

const dashboard = usePruviousDashboard()
const search = useOverviewSearch()

const shortcuts = computed<QuickCreateShortcut[]>(() => {
  const items: QuickCreateShortcut[] = []

  for (const [name, definition] of Object.entries(dashboard.value?.collections ?? {})) {
    if (!definition.api.create || definition.ui.hidden) {
      continue
    }

    items.push({
      name,
      label: isDefined(definition.ui.label)
        ? maybeTranslate(definition.ui.label)
        : __('pruvious-dashboard', titleCase(name, false) as any),
      icon: definition.ui.icon,
      to: `${dashboardBasePath}collections/${slugify(name)}/new`,
    })
  }

  items.sort((a, b) => collator.compare(a.label, b.label))
  return items
})

const filteredShortcuts = computed(() =>
  shortcuts.value.filter((shortcut) => search.matches(shortcut.label, shortcut.name)),
)

watchEffect(() => search.registerCount('overview-quick-create', filteredShortcuts.value.length))
onBeforeUnmount(() => search.unregisterCount('overview-quick-create'))
</script>

<style scoped>
.p-overview-quick-create {
  --pui-padding-header: 0.625rem 0.75rem;
  --pui-padding-body: 0.75rem;
}

.p-overview-quick-create-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;
}

.p-overview-quick-create-header svg {
  color: hsl(var(--pui-muted-foreground));
  font-size: 1rem;
}

.p-overview-quick-create-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.p-overview-quick-create-button {
  flex: 0 0 auto;
}
</style>
