<template>
  <picture v-if="upload" class="flex h-full w-full">
    <source v-if="thumbnailSrc" :srcset="thumbnailSrc" />
    <img
      :src="runtimeConfig.public.pruvious.uploadsBase + upload.directory + upload.filename"
      class="relative m-auto aspect-square h-full w-full rounded-md"
      :class="{
        'object-cover':
          upload.extension &&
          (upload.extension === 'jpg' ||
            upload.extension === 'jpeg' ||
            upload.extension === 'png' ||
            upload.extension === 'webp' ||
            upload.extension === 'avif' ||
            upload.extension === 'heif') &&
          upload.width >= 320 &&
          upload.height >= 320,
        'object-contain p-2':
          !upload.extension ||
          (upload.extension !== 'jpg' &&
            upload.extension !== 'jpeg' &&
            upload.extension !== 'png' &&
            upload.extension !== 'webp' &&
            upload.extension !== 'avif' &&
            upload.extension !== 'heif') ||
          upload.width < 320 ||
          upload.height < 320,
      }"
      :style="{
        maxWidth: upload.width + 'px',
        maxHeight: upload.height + 'px',
      }"
    />
  </picture>
</template>

<script lang="ts" setup>
import { computed, useRuntimeConfig, type PropType } from '#imports'
import type { MediaUpload } from '../../composables/dashboard/media'

const props = defineProps({
  upload: {
    type: Object as PropType<MediaUpload | null>,
  },
})

const runtimeConfig = useRuntimeConfig()

const thumbnailSrc = computed(() => {
  if (!props.upload || !props.upload.isImage) {
    return ''
  }

  if (props.upload.type === 'image/svg+xml' || props.upload.width < 320 || props.upload.height < 320) {
    return runtimeConfig.public.pruvious.uploadsBase + props.upload.directory + props.upload.filename
  }

  const basename = props.upload.filename.includes('.')
    ? props.upload.filename.split('.').slice(0, -1).join('.')
    : props.upload.filename

  return runtimeConfig.public.pruvious.uploadsBase + props.upload.directory + basename + '_f2aVO32qKg.webp'
})
</script>
