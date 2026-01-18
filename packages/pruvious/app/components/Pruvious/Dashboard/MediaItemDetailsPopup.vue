<template>
  <PUIPopup :size="-1" :width="hasPreview ? '64rem' : '32rem'" @close="close()" fullHeight="auto" ref="popup">
    <template #header>
      <div class="pui-row">
        <PruviousDashboardMediaFileName :path="upload.path" showTitle class="pui-medium" />
        <PUIButton
          :size="-2"
          :title="__('pruvious-dashboard', 'Close')"
          @click="close()"
          variant="ghost"
          class="pui-ml-auto"
        >
          <Icon mode="svg" name="tabler:x" />
        </PUIButton>
      </div>
    </template>

    <div class="p-media-item-details" :class="{ 'p-media-item-details-with-preview': hasPreview }">
      <div
        v-if="upload.category === 'image' && displayableImageTypes[upload.mime]"
        class="p-media-item-details-preview"
        :class="{ 'p-media-item-details-preview-centered': upload.imageWidth <= 480 && upload.imageHeight <= 480 }"
      >
        <NuxtLink :to="resolvedPath" target="_blank" class="p-media-item-details-preview-image-link">
          <img :alt="upload.description[language]" :src="resolvedPath" />
        </NuxtLink>
      </div>

      <div
        v-else-if="upload.category === 'video' && playableVideoTypes[upload.mime]"
        class="p-media-item-details-preview"
      >
        <video :src="resolvedPath" controls playsinline></video>
      </div>

      <div class="p-media-item-details-fields">
        <PUITabs
          :active="defaultTab"
          :list="[
            { name: 'details', label: __('pruvious-dashboard', 'Details') },
            {
              name: 'description',
              label: __('pruvious-dashboard', 'Description'),
              bubble: error
                ? {
                    content: '1',
                    tooltip: __('pruvious-dashboard', 'Found $count $errors', { count: 1 }),
                    variant: 'destructive',
                  }
                : undefined,
            },
            ...(upload.category === 'image' && optimizableImageTypes[upload.mime]
              ? [{ name: 'variants', label: __('pruvious-dashboard', 'Variants') }]
              : []),
          ]"
        >
          <PUITab name="details">
            <div class="p-media-item-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Uploaded on') }}</span>
              </PUIFieldLabel>
              <div>
                {{ dayjsFormatDateTime(upload.createdAt) }}
                <span class="pui-muted">({{ dayjsRelative(upload.createdAt) }})</span>
              </div>
            </div>

            <div v-if="upload.author" class="p-media-item-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Uploaded by') }}</span>
              </PUIFieldLabel>
              <NuxtLink
                v-if="author"
                :title="__('pruvious-dashboard', 'Show details')"
                :to="dashboardBasePath + 'collections/users/' + upload.author"
                target="_blank"
              >
                {{ author.firstName }} {{ author.lastName }}
                <span class="pui-muted">({{ author.email }})</span>
              </NuxtLink>
              <div v-else>
                {{ upload.author }}
                <span class="pui-muted">({{ __('pruvious-dashboard', 'user ID') }})</span>
              </div>
            </div>

            <div class="p-media-item-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'File type') }}</span>
              </PUIFieldLabel>
              <div>
                {{ upload.mime }}
                <span v-if="upload.category" class="pui-muted">
                  ({{ __('pruvious-dashboard', `cat:${upload.category}`) }})
                </span>
              </div>
            </div>

            <div class="p-media-item-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'File size') }}</span>
              </PUIFieldLabel>
              <div>
                {{ formatBytes(upload.size) }}
                <span class="pui-muted">({{ upload.size }} bytes)</span>
              </div>
            </div>

            <div
              v-if="upload.category === 'image' && optimizableImageTypes[upload.mime]"
              class="p-media-item-details-field"
            >
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'Dimensions') }}</span>
              </PUIFieldLabel>
              <div>
                {{ upload.imageWidth }} x {{ upload.imageHeight }}
                <span class="pui-muted">{{ __('pruvious-dashboard', 'pixels') }}</span>
              </div>
            </div>

            <div class="p-media-item-details-field">
              <PUIFieldLabel>
                <span class="pui-label">{{ __('pruvious-dashboard', 'File URL') }}</span>
              </PUIFieldLabel>
              <PUICode
                :code="locationOrigin + resolvedPath"
                :copiedTooltip="__('pruvious-dashboard', 'Copied')"
                :copyTooltip="__('pruvious-dashboard', 'Copy to clipboard')"
                language="markdown"
              />
            </div>
          </PUITab>

          <PUITab name="description">
            <TranslatableTextField
              v-model="description"
              :disabled="!resolvedPermissions?.canUpdate"
              :error="error"
              :options="dashboard!.collections.Uploads!.fields.description"
              @commit="history.push($event)"
              name="upload-description"
              path="description"
            />
          </PUITab>

          <PUITab v-if="upload.category === 'image' && optimizableImageTypes[upload.mime]" name="variants">
            <div class="p-media-item-details-variants">
              <div v-for="options of variants" class="p-media-item-details-variant">
                <NuxtLink :to="options.resolvedPath" target="_blank" class="p-media-item-details-variant-preview">
                  <img v-if="options.size" :alt="`Variant: ${options.label}`" :src="options.resolvedPath" />
                  <Icon v-else mode="svg" name="tabler:photo-off" />
                </NuxtLink>
                <div class="p-media-item-details-variant-info">
                  <div>
                    <strong>{{ options.label }}</strong>
                  </div>
                  <div>
                    {{ options.options.format }}
                    <span class="pui-muted">({{ __('pruvious-dashboard', options.options.fit) }})</span>
                  </div>
                  <div v-if="options.size">
                    {{ formatBytes(options.size) }}
                    <span class="pui-muted">({{ options.size }} bytes)</span>
                  </div>
                  <div v-if="options.width && options.height">
                    {{ options.width }} x {{ options.height }}
                    <span class="pui-muted">{{ __('pruvious-dashboard', 'pixels') }}</span>
                  </div>
                  <PUIButton
                    v-if="!options.size"
                    v-pui-tooltip="__('pruvious-dashboard', 'Recreate')"
                    :disabled="isSubmitting"
                    :size="-3"
                    @click="recreateVariant(options.path)"
                    variant="outline"
                    class="p-media-item-details-variant-button"
                  >
                    <Icon mode="svg" name="tabler:restore" />
                  </PUIButton>
                </div>
              </div>
            </div>
          </PUITab>
        </PUITabs>
      </div>
    </div>

    <template #footer>
      <div class="pui-row">
        <PUIButton v-if="resolvedPermissions?.canDelete" @click="onDelete" destructiveHover variant="outline">
          <span>{{ __('pruvious-dashboard', 'Delete') }}</span>
          <Icon mode="svg" name="tabler:trash-x" />
        </PUIButton>

        <PUIButton v-if="history.isDirty.value" @click="saveData()" variant="primary" class="pui-ml-auto">
          {{ __('pruvious-dashboard', 'Save') }}
        </PUIButton>

        <PUIButton v-else @click="close()" variant="outline" class="pui-ml-auto">
          {{ __('pruvious-dashboard', 'Close') }}
        </PUIButton>
      </div>
    </template>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { __, hasPermission, useLanguage } from '#pruvious/app'
