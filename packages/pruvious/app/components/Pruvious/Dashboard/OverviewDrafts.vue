<template>
  <PUICard v-if="response.available && (filteredEntries.length || !search.active.value)" class="p-overview-drafts">
    <template #header>
      <div class="p-overview-drafts-header">
        <Icon mode="svg" name="tabler:file-pencil" />
        <span>{{ __('pruvious-dashboard', 'Drafts') }}</span>
      </div>
    </template>

    <div v-if="!filteredEntries.length" class="p-overview-drafts-empty">
      <span>{{ __('pruvious-dashboard', 'No data available') }}</span>
    </div>

    <ul v-else class="p-overview-drafts-list">
      <li
        v-for="entry in filteredEntries"
        :key="`${entry.collectionName}:${entry.recordId}:${entry.language ?? ''}`"
        class="p-overview-drafts-row"
      >
        <Icon
          v-if="entry.collectionIcon"
          :name="`tabler:${entry.collectionIcon}`"
          mode="svg"
          class="p-overview-drafts-icon"
        />

        <NuxtLink :title="entry.label" :to="entry.editUrl" class="p-overview-drafts-label">
          {{ entry.label }}
        </NuxtLink>

        <PUIBadge v-if="hasMultipleLanguages && entry.language" :size="-2" color="secondary">
          {{ formatLanguageCode(entry.language) }}
        </PUIBadge>

        <span v-if="entry.updatedAt" class="p-overview-drafts-time">
          {{ dayjsRelative(entry.updatedAt) }}
        </span>
      </li>
    </ul>
  </PUICard>
</template>

<script lang="ts" setup>
import { __, languages } from '#pruvious/app'
import { $pfetchDashboard, useOverviewSearch } from '#pruvious/dashboard'
import { dayjsRelative } from '#pruvious/dashboard/dayjs'
import type { LanguageCode } from '#pruvious/server'
import { formatLanguageCode } from '@pruvious/utils'

interface DraftsEntry {
  collectionName: string
  collectionLabel: string | null
  collectionIcon: string | null
  recordId: number
  label: string
  language: LanguageCode | null
  updatedAt: number | null
  editUrl: string
}

interface DraftsResult {
  data: DraftsEntry[]
  limit: number
  available: boolean
}

const runtimeConfig = useRuntimeConfig()
const hasMultipleLanguages = languages.length > 1
const search = useOverviewSearch()

const response = (await $pfetchDashboard(
  runtimeConfig.public.pruvious.apiBasePath + 'pruvious/overview-drafts',
)) as DraftsResult

const entries = ref<DraftsEntry[]>(response.data)

const filteredEntries = computed(() =>
  entries.value.filter((entry) =>
    search.matches(entry.label, entry.collectionLabel, entry.collectionName, entry.language),
  ),
)

watchEffect(() => {
  search.registerCount('overview-drafts', response.available ? filteredEntries.value.length : 0)
})
onBeforeUnmount(() => search.unregisterCount('overview-drafts'))
</script>

<style scoped>
.p-overview-drafts {
  --pui-padding-header: 0.625rem 0.75rem;
  --pui-padding-body: 0;
}

.p-overview-drafts-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;
}

.p-overview-drafts-header svg {
  color: hsl(var(--pui-muted-foreground));
  font-size: 1rem;
}

.p-overview-drafts-empty {
  padding: 1.5rem 0.75rem;
  text-align: center;
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.875rem;
}

.p-overview-drafts-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.p-overview-drafts-row {
  position: relative;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom-width: 1px;
  font-size: 0.875rem;
}

.p-overview-drafts-row:last-child {
  border-bottom-width: 0;
}

.p-overview-drafts-row:hover {
  background-color: hsl(var(--pui-muted) / 0.4);
}

.p-overview-drafts-icon {
  flex-shrink: 0;
  color: hsl(var(--pui-muted-foreground));
  font-size: 1rem;
}

.p-overview-drafts-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: hsl(var(--pui-foreground));
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.p-overview-drafts-label::after {
  content: '';
  position: absolute;
  inset: 0;
}

.p-overview-drafts-time {
  flex-shrink: 0;
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.75rem;
  white-space: nowrap;
}
</style>
