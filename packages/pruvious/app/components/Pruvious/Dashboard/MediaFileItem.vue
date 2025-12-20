<template>
  <div class="p-media-file-item">
    <NuxtLink
      :to="link"
      @click.stop
      class="p-media-file-item-button pui-raw"
      :class="{ 'p-media-file-item-button-disabled': upload.isLocked }"
    >
      <Icon :name="`tabler:${icon}`" mode="svg" class="p-media-file-item-icon" />
      <span class="p-media-file-size">{{ formattedSize }}</span>
    </NuxtLink>

    <PUIButton
      v-if="upload.isLocked"
      v-pui-tooltip="
        __(
          'pruvious-dashboard',
          'This file is temporarily locked and cannot be deleted or modified because an upload is in progress or a system operation is running.',
        )
      "
      :size="-3"
      is="span"
      variant="accent"
      class="p-media-file-locked"
    >
      <Icon mode="svg" name="tabler:lock" />
    </PUIButton>

    <PruviousDashboardMediaItemDetails
      v-if="isDetailsPopupVisible"
      :resolvedPermissions="resolvedPermissions"
      :state="state"
      :upload="upload"
      @close="$event().then(closeDetailsPopup)"
      @deselect="$emit('deselect', $event)"
      ref="detailsPopup"
    />
  </div>
</template>

<script lang="ts" setup>
import {
  __,
  type DashboardMediaLibraryState,
  type ResolvedCollectionRecordPermissions,
  type UploadItem,
} from '#pruvious/client'
import { formatBytes, omit } from '@pruvious/utils'
import { stringifyQuery } from 'ufo'

const props = defineProps({
  upload: {
    type: Object as PropType<UploadItem>,
    required: true,
  },
  state: {
    type: Object as PropType<DashboardMediaLibraryState>,
    required: true,
  },
  resolvedPermissions: {
    type: Object as PropType<ResolvedCollectionRecordPermissions>,
  },
})

const emit = defineEmits<{
  deselect: [upload: UploadItem]
}>()

const route = useRoute()
const detailsPopup = useTemplateRef('detailsPopup')
const formattedSize = computed(() => formatBytes(props.upload.size))
const isDetailsPopupVisible = ref(false)
const link = computed(() => `${route.path}?${stringifyQuery({ ...route.query, details: props.upload.id })}`)

const icon = computed(() => {
  if (props.upload.category === 'image') {
    return 'photo'
  } else if (props.upload.category === 'audio') {
    return 'file-music'
  } else if (props.upload.category === 'video') {
    return 'video'
  } else if (props.upload.mime === 'text/css') {
    return 'file-type-css'
  } else if (props.upload.mime === 'text/csv') {
    return 'file-type-csv'
  } else if (props.upload.mime === 'application/msword') {
    return 'file-type-doc'
  } else if (props.upload.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'file-type-docx'
  } else if (props.upload.mime === 'text/html') {
    return 'file-type-html'
  } else if (props.upload.mime === 'application/javascript') {
    return 'file-type-js'
  } else if (props.upload.mime === 'text/jsx') {
    return 'file-type-jsx'
  } else if (props.upload.mime === 'application/pdf') {
    return 'file-type-pdf'
  } else if (props.upload.mime === 'application/php') {
    return 'file-type-php'
  } else if (props.upload.mime === 'application/vnd.ms-powerpoint') {
    return 'file-type-ppt'
  } else if (props.upload.mime === 'application/x-rust') {
    return 'file-type-rs'
  } else if (props.upload.mime === 'application/sql') {
    return 'file-type-sql'
  } else if (props.upload.mime === 'application/typescript') {
    return 'file-type-ts'
  } else if (props.upload.mime === 'text/tsx') {
    return 'file-type-tsx'
  } else if (props.upload.mime === 'text/plain') {
    return 'file-type-txt'
  } else if (props.upload.mime === 'application/vue') {
    return 'file-type-vue'
  } else if (props.upload.mime === 'application/vnd.ms-excel') {
    return 'file-type-xls'
  } else if (props.upload.mime === 'application/zip') {
    return 'file-type-zip'
  } else if (props.upload.category === 'archive') {
    return 'file-zip'
  } else if (props.upload.category === 'code') {
    return 'file-code'
  } else if (props.upload.category === 'font') {
    return 'file-typography'
  } else if (props.upload.category === '3d') {
    return 'file-3d'
  } else if (props.upload.category === 'data') {
    return 'file-description'
  } else if (props.upload.category === 'system') {
    return 'file-digit'
  } else if (props.upload.category === 'text') {
    return 'file-text'
  } else {
    return 'file'
  }
})

watch(
  () => route.query,
  () => {
    const id = route.query.details ? Number(route.query.details) : null
    if (id === props.upload.id && !isDetailsPopupVisible.value) {
      isDetailsPopupVisible.value = true
    } else if (id !== props.upload.id && isDetailsPopupVisible.value) {
      detailsPopup.value?.close(true).then(() => (isDetailsPopupVisible.value = false))
    }
  },
  { immediate: true },
)

async function closeDetailsPopup() {
  return navigateTo({ path: route.path, query: omit(route.query, ['details']) })
}
</script>

<style scoped>
.p-media-file-item {
  aspect-ratio: 1;
}

.p-media-file-item-button {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: hsl(var(--pui-background));
  border: 1px solid hsl(var(--pui-border));
  border-radius: var(--pui-radius);
  color: hsl(var(--pui-foreground));
  transition: var(--pui-transition);
  transition-property: background-color, border-color, color;
}

.p-media-file-item-button-disabled {
  pointer-events: none;
}

.p-media-file-item-icon {
  pointer-events: none;
  font-size: 1.75rem;
}

.p-media-file-item-icon :deep([stroke]) {
  stroke-width: 1;
}

.p-media-file-size {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  pointer-events: none;
  font-size: 0.75rem;
  line-height: 1rem;
  color: hsl(var(--pui-muted-foreground));
}

.p-media-file-locked {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  cursor: help;
}
</style>

<style>
.p-media-item-selected .p-media-file-item-button:not(.p-media-file-item-button-disabled),
.p-media-item-box:hover .p-media-file-item-button:not(.p-media-file-item-button-disabled),
.p-media-item-box:focus-within .p-media-file-item-button:not(.p-media-file-item-button-disabled),
.p-media-file-item-highlighted .p-media-file-item-button:not(.p-media-file-item-button-disabled) {
  background-color: hsl(var(--pui-card));
  color: hsl(var(--pui-card-foreground));
}

.p-media-item-selected .p-media-file-item-button {
  border-color: hsl(var(--pui-accent));
}
</style>