import {
  $pfetchDashboard,
  dashboardBasePath,
  displayableImageTypes,
  fieldComponents,
  History,
  imageVariants,
  optimizableImageTypes,
  playableVideoTypes,
  resolveUploadPath,
  selectFrom,
  unsavedChanges,
  updateUpload,
  usePruviousDashboard,
  type ResolvedCollectionRecordPermissions,
  type UploadItem,
} from '#pruvious/dashboard'
import { dayjsFormatDateTime, dayjsRelative } from '#pruvious/dashboard/dayjs'
import type { DeleteUploadResult, ImageVariantOptions } from '#pruvious/server'
import { puiDialog } from '@pruvious/ui/pui/dialog'
import { usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import { puiQueueToast, puiToast } from '@pruvious/ui/pui/toast'
import { blurActiveElement, formatBytes, lockAndLoad } from '@pruvious/utils'
import { extname } from 'pathe'

interface Variant {
  label: string
  path: string
  resolvedPath: string
  size: number
  width: number
  height: number
  options: Required<ImageVariantOptions>
}

const props = defineProps({
  upload: {
    type: Object as PropType<UploadItem>,
    required: true,
  },
  resolvedPermissions: {
    type: Object as PropType<ResolvedCollectionRecordPermissions>,
  },
  defaultTab: {
    type: String as PropType<'details' | 'description' | 'variants'>,
    default: 'details',
  },
})

const emit = defineEmits<{
  close: [close: () => Promise<void>]
  deselect: [upload: UploadItem]
  data: [upload: UploadItem]
}>()

defineExpose({ close })

const language = useLanguage()
const runtimeConfig = useRuntimeConfig()
const dashboard = usePruviousDashboard()
const popup = useTemplateRef('popup')
const locationOrigin = import.meta.client ? window.location.origin : ''
const resolvedPath = computed(() => resolveUploadPath(props.upload.path))
const TranslatableTextField = fieldComponents.translatableText?.()
const isSubmitting = ref(false)
const { listen, isListening } = usePUIHotkeys({
  allowInOverlays: true,
  target: () => popup.value?.root,
  listen: false,
})
const description = ref(props.upload.description)
const history = new History().push(props.upload.description)
const error = ref('')
const author = ref<{ firstName: string; lastName: string; email: string } | false>(
  hasPermission('collection:users:read') && props.upload.author
    ? await selectFrom('Users')
        .select(['firstName', 'lastName', 'email'])
        .where('id', '=', props.upload.author)
        .first()
        .then(({ data }) => data ?? false)
    : false,
)
const hasPreview = computed(
  () =>
    (props.upload.category === 'image' && displayableImageTypes[props.upload.mime]) ||
    (props.upload.category === 'video' && playableVideoTypes[props.upload.mime]),
)
const variants = ref<Variant[]>([])

onMounted(async () => {
  setTimeout(() => {
    isListening.value = true
    listen('save', (e) => {
      e.preventDefault()
      blurActiveElement()
      setTimeout(saveData)
    })
  })

  loadVariants().then((loadedVariants) => {
    variants.value = loadedVariants
  })
})

const saveData = lockAndLoad(isSubmitting, async () => {
  const result = await updateUpload(props.upload.path, { description: description.value })

  if (result.success) {
    if (result.data.length) {
      error.value = ''
      emit('data', result.data[0]!)
      puiQueueToast(__('pruvious-dashboard', 'Saved'), { type: 'success' })
    } else {
      puiQueueToast(__('pruvious-dashboard', 'Record not found'), { type: 'error' })
    }
    close(true)
  } else {
    error.value =
      result.runtimeError || result.inputErrors?.[0] || __('pruvious-dashboard', 'An unknown error occurred')
    puiQueueToast(__('pruvious-dashboard', 'Found $count $errors', { count: 1 }), { type: 'error' })
  }
})

async function onDelete() {
  const action = await puiDialog({
    content: __('pruvious-dashboard', 'Are you sure you want to delete this $uploadType?', { uploadType: 'file' }),
    actions: [
      { name: 'cancel', label: __('pruvious-dashboard', 'Cancel') },
      { name: 'delete', label: __('pruvious-dashboard', 'Delete'), variant: 'destructive' },
    ],
  })

  if (action === 'delete') {
    const results = (await $pfetchDashboard(
      runtimeConfig.public.pruvious.apiBasePath + 'uploads/path' + props.upload.path,
      { method: 'delete' },
    ).catch(() => null)) as DeleteUploadResult<any, false>[]

    if (results[0]?.success) {
      window.dispatchEvent(new CustomEvent('pruvious:delete-upload-complete'))
      puiToast(__('pruvious-dashboard', 'File deleted'), {
        type: 'success',
      })
      emit('deselect', props.upload)
      close()
    } else {
      puiToast(__('pruvious-dashboard', 'No uploads were deleted'))
    }
  }
}

async function close(force = false) {
  if (popup.value && (force || !history.isDirty.value || (await unsavedChanges.prompt?.()))) {
    history.clear()
    emit('close', popup.value.close)
  }
}

async function loadVariants() {
  const promises: Array<Promise<Variant>> = []

  if (props.upload.category === 'image' && optimizableImageTypes[props.upload.mime]) {
    for (const [key, options] of Object.entries(imageVariants)) {
      const ext = extname(props.upload.path)
      const oext = ext ? '_oext' + extname(props.upload.path).slice(1) : ''
      const path = props.upload.path.slice(0, -ext.length) + oext + options.suffix
      const resolvedPath = resolveUploadPath(path)
      promises.push(
        $fetch<Blob>(resolvedPath)
          .then(async (blob) => ({
            label: key,
            path,
            resolvedPath,
            size: blob.size,
            options,
            ...(await getImageDimensions(blob)),
          }))
          .catch(() => ({
            label: key,
            path,
            resolvedPath,
            size: 0,
            width: 0,
            height: 0,
            options,
          })),
      )
    }
  }

  return Promise.all(promises)
}

async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ width: 0, height: 0 })
    }
    img.src = url
  })
}

