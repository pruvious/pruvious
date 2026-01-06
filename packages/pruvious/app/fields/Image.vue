<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <div v-if="canRead" class="pui-row">
      <template v-if="modelValue">
        <div class="p-image-preview p-media-item-box">
          <PruviousDashboardMediaImageItem
            v-if="file && file.category === 'image' && displayableImageTypes[file.mime]"
            :linkHandler="() => (isDetailsPopupVisible = true)"
            :upload="file"
            compact
          />
          <PruviousDashboardMediaFileItem
            v-else-if="file && !loadingFile"
            :linkHandler="() => (isDetailsPopupVisible = true)"
            :upload="file"
            compact
          />
          <div v-else-if="!loadingFile" class="p-image-preview-error">
            <Icon mode="svg" name="tabler:photo-off" />
          </div>
        </div>

        <div class="p-image-details">
          <div v-if="file">
            <span v-pui-tooltip="{ content: file.path, offset: [0, 6] }" class="p-image-title">
              <span :title="filename" class="pui-flex">
                <span class="pui-truncate">
                  <span>{{ filenameWithoutExtension }}</span>
                  <span v-if="extensionWithoutDot" class="pui-muted">.</span>
                </span>
                <span v-if="extensionWithoutDot" class="pui-shrink-0 pui-muted">{{ extensionWithoutDot }}</span>
              </span>
            </span>
          </div>

          <div v-else-if="!loadingFile" class="pui-muted">
            <span class="pui-truncate">{{ __('pruvious-dashboard', 'Image not found') + ` (#${modelValue})` }}</span>
          </div>

          <component
            :is="resolvedPermissions?.canUpdate ? 'button' : 'div'"
            @click="
              () => {
                if (resolvedPermissions?.canUpdate) {
                  defaultDetailsTab = 'description'
                  isDetailsPopupVisible = true
                }
              }
            "
            class="p-image-description pui-truncate"
          >
            <span :title="file?.description[language]" class="pui-truncate">
              {{ file?.description[language] || __('pruvious-dashboard', 'No description') }}
            </span>
            <Icon v-if="resolvedPermissions?.canUpdate" mode="svg" name="tabler:pencil" />
          </component>

          <div class="pui-row">
            <PUIButton
              v-pui-tooltip="__('pruvious-dashboard', 'Replace')"
              :disabled="disabled"
              @click="isMediaLibraryPopupVisible = true"
              variant="outline"
            >
              <Icon mode="svg" name="tabler:replace" />
            </PUIButton>

            <PUIButton
              v-pui-tooltip="__('pruvious-dashboard', 'Clear selection')"
              :disabled="disabled"
              @click="
                () => {
                  isMediaLibraryPopupVisible = false
                  $emit('update:modelValue', null)
                  $emit('commit', null)
                }
              "
              variant="outline"
            >
              <Icon mode="svg" name="tabler:x" />
            </PUIButton>
          </div>
        </div>
      </template>

      <template v-else>
        <PUIButton :disabled="disabled" @click="isMediaLibraryPopupVisible = true" variant="outline" class="pui-shrink">
          <span class="pui-truncate">{{ selectLabel }}</span>
        </PUIButton>

        <PUIButton
          v-if="canCreate && !disabled"
          v-pui-tooltip="__('pruvious-dashboard', 'Upload')"
          @click.stop="fileInput?.click()"
          variant="outline"
        >
          <Icon mode="svg" name="tabler:upload" />
        </PUIButton>
      </template>
    </div>

    <div v-else>
      <p>{{ __('pruvious-dashboard', 'You do not have permission to access the media library.') }}</p>
    </div>

    <input
      :accept="allowedTypes?.join(',')"
      @change="uploadFile()"
      hidden
      id="p-file-input"
      ref="fileInput"
      type="file"
    />

    <PruviousDashboardMediaLibraryPopup
      v-model:isVisible="isMediaLibraryPopupVisible"
      :initialFilePath="file?.path"
      :label="label"
      :modelValue="modelValue"
      :selectLabel="selectLabel"
      :validation="validation"
      @update:isVisible="!$event && (isMediaLibraryPopupVisible = false)"
      @update:modelValue="
        (value) => {
          $emit('update:modelValue', value as number | null)
          $emit('commit', value as number | null)
        }
      "
      filterCategory="image"
      selectionMode="single"
    />

    <PruviousDashboardMediaItemDetailsPopup
      v-if="isDetailsPopupVisible && file"
      :defaultTab="defaultDetailsTab"
      :resolvedPermissions="resolvedPermissions"
      :upload="file"
      @close="
        $event().then(() => {
          isDetailsPopupVisible = false
          defaultDetailsTab = 'details'
        })
      "
      @data="file = $event"
      @deselect="
        () => {
          $emit('update:modelValue', null)
          $emit('commit', null)
        }
      "
    />

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, hasPermission, primaryLanguage } from '#pruvious/app'
import {
  displayableImageTypes,
  maybeTranslate,
  mediaCategories,
  resolveFieldLabel,
  selectFrom,
  upload,
  useCollectionRecordPermissions,
  useDashboardContentLanguage,
  usePruviousDashboard,
  type UploadItem,
} from '#pruvious/dashboard'
import type { MediaCategory, SerializableFieldOptions } from '#pruvious/server'
import { puiToast } from '@pruvious/ui/pui/toast'
import { isDefined, parseBytes, toArray } from '@pruvious/utils'
import { computedAsync } from '@vueuse/core'
import { basename, extname } from 'pathe'
import { validateUpload, type UploadFieldValidation } from '../utils/pruvious/dashboard/upload-fields'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: [Number, null],
    required: true,
  },

  /**
   * The field name defined in a collection, singleton, or block.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'image'>>,
    required: true,
  },

  /**
   * The field path, expressed in dot notation, represents the exact location of the field within the current data structure.
   */
  path: {
    type: String,
    required: true,
  },

  /**
   * Represents an error message that can be displayed to the user.
   */
  error: {
    type: String,
  },

  /**
   * Controls whether the field is disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },

  /**
   * Specifies whether the current data record is translatable.
   *
   * @default false
   */
  translatable: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates if the field value remains synchronized between all translations of the current data record.
   *
   * @default false
   */
  synced: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  'commit': [value: number | null]
  'update:modelValue': [value: number | null]
}>()

