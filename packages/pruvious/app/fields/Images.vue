<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel
      :id="`${id}--input`"
      :name="name"
      :options="options"
      :synced="synced"
      :translatable="translatable"
    />

    <div v-if="canRead" class="p-images pui-row">
      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'Media library')"
        :disabled="disabled"
        @click="isMediaLibraryPopupVisible = true"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:library-photo" />
      </PUIButton>

      <PUIDynamicChips
        :choicesResolver="choicesResolver"
        :disabled="disabled"
        :enforceUniqueItems="options.enforceUniqueItems"
        :error="!!error"
        :erroredItems="erroredItems"
        :id="id"
        :maxItems="options.maxItems"
        :minItems="options.minItems"
        :modelValue="modelValue"
        :name="path"
        :noResultsFoundLabel="__('pruvious-dashboard', 'No results found')"
        :placeholder="placeholder"
        :removeItemLabel="__('pruvious-dashboard', 'Remove')"
        :selectedChoicesResolver="selectedChoicesResolver"
        @dblclick="(id, event) => onDoubleClick(+id!, event)"
        @update:modelValue="
          (value: any) => {
            $emit('update:modelValue', value)
            $emit('commit', value)
          }
        "
        class="p-images-chips"
      >
        <template #label="{ choice }">
          <div
            v-pui-tooltip="choice.tooltip"
            :title="choice.label ?? String(choice.value)"
            class="pui-dynamic-chips-label"
          >
            <div class="p-images-preview p-media-item-box">
              <PruviousDashboardMediaImageItem
                v-if="
                  typeof choice.value === 'number' &&
                  files[choice.value] &&
                  files[choice.value] !== 'loading' &&
                  files[choice.value] !== 'error' &&
                  (files[choice.value] as UploadItem).category === 'image' &&
                  displayableImageTypes[(files[choice.value] as UploadItem).mime]
                "
                :upload="(files as Record<number, UploadItem>)[choice.value]!"
                compact
              />
              <PruviousDashboardMediaFileItem
                v-else-if="
                  typeof choice.value === 'number' &&
                  files[choice.value] &&
                  files[choice.value] !== 'loading' &&
                  files[choice.value] !== 'error'
                "
                :upload="(files as Record<number, UploadItem>)[choice.value]!"
                compact
              />
              <div
                v-else-if="typeof choice.value !== 'number' || files[choice.value] === 'error'"
                :title="__('pruvious-dashboard', 'Image not found') + ` (#${choice.value})`"
                class="p-images-preview-error"
              >
                <Icon mode="svg" name="tabler:photo-off" />
              </div>
            </div>
          </div>
        </template>

        <template #choice="{ choice }">
          <span class="p-images-choice">
            <img :alt="choice.detail" :src="choice.tooltip" class="p-images-choice-preview" />
            <span class="p-images-choice-text">
              <span class="pui-dynamic-chips-dropdown-item-label">{{ (choice.label ?? choice.value) || '-' }}</span>
              <span v-if="choice.detail !== undefined" class="pui-dynamic-chips-dropdown-item-detail">
                {{ choice.detail || '-' }}
              </span>
            </span>
          </span>
        </template>
      </PUIDynamicChips>

      <PUIButton
        v-if="canCreate && !disabled"
        v-pui-tooltip="__('pruvious-dashboard', 'Upload')"
        @click.stop="fileInput?.click()"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:upload" />
      </PUIButton>
    </div>

    <div v-else>
      <p>{{ __('pruvious-dashboard', 'You do not have permission to access the media library.') }}</p>
    </div>

    <input
      :accept="allowedTypes?.join(',')"
      :id="`${id}-file-input`"
      @change="uploadFiles()"
      hidden
      multiple
      ref="fileInput"
      type="file"
    />

    <PruviousDashboardMediaLibraryPopup
      v-model:isVisible="isMediaLibraryPopupVisible"
      :initialFilePath="initialFilePath"
      :label="label"
      :modelValue="modelValue"
      :validation="validation"
      @update:isVisible="!$event && (isMediaLibraryPopupVisible = false)"
      @update:modelValue="
        (value) => {
          $emit('update:modelValue', value as number[])
          $emit('commit', value as number[])
        }
      "
      filterCategory="image"
      selectionMode="multiple"
    />

    <PruviousDashboardMediaItemDetailsPopup
      v-if="isDetailsPopupVisible && focusedFile"
      :resolvedPermissions="resolvedPermissions[focusedFile.id]"
      :upload="focusedFile"
      @close="$event().then(() => (isDetailsPopupVisible = false))"
      @data="
        (data) => {
          files[focusedFile!.id] = data
          focusedFile = data
        }
      "
      @deselect="
        () => {
          const newValue = modelValue.filter((id) => id !== focusedFile!.id)
          $emit('update:modelValue', newValue)
          $emit('commit', newValue)
        }
      "
    />

    <PruviousFieldMessage :error="fieldError" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, hasPermission, primaryLanguage } from '#pruvious/app'
