<template>
  <div class="p-media-image-item">
    <NuxtLink :to="link" class="p-media-image-item-button pui-raw">
      <img :alt="upload.description[language]" :src="thumbnailURL" class="p-media-image-thumbnail" />
      <span class="p-media-image-dimensions">{{ upload.imageWidth }} x {{ upload.imageHeight }}</span>
      <span class="p-media-image-size">{{ formattedSize }}</span>
    </NuxtLink>

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
  resolveUploadPath,
  useLanguage,
  type DashboardMediaLibraryState,
  type ResolvedCollectionRecordPermissions,
  type UploadItem,
} from '#pruvious/client'
import { formatBytes, omit } from '@pruvious/utils'
import { extname } from 'pathe'
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
const language = useLanguage()
const detailsPopup = useTemplateRef('detailsPopup')
const formattedSize = computed(() => formatBytes(props.upload.size))
const thumbnailURL = computed(() => {
  if (props.upload.imageWidth <= 320 && props.upload.imageHeight <= 320) {
    return resolveUploadPath(props.upload.path)
  }
  const ext = extname(props.upload.path)
  const oext = ext ? '_oext' + extname(props.upload.path).slice(1) : ''
  return resolveUploadPath(props.upload.path.slice(0, -ext.length) + oext + '_w320_h320_contain.webp')
})
const isDetailsPopupVisible = ref(false)
const link = computed(() => `${route.path}?${stringifyQuery({ ...route.query, details: props.upload.id })}`)

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
.p-media-image-item {
  aspect-ratio: 1;
}

.p-media-image-item-button {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA5SURBVHgB7dGxEQAgDELRxDHYfzVYIzoChYXnQf3vNTTJKWMAnKxWXV7AgC+APWdOKMnJckrAP8ENTFgK0Z64q28AAAAASUVORK5CYII=');
  background-color: hsl(var(--pui-background));
  border: 1px solid hsl(var(--pui-border));
  border-radius: var(--pui-radius);
  color: hsl(var(--pui-foreground));
  transition: var(--pui-transition);
  transition-property: background-color, border-color, color;
}

.dark .p-media-image-item-button {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA/SURBVHgB7dOhEQAgDAPAwGFrmAEGYP+dMB0AVoio6PUSnXuTS1v7PBBxv0wNHcERKDADONgHmE2qp1EElgQ/ufgHd9nZw0oAAAAASUVORK5CYII=');
}

.p-media-image-item-button::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
  background-color: hsl(var(--pui-card));
  opacity: 0;
  transition: var(--pui-transition);
  transition-property: opacity;
}

.p-media-image-item-icon {
  pointer-events: none;
  font-size: 1.75rem;
}

.p-media-image-item-icon :deep([stroke]) {
  stroke-width: 1;
}

.p-media-image-thumbnail {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  pointer-events: none;
  transform: translate3d(-50%, -50%, 0);
  transition: var(--pui-transition);
  transition-property: max-height;
}

.p-media-image-dimensions,
.p-media-image-size {
  position: absolute;
  padding: 0 0.1875rem;
  font-size: 0.75rem;
  line-height: 1rem;
  pointer-events: none;
  background-color: hsl(var(--pui-muted));
  border-radius: 0.25rem;
  color: hsl(var(--pui-muted-foreground));
}

.p-media-image-dimensions {
  top: 0.5rem;
  left: 0.5rem;
}

.p-media-image-size {
  bottom: 0.5rem;
  right: 0.5rem;
}
</style>

<style>
.p-media-item-selected .p-media-image-item-button,
.p-media-item-box:hover .p-media-image-item-button,
.p-media-item-box:focus-within .p-media-image-item-button,
.p-media-image-item-highlighted .p-media-image-item-button {
  background-color: hsl(var(--pui-card));
  color: hsl(var(--pui-card-foreground));
}

.p-media-item-selected .p-media-image-item-button {
  border-color: hsl(var(--pui-accent));
}

.p-media-item-selected .p-media-image-item-button::before,
.p-media-item-box:hover .p-media-image-item-button::before,
.p-media-item-box:focus-within .p-media-image-item-button::before,
.p-media-image-item-highlighted .p-media-image-item-button::before {
  opacity: 1;
}

.p-media-item-selected .p-media-image-thumbnail,
.p-media-item-box:hover .p-media-image-thumbnail,
.p-media-item-box:focus-within .p-media-image-thumbnail,
.p-media-image-item-highlighted .p-media-image-thumbnail {
  max-height: 50%;
}
</style>