const recreateVariant = lockAndLoad(isSubmitting, async (path: string) =>
  $pfetchDashboard(runtimeConfig.public.pruvious.apiBasePath + 'uploads/optimize-image' + path)
    .then(async () => {
      puiToast(__('pruvious-dashboard', 'Image variant recreated successfully'), { type: 'success' })
      variants.value = await loadVariants()
    })
    .catch(() => null),
)
</script>

<style scoped>
.p-media-item-details {
  display: flex;
  gap: 0.75rem;
}

.p-media-item-details-preview {
  flex: 1;
  width: 16rem;
}

.p-media-item-details-preview-centered {
  display: flex;
  justify-content: center;
  align-items: center;
}

.p-media-item-details-preview > * {
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid hsla(var(--pui-border));
  border-radius: calc(var(--pui-radius) - 0.125rem);
}

.p-media-item-details-preview * {
  display: block;
}

.p-media-item-details-preview-image-link {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA5SURBVHgB7dGxEQAgDELRxDHYfzVYIzoChYXnQf3vNTTJKWMAnKxWXV7AgC+APWdOKMnJckrAP8ENTFgK0Z64q28AAAAASUVORK5CYII=');
  background-color: hsl(var(--pui-background));
  transition: var(--pui-transition);
  transition-property: box-shadow;
}