provide('openLinksInNewTab', true)

const id = useId()
const label = resolveFieldLabel(props.options.ui.label, props.name)
const selectLabel = isDefined(props.options.ui.selectLabel)
  ? maybeTranslate(props.options.ui.selectLabel)
  : __('pruvious-dashboard', 'Select image')
const fileInput = useTemplateRef('fileInput')
const dashboard = usePruviousDashboard()
const uploadsCollection = { name: 'Uploads' as const, definition: dashboard.value!.collections.Uploads! }
const contentLanguage = useDashboardContentLanguage()
const language = computed(() => (props.translatable ? contentLanguage.value : primaryLanguage))
const isMediaLibraryPopupVisible = ref(false)
const isDetailsPopupVisible = ref(false)
const defaultDetailsTab = ref<'details' | 'description' | 'variants'>('details')
const canRead = hasPermission('collection:uploads:read')
const canCreate = hasPermission('collection:uploads:create')
const loadingFile = ref(false)
const file = ref<UploadItem | null>(await fetchFileData())
const filename = computed(() => basename(file.value?.path ?? ''))
const extension = computed(() => extname(filename.value))
const filenameWithoutExtension = computed(() =>
  extension.value ? filename.value.slice(0, -extension.value.length) : filename.value,
)
const extensionWithoutDot = computed(() =>
  extension.value.startsWith('.') ? extension.value.slice(1) : extension.value,
)
const allowedTypes = computed(() => {
  const mimes = toArray(props.options.allowedTypes)
    .map((v) =>
      v === '*' || v.includes('/') ? v : mediaCategories[v as MediaCategory] ? mediaCategories[v as MediaCategory] : v,
    )
    .flat()
  return mimes.includes('*') ? undefined : mimes
})
const validation = computed<UploadFieldValidation>(() => ({
  allowedMimes: allowedTypes.value,
  minBytes: parseBytes(props.options.minSize),
  maxBytes: parseBytes(props.options.maxSize),
  minImageWIdth: props.options.minWidth,
  maxImageWidth: props.options.maxWidth,
  minImageHeight: props.options.minHeight,
  maxImageHeight: props.options.maxHeight,
}))
const { resolver: permissionsResolver } = useCollectionRecordPermissions(uploadsCollection)
const resolvedPermissions = computedAsync(() =>
  canRead && file.value
    ? permissionsResolver(file.value.id, {
        author: uploadsCollection.definition.authorField ? file.value!.author : undefined,
        editors: uploadsCollection.definition.editorsField ? file.value!.editors : undefined,
      })
    : undefined,
)

watch(
  () => props.modelValue,
  async () => {
    file.value = await fetchFileData()
  },
  { immediate: true },
)

async function fetchFileData(): Promise<UploadItem | null> {
  if (canRead && props.modelValue) {
    loadingFile.value = true

    return selectFrom('Uploads')
      .where('id', '=', props.modelValue)
      .cache(3000)
      .first()
      .then((res) => (res.success ? res.data : null))
      .finally(() => {
        loadingFile.value = false
      })
  }

  return null
}

async function uploadFile() {
  if (fileInput.value?.files && fileInput.value.files.length === 1) {
    const result = await upload(fileInput.value.files[0]!)

    if (result.success && result.data) {
      const disabled = validateUpload(result.data, validation.value)

      if (disabled.value) {
        puiToast(disabled.reason, { type: 'error' })
      } else {
        emit('update:modelValue', result.data.id)
        emit('commit', result.data.id)
      }
    }

    fileInput.value.value = ''
  }
}
</script>

<style scoped>
.p-image-preview {
  flex-shrink: 0;
  position: relative;
  width: 6.5rem;
  aspect-ratio: 1;
}

.p-image-preview-error {
  display: flex;
  width: 100%;
  aspect-ratio: 1;
  background-color: hsl(var(--pui-background));
  border: 1px solid hsla(var(--pui-border));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  font-size: 1.25rem;
  color: hsla(var(--pui-muted-foreground));
}

.p-image-preview-error > * {
  margin: auto;
}

.p-image-details {
  margin-top: auto;
}

.p-image-details > * + * {
  margin-top: 0.5rem;
}

.p-image-title {
  display: inline-block;
  max-width: 100%;
}

.p-image-description {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  max-width: 100%;
  margin-bottom: 0.375rem;
  font-size: 0.8125rem;
  color: hsla(var(--pui-muted-foreground));
  text-decoration: none;
  transition: var(--pui-transition);
  transition-property: box-shadow, color;
}

.p-image-description svg,
.p-image-description svg {
  flex-shrink: 0;
  display: none;
  font-size: 0.875rem;
}

button.p-image-description:hover,
button.p-image-description:focus {
  color: hsla(var(--pui-foreground));
}

button.p-image-description:hover svg,
button.p-image-description:focus svg {
  display: inline-block;
}
</style>
