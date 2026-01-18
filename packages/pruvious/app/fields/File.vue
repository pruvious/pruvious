<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <div v-if="canRead" class="pui-row">
      <template v-if="modelValue">
        <PUIButton
          v-if="file"
          v-pui-tooltip="file.path"
          :to="`${dashboardBasePath}media${dir === '/' ? '' : dir}?details=${file.id}`"
          @click="
            (event: MouseEvent) => {
              if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
                event.preventDefault()
                isDetailsPopupVisible = true
              }
            }
          "
          variant="outline"
          class="pui-shrink"
        >
          <PruviousDashboardMediaFileName :path="file.path" showTitle />
        </PUIButton>

        <PUIButton v-else-if="!loadingFile" disabled variant="outline" class="pui-shrink">
          <span class="pui-truncate">{{ __('pruvious-dashboard', 'File not found') + ` (#${modelValue})` }}</span>
        </PUIButton>

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
      :id="`${id}-file-input`"
      @change="uploadFile()"
      hidden
      ref="fileInput"
      type="file"
    />

    <PruviousDashboardMediaLibraryPopup
      v-model:isVisible="isMediaLibraryPopupVisible"
      :initialFilePath="file?.path"
      :label="label"
      :modelValue="modelValue"
      :validation="validation"
      @update:isVisible="!$event && (isMediaLibraryPopupVisible = false)"
      @update:modelValue="
        (value) => {
          $emit('update:modelValue', value as number | null)
          $emit('commit', value as number | null)
        }
      "
      selectionMode="single"
    />

    <PruviousDashboardMediaItemDetailsPopup
      v-if="isDetailsPopupVisible && file"
      :resolvedPermissions="resolvedPermissions"
      :upload="file"
      @close="$event().then(() => (isDetailsPopupVisible = false))"
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
import { __, hasPermission } from '#pruvious/app'
import {
  dashboardBasePath,
  maybeTranslate,
  mediaCategories,
  resolveFieldLabel,
  selectFrom,
  upload,
  useCollectionRecordPermissions,
  usePruviousDashboard,
  type UploadItem,
} from '#pruvious/dashboard'
import type { MediaCategory, SerializableFieldOptions } from '#pruvious/server'
import { puiToast } from '@pruvious/ui/pui/toast'
import { isDefined, parseBytes, toArray } from '@pruvious/utils'
import { computedAsync } from '@vueuse/core'
import { dirname } from 'pathe'
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
    type: Object as PropType<SerializableFieldOptions<'file'>>,
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
  : __('pruvious-dashboard', 'Select file')
const fileInput = useTemplateRef('fileInput')
const dashboard = usePruviousDashboard()
const uploadsCollection = { name: 'Uploads' as const, definition: dashboard.value!.collections.Uploads! }
const isMediaLibraryPopupVisible = ref(false)
const isDetailsPopupVisible = ref(false)
const canRead = hasPermission('collection:uploads:read')
const canCreate = hasPermission('collection:uploads:create')
const loadingFile = ref(false)
const file = ref<UploadItem | null>(await fetchFileData())
const dir = computed(() => dirname(file.value?.path ?? ''))
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