import {
  batchSelectIn,
  dashboardBasePath,
  displayableImageTypes,
  maybeTranslate,
  resolveFieldLabel,
  resolveThumbnailPath,
  selectFrom,
  upload,
  useCollectionRecordPermissions,
  useDashboardContentLanguage,
  usePruviousDashboard,
  type ResolvedCollectionRecordPermissions,
  type UploadItem,
} from '#pruvious/dashboard'
import type { SerializableFieldOptions } from '#pruvious/server'
import type {
  PUIDynamicChipsChoiceModel,
  PUIDynamicChipsPaginatedChoices,
} from '@pruvious/ui/components/PUIDynamicChips.vue'
import { puiToast } from '@pruvious/ui/pui/toast'
import { castToNumber, isInteger, isObject, isString, parseBytes, sleep, toArray } from '@pruvious/utils'
import { basename, dirname } from 'pathe'
import { validateUpload, type UploadFieldValidation } from '../utils/pruvious/dashboard/upload-fields'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Array as PropType<number[]>,
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
    type: Object as PropType<SerializableFieldOptions<'images'>>,
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
    type: [String, Object] as PropType<string | Record<string, string>>,
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
  'commit': [value: number[]]
  'update:modelValue': [value: number[]]
}>()

const id = useId()
const label = resolveFieldLabel(props.options.ui.label, props.name)
const placeholder = maybeTranslate(props.options.ui.placeholder)
const fileInput = useTemplateRef('fileInput')
const dashboard = usePruviousDashboard()
const uploadsCollection = { name: 'Uploads' as const, definition: dashboard.value!.collections.Uploads! }
const contentLanguage = useDashboardContentLanguage()
const language = computed(() => (props.translatable ? contentLanguage.value : primaryLanguage))
const isMediaLibraryPopupVisible = ref(false)
const isDetailsPopupVisible = ref(false)
const canRead = hasPermission('collection:uploads:read')
const canCreate = hasPermission('collection:uploads:create')
const files = ref<Record<number, UploadItem | 'loading' | 'error'>>({})
const focusedFile = ref<UploadItem | null>(null)
const initialFilePath = computed(() => Object.values(files.value).find((file) => isObject(file))?.path)
const allowedTypes = computed(() => {
  const mimes = toArray(props.options.allowedTypes)
  return mimes.includes('*') ? undefined : mimes
})
const validation = computed<UploadFieldValidation>(() => ({
  allowedMimes: allowedTypes.value,
  minBytes: parseBytes(props.options.minSize),
  maxBytes: parseBytes(props.options.maxSize),
}))
const { resolver: permissionsResolver } = useCollectionRecordPermissions(uploadsCollection)
const resolvedPermissions = ref<Record<number, ResolvedCollectionRecordPermissions>>({})
const fieldError = computed(() => (isString(props.error) ? props.error : props.error?.[props.name]))
const erroredItems = computed<number[]>(() =>
  isObject(props.error) ? Object.keys(props.error).map(castToNumber).filter(isInteger) : [],
)

watch(
  () => props.modelValue,
  async () => {
    await fetchFilesData()
  },
  { immediate: true },
)

