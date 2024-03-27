<template>
  <ul v-if="chips.length && !isLoading" class="flex flex-wrap gap-1.5">
    <li
      v-for="{ id, label, details, exists } of chips"
      class="flex min-w-0 items-center truncate rounded-full bg-primary-100 text-vs"
    >
      <span class="flex truncate whitespace-nowrap px-2.5" :class="{ 'pr-1.5': exists }">
        <span v-pruvious-tooltip="options.details ? details : ''" class="h-6 truncate py-0.5">
          {{ label }}
        </span>
      </span>

      <NuxtLink
        v-if="exists"
        v-pruvious-tooltip="
          canUpdateCollection
            ? __('pruvious-dashboard', 'Edit $item', { item: collection.label.record.singular })
            : __('pruvious-dashboard', 'View $item', { item: collection.label.record.singular })
        "
        :to="`/${runtimeConfig.public.pruvious.dashboardPrefix}/collections/${collection.name}/${id}`"
        class="mr-1 flex h-4 w-4 shrink-0 rounded-full bg-white transition hocus:bg-primary-500 hocus:text-white"
      >
        <PruviousIconPencil class="m-auto h-3 w-3" />
      </NuxtLink>
    </li>
  </ul>

  <PruviousStringFieldPreview
    v-if="!chips.length && !isLoading"
    :canUpdate="canUpdate"
    :name="name"
    :options="options"
    :value="''"
    @refresh="$emit('refresh')"
  />
</template>

<script lang="ts" setup>
import { computed, ref, useRuntimeConfig, watch, type PropType } from '#imports'
import type { CollectionName } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { toArray, uniqueArray } from '../../utils/array'
import { pruviousFetch } from '../../utils/fetch'
import { stringify } from '../../utils/string'
import { getCapabilities } from '../../utils/users'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Array<number>,
  },
  options: {
    type: Object,
    required: true,
  },
  canUpdate: {
    type: Boolean,
    default: false,
  },
  record: {
    type: Object as PropType<Record<string, any>>,
  },
  language: {
    type: String,
  },
})

defineEmits<{
  refresh: []
}>()

const dashboard = usePruviousDashboard()
const runtimeConfig = useRuntimeConfig()
const user = useUser()

const chips = ref<{ id: number; label: string; details: string; exists: boolean }[]>([])
const collection = computed(() => dashboard.value.collections[props.options.collection])
const canUpdateCollection = computed(
  () =>
    user.value?.isAdmin || getCapabilities(user.value)[`collection-${collection.value.name as CollectionName}-update`],
)
const recordLabel = computed<string>(
  () => toArray(props.options.recordLabel)?.[0] ?? collection.value.dashboard.overviewTable.searchLabel[0],
)
const isLoading = ref(false)

const PruviousStringFieldPreview = dashboardMiscComponent.StringFieldPreview()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.value,
  async () => {
    chips.value = []
    isLoading.value = true

    if (props.value) {
      const recordChips: Record<number, { id: number; label: string; details: string; exists: boolean }> = {}
      const response = await pruviousFetch<{ records: Record<string, any>[] }>(
        `collections/${props.options.collection}`,
        {
          query: {
            select: uniqueArray(['id', recordLabel.value, ...(props.options.details ?? [])]).join(','),
            where: `id[in][${props.value.join(',')}]`,
          },
          dispatchEvents: false,
        },
      )

      if (response.success) {
        for (const record of response.data.records) {
          const stringifiedLabel = stringify(record[recordLabel.value])

          recordChips[record.id] = {
            id: record.id,
            label: stringifiedLabel || (collection.value?.fields[recordLabel.value].additional.emptyLabel as any),
            details: (props.options.details ?? [])
              .map((fieldName: string) => ({
                label: __('pruvious-dashboard', collection.value!.fields[fieldName].options.label as any),
                value:
                  stringify(record[fieldName]) ||
                  __('pruvious-dashboard', collection.value!.fields[fieldName].additional.emptyLabel as any),
              }))
              .map(({ label, value }: any) => `**${label}:** ${value}`)
              .join('<br>'),
            exists: true,
          }
        }

        for (const recordId of props.value) {
          if (recordChips[recordId]) {
            chips.value.push(recordChips[recordId])
          } else {
            chips.value.push({
              id: recordId,
              label: recordId.toString(),
              details: __('pruvious-dashboard', 'The $item does not exist', {
                item: __('pruvious-dashboard', collection.value.label.collection.singular as any),
              }),
              exists: false,
            })
          }
        }
      }
    }

    isLoading.value = false
  },
  { immediate: true },
)
</script>
