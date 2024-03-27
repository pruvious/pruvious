<template>
  <div v-if="record && !isLoading" class="flex items-center gap-2 py-1 pr-1">
    <span :title="dimmed ? undefined : label" class="truncate" :class="{ 'text-gray-400': dimmed }">
      {{ __('pruvious-dashboard', label as any) }}
    </span>

    <NuxtLink
      v-pruvious-tooltip="
        canUpdateCollection
          ? __('pruvious-dashboard', 'Edit $item', { item: collection.label.record.singular })
          : __('pruvious-dashboard', 'View $item', { item: collection.label.record.singular })
      "
      :to="`/${runtimeConfig.public.pruvious.dashboardPrefix}/collections/${collection.name}/${value}`"
      class="button button-white button-square-xs"
    >
      <PruviousIconPencil v-if="canUpdateCollection" class="h-4 w-4" />
      <PruviousIconEye v-if="!canUpdateCollection" class="h-4 w-4" />
    </NuxtLink>
  </div>

  <PruviousStringFieldPreview
    v-if="!record && !isLoading"
    :canUpdate="canUpdate"
    :name="name"
    :options="options"
    :value="(value as any)"
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
import { toArray } from '../../utils/array'
import { pruviousFetch } from '../../utils/fetch'
import { stringify } from '../../utils/string'
import { getCapabilities } from '../../utils/users'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Number,
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

const collection = computed(() => dashboard.value.collections[props.options.collection])
const canUpdateCollection = computed(
  () =>
    user.value?.isAdmin || getCapabilities(user.value)[`collection-${collection.value.name as CollectionName}-update`],
)
const recordLabel = computed<string>(
  () => toArray(props.options.recordLabel)?.[0] ?? collection.value.dashboard.overviewTable.searchLabel[0],
)
const dimmed = ref(false)
const isLoading = ref(false)
const label = ref('')
const record = ref<Record<string, any> | null>(null)

const PruviousStringFieldPreview = dashboardMiscComponent.StringFieldPreview()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.value,
  async () => {
    if (props.value) {
      isLoading.value = true

      const response = await pruviousFetch<Record<string, any>>(
        `collections/${props.options.collection}/${props.value}`,
        { query: { select: recordLabel.value }, dispatchEvents: false },
      )

      if (response.success) {
        const stringifiedLabel = stringify(response.data[recordLabel.value])

        dimmed.value = !stringifiedLabel
        label.value = stringifiedLabel || (collection.value.fields[recordLabel.value].additional.emptyLabel as any)
        record.value = response.data
      } else {
        dimmed.value = false
        label.value = ''
        record.value = null
      }

      isLoading.value = false
    } else {
      dimmed.value = false
      label.value = ''
      record.value = null
    }
  },
  { immediate: true },
)
</script>