watch(
  files,
  async () => {
    for (const file of Object.values(files.value)) {
      if (isObject(file) && !resolvedPermissions.value[file.id]) {
        resolvedPermissions.value[file.id] = await permissionsResolver(file.id, {
          author: uploadsCollection.definition.authorField ? file.author : undefined,
          editors: uploadsCollection.definition.editorsField ? file.editors : undefined,
        })
      }
    }
  },
  { deep: true },
)

async function fetchFilesData() {
  if (canRead && props.modelValue) {
    const ids = [...props.modelValue]

    if (ids.length) {
      if (ids.some((id) => files.value[id] === 'loading')) {
        await sleep(50)
        return fetchFilesData()
      }

      const missingIds = ids.filter((id) => !files.value[id])

      for (const id of missingIds) {
        files.value[id] = 'loading'
      }

      const records = missingIds.length
        ? await batchSelectIn(missingIds, (batch) =>
            selectFrom('Uploads')
              .where('id', 'in', batch)
              .cache(3000)
              .all()
              .then(({ data }) => data ?? []),
          )
        : []

      for (const id of missingIds) {
        files.value[id] = records.find((r) => r.id === id) ?? 'error'
      }
    }
  }
}

async function uploadFiles() {
  if (fileInput.value?.files?.length) {
    const results = await upload([...fileInput.value.files])
    const append: number[] = []

    for (const result of results) {
      if (result.success && result.data) {
        const disabled = validateUpload(result.data, validation.value)

        if (disabled.value) {
          puiToast(disabled.reason, { type: 'error' })
        } else {
          append.push(result.data.id)
        }
      }
    }

    if (append.length) {
      const newValue = [...props.modelValue, ...append]
      emit('update:modelValue', newValue)
      emit('commit', newValue)
    }

    fileInput.value.value = ''
  }
}

async function choicesResolver(page: number, keyword: string): Promise<PUIDynamicChipsPaginatedChoices> {
  const query = selectFrom('Uploads').search(keyword, 'path').where('type', '=', 'file').where('isLocked', '=', false)

  if (validation.value.allowedMimes?.length) {
    query.where('mime', 'in', validation.value.allowedMimes)
  }

  if (validation.value.minBytes) {
    query.where('size', '>=', validation.value.minBytes!)
  }

  if (validation.value.maxBytes) {
    query.where('size', '<=', validation.value.maxBytes!)
  }

  const results = await query
    .orderBy(uploadsCollection.definition.createdAtField ? 'createdAt' : 'id', 'desc')
    .cache(3000)
    .paged(page, 50)
    .paginate()

  if (results.success) {
    const choices = results.data.records.map((record) => ({
      value: record.id,
      label: basename(record.path),
      detail: record.path,
      tooltip: resolveThumbnailPath(record),
    }))

    for (const record of results.data.records) {
      files.value[record.id] = record
    }

    return {
      choices,
      currentPage: results.data.currentPage,
      lastPage: results.data.lastPage,
      perPage: results.data.perPage,
      total: results.data.total,
    }
  }

  return {
    choices: [],
    currentPage: 1,
    lastPage: 1,
    perPage: 50,
    total: 0,
  }
}

async function selectedChoicesResolver(): Promise<PUIDynamicChipsChoiceModel[]> {
  const ids = [...props.modelValue]

  if (ids.length) {
    await fetchFilesData()

    return ids.map((id) => {
      if (isObject(files.value[id])) {
        return {
          value: id,
          label: basename(files.value[id].path),
          tooltip: files.value[id].path,
        }
      }

      return {
        value: id,
        label: __('pruvious-dashboard', 'Image not found') + ` (#${id})`,
      }
    })
  }

  return []
}

function onDoubleClick(id: number, event: MouseEvent) {
  if (isObject(files.value[id])) {
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
      focusedFile.value = files.value[id]
      isDetailsPopupVisible.value = true
    } else {
      const dir = dirname(files.value[id].path)
      window.open(`${dashboardBasePath}media${dir === '/' ? '' : dir}?details=${id}`, '_blank')
    }
  }
}
</script>

