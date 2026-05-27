<template>
  <PruviousDashboardPage>
    <div class="p-overview" :class="{ 'p-overview-searching': search.active.value }">
      <PUIInput
        v-model="search.query.value"
        :aria-label="__('pruvious-dashboard', 'Search')"
        :placeholder="__('pruvious-dashboard', 'Search')"
        :size="-1"
        aria-keyshortcuts="Meta+K Control+K"
        ref="searchInputRef"
        class="p-overview-search"
      >
        <template #prefix>
          <Icon mode="svg" name="tabler:search" class="p-overview-search-icon" />
        </template>
        <template #suffix>
          <button
            v-if="search.active.value"
            :aria-label="__('pruvious-dashboard', 'Clear')"
            :title="__('pruvious-dashboard', 'Clear')"
            @click="clearSearch()"
            type="button"
            class="p-overview-search-clear pui-raw"
          >
            <Icon mode="svg" name="tabler:x" />
          </button>
          <kbd v-else aria-hidden="true" class="p-overview-search-kbd">
            {{ isMac ? '⌘K' : 'Ctrl+K' }}
          </kbd>
        </template>
      </PUIInput>

      <section class="p-overview-section">
        <h2 class="p-overview-section-title">
          {{ __('pruvious-dashboard', 'Shortcuts') }}
        </h2>
        <div class="p-overview-grid">
          <PruviousDashboardOverviewQuickCreate />
          <PruviousDashboardOverviewExtraShortcuts />
        </div>
      </section>

      <section class="p-overview-section">
        <h2 class="p-overview-section-title">
          {{ __('pruvious-dashboard', 'Activity') }}
        </h2>
        <div class="p-overview-grid">
          <PruviousDashboardOverviewRecentEdits />
          <PruviousDashboardOverviewDrafts />
          <PruviousDashboardOverviewExtraActivity />
        </div>
      </section>

      <section class="p-overview-section">
        <h2 class="p-overview-section-title">
          {{ __('pruvious-dashboard', 'Content') }}
        </h2>
        <div class="p-overview-grid">
          <PruviousDashboardOverviewRoutes />
          <PruviousDashboardOverviewExtraContent />
        </div>
      </section>

      <div
        v-if="search.active.value && !search.hasAnyResults.value"
        aria-live="polite"
        role="status"
        class="p-overview-no-results"
      >
        <Icon mode="svg" name="tabler:search-off" />
        <span>{{ __('pruvious-dashboard', 'No results found') }}</span>
      </div>
    </div>
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { dashboardBasePath, dashboardMiddleware, defineDashboardPage, useOverviewSearch } from '#pruvious/dashboard'
import { puiIsMac } from '@pruvious/ui/pui/hotkeys'
import { useEventListener } from '@vueuse/core'

defineDashboardPage({
  label: ({ __ }) => __('pruvious-dashboard', 'Overview'),
  icon: 'dashboard',
  group: 'general',
  order: 1,
})

definePageMeta({
  path: dashboardBasePath + 'overview',
  middleware: [(to) => dashboardMiddleware(to, 'default'), (to) => dashboardMiddleware(to, 'auth-guard')],
})

useHead({
  title: __('pruvious-dashboard', 'Overview'),
})

const search = useOverviewSearch()
const isMac = puiIsMac()
const searchInputRef = useTemplateRef<{ input: HTMLInputElement | null }>('searchInputRef')

function focusSearch() {
  const el = searchInputRef.value?.input
  if (el) {
    el.focus()
    el.select()
  }
}

function clearSearch() {
  search.query.value = ''
  focusSearch()
}

useEventListener('keydown', (event) => {
  if (
    event.code === 'KeyK' &&
    !event.altKey &&
    !event.shiftKey &&
    ((isMac && event.metaKey && !event.ctrlKey) || (!isMac && event.ctrlKey && !event.metaKey))
  ) {
    event.preventDefault()
    focusSearch()
  } else if (event.code === 'Escape' && search.active.value && document.activeElement === searchInputRef.value?.input) {
    event.preventDefault()
    clearSearch()
  }
})

onBeforeUnmount(() => {
  search.query.value = ''
})
</script>

<style scoped>
.p-overview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.p-overview-search .p-overview-search-icon {
  margin-left: 0.75rem;
  margin-right: 0;
  color: hsl(var(--pui-muted-foreground));
  font-size: 1rem;
}

.p-overview-search .p-overview-search-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.375rem;
  margin-left: 0;
  padding: 0.1875rem;
  border-width: 1px;
  border-color: transparent;
  border-radius: calc(var(--pui-radius) - 0.25rem);
  outline: none;
  background-color: transparent;
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.75rem;
  line-height: 1;
}

.p-overview-search .p-overview-search-clear:hover {
  background-color: hsl(var(--pui-muted) / 0.6);
  color: hsl(var(--pui-foreground));
}

.p-overview-search .p-overview-search-clear:focus-visible {
  border-color: hsl(var(--pui-ring));
  color: hsl(var(--pui-foreground));
}

.p-overview-search .p-overview-search-kbd {
  display: inline-flex;
  align-items: center;
  margin-right: 0.375rem;
  margin-left: 0;
  padding: 0.1875rem 0.4375rem;
  border-width: 1px;
  border-radius: calc(var(--pui-radius) - 0.25rem);
  background-color: hsl(var(--pui-muted) / 0.6);
  color: hsl(var(--pui-muted-foreground));
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.02em;
  white-space: nowrap;
  user-select: none;
}

.p-overview-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.p-overview-section-title {
  margin: 0;
  padding: 0 0.125rem;
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  text-transform: uppercase;
}

.p-overview-grid:has(> :nth-child(2)) {
  column-width: 28rem;
  column-gap: 0.75rem;
}

.p-overview-grid:has(> :nth-child(2)) :deep(.pui-card) {
  display: block;
  width: 100%;
  margin-bottom: 0.75rem;
  break-inside: avoid;
}

.p-overview-searching .p-overview-section:not(:has(.pui-card)) {
  display: none;
}

.p-overview-no-results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  padding: 3rem 0.75rem;
  color: hsl(var(--pui-muted-foreground));
  text-align: center;
}

.p-overview-no-results svg {
  font-size: 2.5rem;
  opacity: 0.5;
}

.p-overview-no-results span {
  font-size: 0.875rem;
}
</style>
