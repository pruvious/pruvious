<template>
  <NuxtLink
    v-if="upload?.isImage && !isLoading"
    :title="upload.directory + upload.filename"
    :to="`/${runtimeConfig.public.pruvious.dashboardPrefix}/media/?where=id[=][${upload.id}]`"
    class="relative flex h-16 w-16 shrink-0 rounded-[0.4375rem] border bg-white before:absolute before:inset-0 before:rounded-md before:bg-gray-900 before:opacity-0 before:transition hover:before:opacity-50"
    :style="{ backgroundImage: upload.isImage ? `url(${backgroundImage})` : undefined }"
  >
    <PruviousImagePreview :upload="upload" />
  </NuxtLink>

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
import { imageTypes, type CastedFieldType } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import backgroundImage from '../../assets/image-background.png'
import type { MediaUpload } from '../../composables/dashboard/media'
import { pruviousFetch } from '../../utils/fetch'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Object as PropType<{ uploadId: number; alt: string } | null>,
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
const upload = ref<MediaUpload | null>(null)

const PruviousImagePreview = dashboardMiscComponent.ImagePreview()
const PruviousStringFieldPreview = dashboardMiscComponent.StringFieldPreview()

watch(
  () => props.value,
  async () => {
    if (props.value) {
      isLoading.value = true

      const response = await pruviousFetch<CastedFieldType['uploads']>(`collections/uploads/${props.value.uploadId}`, {
        dispatchEvents: false,
      })

      if (response.success) {
        upload.value = {
          extension: response.data.filename.split('.').pop() ?? '',
          isImage: imageTypes.includes(response.data.type),
          ...response.data,
        }
      } else {
        upload.value = null
      }

      isLoading.value = false
    } else {
      upload.value = null
    }
  },
  { immediate: true },
)
</script>