<style scoped>
.p-images {
  align-items: flex-start;
}

.p-images-preview {
  flex-shrink: 0;
  position: relative;
  width: 6.5rem;
  aspect-ratio: 1;
  pointer-events: none;
}

.p-images-preview-error {
  display: flex;
  width: 100%;
  aspect-ratio: 1;
  background-color: hsl(var(--pui-background));
  border: 1px solid hsla(var(--pui-border));
  border-radius: calc(var(--pui-radius) - 0.25rem);
  font-size: 1.25rem;
  color: hsla(var(--pui-muted-foreground));
}

.p-images-preview-error > * {
  margin: auto;
}

.pui-dynamic-chips-label {
  margin-top: 0;
}

.p-images-chips.pui-dynamic-chips-dragging .pui-dynamic-chips-label {
  pointer-events: none;
}

.p-images-chips :deep(.pui-dynamic-chips-item) {
  --pui-background: transparent;
  position: relative;
  height: auto;
  padding: 0;
}

.p-images-chips :deep(.pui-dynamic-chips-item-destructive) {
  --pui-border: var(--pui-destructive);
}

.p-images-chips :deep(.pui-dynamic-chips-remove) {
  position: absolute;
  display: none;
  justify-content: center;
  align-items: center;
  top: 0.375rem;
  right: 0.375rem;
  width: 1.125rem;
  height: 1.125rem;
  background-color: hsl(var(--pui-accent));
  border-radius: calc(var(--pui-radius) - 0.25rem);
  color: hsl(var(--pui-accent-foreground));
  transition: var(--pui-transition);
  transition-property: background-color, color;
}

.p-images-chips:not(.pui-dynamic-chips-dragging) :deep(.pui-dynamic-chips-item:hover .pui-dynamic-chips-remove),
.p-images-chips:not(.pui-dynamic-chips-dragging) :deep(.pui-dynamic-chips-item:focus .pui-dynamic-chips-remove) {
  display: flex;
}

.p-images-chips :deep(.pui-dynamic-chips-remove:hover),
.p-images-chips :deep(.pui-dynamic-chips-remove:focus) {
  background-color: hsl(var(--pui-destructive));
  color: hsl(var(--pui-destructive-foreground));
}

.p-images-chips :deep(.pui-dynamic-chips-input) {
  height: auto;
  min-height: calc(2em - 0.125rem);
}

.p-images-chips :deep(.pui-dynamic-chips-dropzone) {
  height: auto;
}

.p-images-chips :deep(.p-media-image-item-button),
.p-images-chips :deep(.p-media-file-item-button) {
  border-radius: calc(var(--pui-radius) - 0.25rem);
}

.p-images-chips :deep(.pui-dynamic-chips-item:hover .p-media-image-dimensions),
.p-images-chips :deep(.pui-dynamic-chips-item:hover .p-media-image-size),
.p-images-chips :deep(.pui-dynamic-chips-item:hover .p-media-file-size),
.p-images-chips :deep(.pui-dynamic-chips-item:focus .p-media-image-dimensions),
.p-images-chips :deep(.pui-dynamic-chips-item:focus .p-media-image-size),
.p-images-chips :deep(.pui-dynamic-chips-item:focus .p-media-file-size),
.p-images-chips.pui-dynamic-chips-dragging :deep(.p-media-image-dimensions),
.p-images-chips.pui-dynamic-chips-dragging :deep(.p-media-image-size),
.p-images-chips.pui-dynamic-chips-dragging :deep(.p-media-file-size) {
  display: none;
}

.p-images-chips :deep(.pui-dynamic-chips-dropdown-item) {
  flex-direction: row;
  justify-content: flex-start;
}

.p-images-choice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.p-images-choice-preview {
  flex-shrink: 0;
  height: calc(100% - 0.5rem);
  aspect-ratio: 1;
  object-fit: contain;
}

.p-images-choice-text {
  display: flex;
  flex-direction: column;
}
</style>
