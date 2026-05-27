<template>
  <PUICard v-for="group in visibleGroups" :key="group.code" class="p-overview-routes">
    <template #header>
      <div class="p-overview-routes-header">
        <Icon mode="svg" name="tabler:link" />
        <span>{{ group.title }}</span>
        <span class="p-overview-routes-count">{{ group.entries.length }}</span>
      </div>
    </template>

    <div v-if="!group.entries.length" class="p-overview-routes-empty">
      <span>{{ __('pruvious-dashboard', 'No data available') }}</span>
    </div>

    <ul v-else class="p-overview-routes-list">
      <li v-for="entry in group.entries" :key="entryKey(entry)" class="p-overview-routes-row">
        <PUIBadge v-if="!entry.isPublic" :size="-2" color="accent">
          {{ __('pruvious-dashboard', 'Draft') }}
        </PUIBadge>

        <a
          :href="entry.path"
          :title="entry.path"
          rel="noopener noreferrer"
          target="_blank"
          class="p-overview-routes-path"
        >
          {{ entry.path }}
        </a>

        <span v-if="entry.referenceName" :title="entry.label" class="p-overview-routes-ref">
          {{ entry.label }}
        </span>

        <div class="p-overview-routes-actions">
          <PUIButton
            v-if="canEdit(entry)"
            v-pui-tooltip="__('pruvious-dashboard', 'Edit')"
            :size="-3"
            :to="entry.editUrl!"
            variant="outline"
          >
            <Icon mode="svg" name="tabler:pencil" />
          </PUIButton>

          <PUIButton
            v-else-if="canView(entry)"
            v-pui-tooltip="__('pruvious-dashboard', 'View')"
            :size="-3"
            :to="entry.editUrl!"
            variant="outline"
          >
            <Icon mode="svg" name="tabler:list-search" />
          </PUIButton>

          <PUIButton
            v-if="canEditRoute"
            v-pui-tooltip="__('pruvious-dashboard', 'Edit route')"
            :size="-3"
            :to="entry.routeEditUrl"
            variant="outline"
          >
            <Icon mode="svg" name="tabler:route" />
          </PUIButton>
        </div>
      </li>
    </ul>
  </PUICard>
</template>

<script lang="ts" setup>
import { __, hasPermission, languages } from '#pruvious/app'
import { $pfetchDashboard, useOverviewSearch } from '#pruvious/dashboard'
import type { LanguageCode, Permission } from '#pruvious/server'
import { kebabCase } from '@pruvious/utils'

interface OverviewRoutesEntry {
  routeId: number
  path: string
  language: LanguageCode
  isPublic: boolean
  referenceType: 'collection' | 'singleton' | null
  referenceName: string | null
  recordId: number | null
  editUrl: string | null
  routeEditUrl: string
  label: string
}

interface OverviewRoutesResult {
  data: OverviewRoutesEntry[]
  canSeeDrafts: boolean
}

interface OverviewRoutesGroup {
  code: LanguageCode | '_all'
  title: string
  entries: OverviewRoutesEntry[]
}

const runtimeConfig = useRuntimeConfig()
const hasMultipleLanguages = languages.length > 1
const canEditRoute = hasPermission('collection:routes:update' as Permission)
const search = useOverviewSearch()

const response = (await $pfetchDashboard(
  runtimeConfig.public.pruvious.apiBasePath + 'pruvious/overview-routes',
)) as OverviewRoutesResult

const groups = computed<OverviewRoutesGroup[]>(() => {
  const filtered = response.data.filter((entry) => search.matches(entry.path, entry.label, entry.referenceName))

  if (!hasMultipleLanguages) {
    return [{ code: '_all', title: __('pruvious-dashboard', 'Routes'), entries: filtered }]
  }

  return languages.map(({ code, name }) => ({
    code: code as LanguageCode,
    title: name,
    entries: filtered.filter((entry) => entry.language === code),
  }))
})

const visibleGroups = computed(() =>
  search.active.value ? groups.value.filter((group) => group.entries.length > 0) : groups.value,
)

watchEffect(() => {
  const total = groups.value.reduce((sum, group) => sum + group.entries.length, 0)
  search.registerCount('overview-routes', total)
})
onBeforeUnmount(() => search.unregisterCount('overview-routes'))

function entryKey(entry: OverviewRoutesEntry): string {
  const ref = entry.referenceType ?? 'route'
  const name = entry.referenceName ?? entry.routeId
  const id = entry.recordId ?? entry.routeId
  return `${ref}:${name}:${id}:${entry.language}`
}

function canEdit(entry: OverviewRoutesEntry): boolean {
  if (!entry.referenceName || !entry.editUrl) {
    return false
  }
  const slug = kebabCase(entry.referenceName)
  if (entry.referenceType === 'singleton') {
    return hasPermission(`singleton:${slug}:update` as Permission)
  }
  return hasPermission(`collection:${slug}:update` as Permission)
}

function canView(entry: OverviewRoutesEntry): boolean {
  if (!entry.referenceName || !entry.editUrl) {
    return false
  }
  const slug = kebabCase(entry.referenceName)
  if (entry.referenceType === 'singleton') {
    return hasPermission(`singleton:${slug}:read` as Permission)
  }
  return hasPermission(`collection:${slug}:read` as Permission)
}
</script>

<style scoped>
.p-overview-routes {
  --pui-padding-header: 0.625rem 0.75rem;
  --pui-padding-body: 0;
}

.p-overview-routes-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;
}

.p-overview-routes-header svg {
  color: hsl(var(--pui-muted-foreground));
  font-size: 1rem;
}

.p-overview-routes-count {
  margin-left: auto;
  padding: 0.125rem 0.5rem;
  border-radius: var(--pui-radius);
  background-color: hsl(var(--pui-muted));
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.75rem;
  font-weight: 500;
}

.p-overview-routes-empty {
  padding: 1.5rem 0.75rem;
  text-align: center;
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.875rem;
}

.p-overview-routes-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.p-overview-routes-row {
  position: relative;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom-width: 1px;
  font-size: 0.875rem;
}

.p-overview-routes-row:last-child {
  border-bottom-width: 0;
}

.p-overview-routes-row:hover {
  background-color: hsl(var(--pui-muted) / 0.4);
}

.p-overview-routes-path {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: hsl(var(--pui-foreground));
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.p-overview-routes-path::after {
  content: '';
  position: absolute;
  inset: 0;
}

.p-overview-routes-ref {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 16rem;
  overflow: hidden;
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.p-overview-routes-actions {
  position: relative;
  display: flex;
  flex-shrink: 0;
  gap: 0.25rem;
  align-items: center;
  margin: -0.25rem 0;
}
</style>
