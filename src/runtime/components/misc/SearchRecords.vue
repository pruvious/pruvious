<template>
  <div class="flex w-full gap-2">
    <component
      v-model="(searchValue as any)[collection.name!]"
      :is="TextField"
      :options="{
        label: '',
        placeholder: __('pruvious-dashboard', 'Search $items...', { items: collection.label.record.plural }),
        clearable: true,
      }"
      :suggestions="onSuggestions"
      @pickSuggestion="onPick"
      class="w-full"
    />

    <NuxtLink
      v-if="collection.apiRoutes.create && (user?.isAdmin || (userCapabilities as any)[`collection-${collection.name}-create`])"
      v-pruvious-tooltip="{
        content: __('pruvious-dashboard', 'Add $item', { item: collection.label.record.singular }),
      }"
      :to="createPath + (language && language === primaryLanguage ? '' : '?language=' + language)"
      class="button button-white button-square"
    >
      <PruviousIconPlus />
    </NuxtLink>
  </div>
</template>

<script lang="ts" setup>
import { useRuntimeConfig } from '#imports'
import { primaryLanguage } from '#pruvious'
import { navigateToPruviousDashboardPath, textFieldComponent } from '#pruvious/dashboard'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { usePruviousSearch } from '../../composables/dashboard/search'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { uniqueArray } from '../../utils/array'
import { pruviousFetch } from '../../utils/fetch'
import { joinRouteParts } from '../../utils/string'
import { getCapabilities } from '../../utils/users'

const props = defineProps<{
  language?: string
}>()

const dashboard = usePruviousDashboard()
const runtimeConfig = useRuntimeConfig()
const searchValue = usePruviousSearch()
const user = useUser()

const TextField = textFieldComponent()

const collection = dashboard.value.collections[dashboard.value.collection!]
const createPath = joinRouteParts(
  runtimeConfig.public.pruvious.dashboardPrefix,
  'collections',
  collection.name,
  'create',
)
const userCapabilities = getCapabilities(user.value)

await loadTranslatableStrings('pruvious-dashboard')

if (!(searchValue as any).value[collection.name!]) {
  ;(searchValue as any).value[collection.name!] = ''
}

async function onSuggestions(keywords: string, page: number) {
  const result = await pruviousFetch<{ records: any[] }>(`collections/${collection.name}`, {
    query: {
      search: keywords,
      select: uniqueArray(['id', ...collection.dashboard.overviewTable.searchLabel])
        .filter(Boolean)
        .join(','),
      where: props.language ? `language[=][${props.language}]` : undefined,
      page,
      perPage: 30,
      order: ':default',
    },
  })

  const a = collection.dashboard.overviewTable.searchLabel[0]
  const b = collection.dashboard.overviewTable.searchLabel[1]

  return result.success
    ? result.data.records.map((item) => ({
        value: item.id.toString(),
        label:
          item[a] === '' || item[a] === null
            ? __('pruvious-dashboard', collection.fields[a].additional.emptyLabel as any)
            : item[a],
        detail: b ? item[b] : undefined,
        dimmed: item[a] === '' || item[a] === null,
      }))
    : []
}

async function onPick(recordId: string) {
  await navigateToPruviousDashboardPath(`/collections/${collection.name}/${recordId}`)
}
</script>
