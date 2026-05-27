<template>
  <PUICard v-if="filteredEntries.length || !search.active.value" class="p-overview-recent">
    <template #header>
      <div class="p-overview-recent-header">
        <Icon mode="svg" name="tabler:history" />
        <span>{{ __('pruvious-dashboard', 'Recent edits') }}</span>
      </div>
    </template>

    <div v-if="!filteredEntries.length" class="p-overview-recent-empty">
      <span>{{ __('pruvious-dashboard', 'No data available') }}</span>
    </div>

    <ul v-else class="p-overview-recent-list">
      <li
        v-for="entry in filteredEntries"
        :key="`${entry.collectionName}:${entry.recordId}:${entry.language ?? ''}`"
        class="p-overview-recent-row"
      >
        <Icon
          v-if="entry.collectionIcon"
          :name="`tabler:${entry.collectionIcon}`"
          mode="svg"
          class="p-overview-recent-icon"
        />

        <NuxtLink :title="entry.label" :to="entry.editUrl" class="p-overview-recent-label">
          {{ entry.label }}
        </NuxtLink>

        <PUIBadge v-if="hasMultipleLanguages && entry.language" :size="-2" color="secondary">
          {{ formatLanguageCode(entry.language) }}
        </PUIBadge>

        <PUIBadge v-if="!entry.isPublic" :size="-2" color="accent">
          {{ __('pruvious-dashboard', 'Draft') }}
        </PUIBadge>

        <span
          v-pui-tooltip="entry.label + ' - ' + (entry.collectionLabel ?? entry.collectionName)"
          class="p-overview-recent-time"
        >
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

interface RecentEditsEntry {
  collectionName: string
  collectionLabel: string | null
  collectionIcon: string | null
  recordId: number
  label: string
  language: LanguageCode | null
  isPublic: boolean
  updatedAt: number
  editUrl: string
}

interface RecentEditsResult {
  data: RecentEditsEntry[]
  limit: number
}

const runtimeConfig = useRuntimeConfig()
const hasMultipleLanguages = languages.length > 1
const search = useOverviewSearch()

const response = (await $pfetchDashboard(
  runtimeConfig.public.pruvious.apiBasePath + 'pruvious/overview-recent-edits',
)) as RecentEditsResult

const entries = ref<RecentEditsEntry[]>(response.data)

const filteredEntries = computed(() =>
  entries.value.filter((entry) =>
    search.matches(entry.label, entry.collectionLabel, entry.collectionName, entry.language),
  ),
)

watchEffect(() => search.registerCount('overview-recent-edits', filteredEntries.value.length))
onBeforeUnmount(() => search.unregisterCount('overview-recent-edits'))
</script>

<style scoped>
.p-overview-recent {
  --pui-padding-header: 0.625rem 0.75rem;
  --pui-padding-body: 0;
}

.p-overview-recent-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;
}

.p-overview-recent-header svg {
  color: hsl(var(--pui-muted-foreground));
  font-size: 1rem;
}

.p-overview-recent-empty {
  padding: 1.5rem 0.75rem;
  text-align: center;
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.875rem;
}

.p-overview-recent-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.p-overview-recent-row {
  position: relative;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom-width: 1px;
  font-size: 0.875rem;
}

.p-overview-recent-row:last-child {
  border-bottom-width: 0;
}

.p-overview-recent-row:hover {
  background-color: hsl(var(--pui-muted) / 0.4);
}

.p-overview-recent-icon {
  flex-shrink: 0;
  color: hsl(var(--pui-muted-foreground));
  font-size: 1rem;
}

.p-overview-recent-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: hsl(var(--pui-foreground));
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.p-overview-recent-label::after {
  content: '';
  position: absolute;
  inset: 0;
}

.p-overview-recent-time {
  flex-shrink: 0;
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.75rem;
  white-space: nowrap;
}
</style>
