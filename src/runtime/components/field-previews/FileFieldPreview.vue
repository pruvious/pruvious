<template>
  <div v-if="upload && !isLoading" class="flex items-center gap-2 py-1 pr-1">
    <span :title="upload.directory + upload.filename" class="truncate">{{ upload.filename }}</span>

    <NuxtLink
      v-pruvious-tooltip="__('pruvious-dashboard', 'View file')"
      :to="`/${runtimeConfig.public.pruvious.dashboardPrefix}/media/?where=id[=][${upload.id}]`"
      class="button button-white button-square-xs"
    >
      <PruviousIconFilter />
    </NuxtLink>
  </div>

  <PruviousStringFieldPreview
    v-if="!upload && !isLoading"
    :canUpdate="canUpdate"
    :name="name"
    :options="options"
    :value="(value as any)"
    @refresh="$emit('refresh')"
  />
</template>

<script lang="ts" setup>
import { ref, useRuntimeConfig, watch, type PropType } from '#imports'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousFetch } from '../../utils/fetch'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Number as PropType<Number | null>,
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

const runtimeConfig = useRuntimeConfig()

const isLoading = ref(false)
const upload = ref<Record<string, any> | null>(null)

const PruviousStringFieldPreview = dashboardMiscComponent.StringFieldPreview()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.value,
  async () => {
    if (props.value) {
      isLoading.value = true
      const response = await pruviousFetch<Record<string, any>>(`collections/uploads/${props.value}`, {
        dispatchEvents: false,
      })
      upload.value = response.success ? response.data : null
      isLoading.value = false
    } else {
      upload.value = null
    }
  },
  { immediate: true },
)
</script>