.dark .p-media-item-details-preview-image-link {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA/SURBVHgB7dOhEQAgDAPAwGFrmAEGYP+dMB0AVoio6PUSnXuTS1v7PBBxv0wNHcERKDADONgHmE2qp1EElgQ/ufgHd9nZw0oAAAAASUVORK5CYII=');
}

.p-media-item-details-fields {
  flex-shrink: 0;
  width: 20rem;
}

.p-media-item-details-fields:only-child {
  width: 100%;
}

.p-media-item-details-fields :deep(.pui-tabs-content:not(:first-child)) {
  margin-top: 0.75rem;
}

.p-media-item-details-field a {
  text-decoration: none;
}

.p-media-item-details-field + .p-media-item-details-field {
  margin-top: 1rem;
}

.p-media-item-details-field :deep(.pui-field-label) {
  margin-bottom: 0.25em;
  color: hsl(var(--pui-muted-foreground));
}

.p-media-item-details-field :deep(.pui-code) {
  --pui-padding: 0.5rem;
  margin-top: 0.5em;
}

.p-media-item-details-variant {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.p-media-item-details-variant:not(:first-child) {
  margin-top: 0.75rem;
}

.p-media-item-details-variant-preview {
  display: flex;
  width: 6rem;
  height: 6rem;
  overflow: hidden;
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA5SURBVHgB7dGxEQAgDELRxDHYfzVYIzoChYXnQf3vNTTJKWMAnKxWXV7AgC+APWdOKMnJckrAP8ENTFgK0Z64q28AAAAASUVORK5CYII=');
  background-color: hsl(var(--pui-background));
  border: 1px solid hsla(var(--pui-border));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  font-size: 1.25rem;
  color: hsla(var(--pui-muted-foreground));
  transition: var(--pui-transition);
  transition-property: box-shadow;
}

.dark .p-media-item-details-variant-preview {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA/SURBVHgB7dOhEQAgDAPAwGFrmAEGYP+dMB0AVoio6PUSnXuTS1v7PBBxv0wNHcERKDADONgHmE2qp1EElgQ/ufgHd9nZw0oAAAAASUVORK5CYII=');
}

.p-media-item-details-variant-preview > * {
  max-width: 100%;
  max-height: 100%;
  margin: auto;
}

.p-media-item-details-variant-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  font-size: 0.8125rem;
}

.p-media-item-details-variant-info strong {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.6875rem;
}

.p-media-item-details-variant-button {
  margin-top: 0.25rem;
}

@media (max-width: 600px) {
  .p-media-item-details {
    flex-direction: column;
  }

  .p-media-item-details-preview,
  .p-media-item-details-fields {
    width: 100%;
  }
}
</style>
