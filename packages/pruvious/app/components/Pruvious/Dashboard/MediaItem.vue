<template>
  <div
    v-pui-tooltip="showPathTooltip ? { content: upload.path, placement: 'bottom', offset: [0, 4] } : undefined"
    class="p-media-item"
    :class="{ 'p-media-item-selected': selected }"
  >
    <div
      :draggable="resolvedPermissions?.canUpdate"
      @dragend="onMoveEnd"
      @dragstart="onMoveStart"
      class="p-media-item-box"
    >
      <PruviousDashboardMediaDirectoryItem
        v-if="upload.type === 'directory'"
        :allowDrop="selectionMode !== 'multiple'"
        :linkHandler="linkHandler"
        :resolvedPermissions="resolvedPermissions"
        :state="state"
        :upload="upload"
      />
      <PruviousDashboardMediaImageItem
        v-else-if="upload.category === 'image' && displayableImageTypes[upload.mime] && !upload.isLocked"
        :disabled="disabled"
        :linkHandler="linkHandler"
        :resolvedPermissions="resolvedPermissions"
        :selected="selected"
        :selectionMode="selectionMode"
        :state="state"
        :upload="upload"
        @deselect="$emit('deselect', $event)"
        @select="$emit('select', $event)"
      />
      <PruviousDashboardMediaFileItem
        v-else
        :disabled="disabled"
        :linkHandler="linkHandler"
        :resolvedPermissions="resolvedPermissions"
        :selected="selected"
        :selectionMode="selectionMode"
        :state="state"
        :upload="upload"
        @deselect="$emit('deselect', $event)"
        @select="$emit('select', $event)"
      />

      <PUICheckbox
        v-if="
          selectionMode !== 'single' &&
          (selectionMode !== 'multiple' || upload.type === 'file') &&
          (resolvedPermissions?.canUpdate || resolvedPermissions?.canDelete) &&
          !upload.isLocked &&
          !disabled?.value
        "
        v-pui-tooltip="
          selectionMode === 'multiple'
            ? undefined
            : selected
              ? __('pruvious-dashboard', 'Deselect')
              : __('pruvious-dashboard', 'Select')
        "
        :modelValue="selected"
        @update:modelValue="() => (selected ? $emit('deselect', upload) : $emit('select', upload))"
        strict
        class="p-media-item-checkbox"
      />

      <PUIButton
        v-if="
          selectionMode === 'none' &&
          resolvedPermissions?.canDelete &&
          !upload.isLocked &&
          !state.selectedUploads.length &&
          !disabled?.value
        "
        v-pui-tooltip="
          upload.type === 'file' ? __('pruvious-dashboard', 'Delete file') : __('pruvious-dashboard', 'Delete folder')
        "
        :size="-3"
        @click="onDelete()"
        variant="destructive"
        class="p-media-item-delete-button"
      >
        <Icon mode="svg" name="tabler:trash-x" />
      </PUIButton>
    </div>

    <div class="p-media-item-name">
      <component
        :is="selectionMode === 'none' ? 'span' : NuxtLink"
        :target="selectionMode === 'none' ? undefined : '_blank'"
        :title="currentName"
        :to="
          selectionMode === 'none'
            ? undefined
            : dashboardBasePath +
              'media' +
              (currentDirectory === '/' ? '' : currentDirectory) +
              (upload.type === 'file' ? `?details=${upload.id}` : '')
        "
        class="p-media-item-name-text pui-flex"
      >
        <span class="pui-truncate">
          <span>{{ currentNameWithoutExtension }}</span>
          <span v-if="currentExtensionWithoutDot" class="pui-muted">.</span>
        </span>
        <span v-if="currentExtensionWithoutDot" class="pui-shrink-0 pui-muted">{{ currentExtensionWithoutDot }}</span>
      </component>
      <PUIButton
        v-if="selectionMode === 'none' && resolvedPermissions?.canUpdate && !upload.isLocked"
        v-pui-tooltip="
          upload.type === 'file' ? __('pruvious-dashboard', 'Rename file') : __('pruvious-dashboard', 'Rename folder')
        "
        :size="-3"
        @click.stop="openRenameUploadPopup()"
        variant="outline"
        class="p-media-item-rename-button"
      >
        <Icon mode="svg" name="tabler:pencil" />
      </PUIButton>
    </div>

    <PUIPopup
      v-if="renameUploadPopupVisible"
      :size="-1"
      @close="$event().then(() => (renameUploadPopupVisible = false))"
      ref="renameUploadPopup"
      width="26rem"
    >
      <template #header>
        <div class="pui-row">
          <span>
            {{
              upload.type === 'file'
                ? __('pruvious-dashboard', 'Rename file')
                : __('pruvious-dashboard', 'Rename folder')
            }}
          </span>

          <PUIButton
            :size="-2"
            :title="__('pruvious-dashboard', 'Close')"
            @click="closeRenameUploadPopup()"
            variant="ghost"
            class="pui-ml-auto"
          >
            <Icon mode="svg" name="tabler:x" />
          </PUIButton>
        </div>
      </template>

      <PUIField>
        <PUIFieldLabel required>
          <label for="name">
            {{
              upload.type === 'file' ? __('pruvious-dashboard', 'File name') : __('pruvious-dashboard', 'Folder name')
            }}
          </label>
        </PUIFieldLabel>

        <PUIInput
          v-model="newName"
          :placeholder="
            upload.type === 'file'
              ? __('pruvious-dashboard', 'e.g. my-file')
              : __('pruvious-dashboard', 'e.g. my-folder')
          "
          @keydown.enter="rename()"
          autofocus
          id="name"
          name="name"
        >
          <template v-if="currentExtension" #suffix>
            <span class="pui-muted">{{ currentExtension }}</span>
          </template>
        </PUIInput>

        <PruviousFieldMessage
          v-if="newName === newNameNormalized || renameUploadError"
          :error="renameUploadError"
          :options="renameFieldOptions"
          name="name"
        />
        <PruviousFieldMessage
          v-else
          :key="newNameNormalized"
          :options="{ ...renameFieldOptions, ui: { description: '-> `' + newNameNormalized + currentExtension + '`' } }"
          name="name"
        />
      </PUIField>

      <div class="p-media-item-rename-upload-popup-buttons pui-row">
        <PUIButton @click="renameUploadPopup?.close().then(() => (renameUploadPopupVisible = false))" variant="outline">
          {{ __('pruvious-dashboard', 'Cancel') }}
        </PUIButton>

        <PUIButton :disabled="renameDisabled" @click="rename()">
          {{ __('pruvious-dashboard', 'Rename') }}
        </PUIButton>
      </div>
    </PUIPopup>
  </div>
</template>

<script lang="ts" setup>
import { NuxtLink, PruviousDashboardMediaDirectoryItem } from '#components'
import { __ } from '#pruvious/app'
import {
  $pfetchDashboard,
  dashboardBasePath,
  displayableImageTypes,
  moveUpload,
  startMoving,
  stopMoving,
  usePruviousDashboard,
  type CollectionRecordPermissionsResolver,
  type DashboardMediaLibraryState,
  type UploadItem,
} from '#pruvious/dashboard'
import type { DeleteUploadResult } from '#pruvious/server'
import { puiDialog } from '@pruvious/ui/pui/dialog'
import { usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import { puiToast } from '@pruvious/ui/pui/toast'
import { isEmpty, slugify } from '@pruvious/utils'
import { computedAsync } from '@vueuse/core'
import { dirname, extname } from 'pathe'

const props = defineProps({
  upload: {
    type: Object as PropType<UploadItem>,
    required: true,
  },
  state: {
    type: Object as PropType<DashboardMediaLibraryState>,
    required: true,
  },
  permissionsResolver: {
    type: Function as PropType<CollectionRecordPermissionsResolver>,
    required: true,
  },
  showPathTooltip: {
    type: Boolean,
    default: false,
  },
  selectionMode: {
    type: String as PropType<'single' | 'multiple' | 'none'>,
    default: 'none',
  },
  linkHandler: {
    type: Function as PropType<(upload: UploadItem) => any>,
  },
  disabledResolver: {
    type: Function as PropType<(upload: UploadItem) => { value: false } | { value: true; reason: string }>,
  },
})

const emit = defineEmits<{
  select: [upload: UploadItem]
  deselect: [upload: UploadItem]
}>()

const runtimeConfig = useRuntimeConfig()
const dashboard = usePruviousDashboard()
const collection = { name: 'Uploads' as const, definition: dashboard.value!.collections.Uploads! }
const resolvedPermissions = computedAsync(() =>
  props.permissionsResolver?.(Number(props.upload.id), {
    author: collection.definition.authorField ? props.upload.author : undefined,
    editors: collection.definition.editorsField ? props.upload.editors : undefined,
  }),
)
const selected = computed(() => props.state.selectedUploads.some(({ id }) => id === props.upload.id))
const disabled = computed(() => props.disabledResolver?.(props.upload))
const renameUploadPopup = useTemplateRef('renameUploadPopup')
const renameUploadPopupVisible = ref(false)
const currentDirectory = computed(() =>
  props.upload.type === 'directory' ? props.upload.path : dirname(props.upload.path),
)
const currentName = computed(() => props.upload.path.split('/').pop()!)
const currentExtension = computed(() => (props.upload.type === 'file' ? extname(currentName.value) : ''))
const currentNameWithoutExtension = computed(() =>
  currentExtension.value ? currentName.value.slice(0, -currentExtension.value.length) : currentName.value,
)
const currentExtensionWithoutDot = computed(() =>
  currentExtension.value.startsWith('.') ? currentExtension.value.slice(1) : currentExtension.value,
)
const newName = ref('')
const newNameNormalized = computed(() =>
  slugify(newName.value.toLowerCase(), props.upload.type === 'file' ? { '.': '.' } : {})
    .replace(/\.+/g, '.')
    .replace(/^\./, '')
    .replace(/\.$/, ''),
)
const renameUploadError = ref('')
const renameFieldOptions = {
  ui: {
    description:
      props.upload.type === 'file'
        ? __(
            'pruvious-dashboard',
            'The file name will be converted to a URL-friendly format (e.g., `My File` becomes `my-file`).',
          )
        : __(
            'pruvious-dashboard',
            'The folder name will be converted to a URL-friendly format (e.g., `My Folder` becomes `my-folder`).',
          ),
  },
} as any
const renameDisabled = computed(
  () => !newNameNormalized.value || newNameNormalized.value === currentNameWithoutExtension.value,
)

async function rename() {
  if (renameDisabled.value) {
    return
  }

  const parent = props.upload.path.split('/').slice(0, -1).join('/') + '/'
  const results = await moveUpload(props.upload.path, parent + newNameNormalized.value + currentExtension.value).catch(
    () => [],
  )
  const result = results[0]

  if (result?.success) {
    puiToast(
      __('pruvious-dashboard', '$upload `$oldName` has been renamed to `$newName`', {
        upload: props.upload.type === 'file' ? __('pruvious-dashboard', 'File') : __('pruvious-dashboard', 'Folder'),
        oldName: currentName.value,
        newName: newNameNormalized.value + currentExtension.value,
      }),
      { type: 'success' },
    )
    closeRenameUploadPopup()
  } else if (result) {
    if (result.runtimeError) {
      renameUploadError.value = result.runtimeError
    } else if (!isEmpty(result.inputErrors)) {
      renameUploadError.value = Object.values(result.inputErrors)[0] as string
    } else {
      puiToast(__('pruvious-dashboard', 'An error occurred while renaming the upload'), { type: 'error' })
    }
  } else {
    puiToast(__('pruvious-dashboard', 'An error occurred while renaming the upload'), { type: 'error' })
  }
}

function openRenameUploadPopup() {
  newName.value = currentNameWithoutExtension.value
  renameUploadError.value = ''
  renameUploadPopupVisible.value = true
  setTimeout(() => {
    usePUIHotkeys({ allowInOverlays: true, target: () => renameUploadPopup.value?.root }).listen('save', (e) => {
      e.preventDefault()
      rename()
    })
  })
}

function closeRenameUploadPopup() {
  renameUploadPopup.value?.close().then(() => (renameUploadPopupVisible.value = false))
}

function onMoveStart(event: DragEvent) {
  if (!resolvedPermissions.value?.canUpdate || props.selectionMode !== 'none') {
    event.preventDefault()
    return
  }

  const hasSelectedDirectories =
    props.upload.type === 'directory' || props.state.selectedUploads.some(({ type }) => type === 'directory')
  const hasSelectedFiles =
    props.upload.type === 'file' || props.state.selectedUploads.some(({ type }) => type === 'file')

  let selectedCount = props.state.selectedUploads.length
  let selectionType: 'files' | 'directories' | 'mixed' | 'none' = 'none'

  if (hasSelectedDirectories && hasSelectedFiles) {
    selectionType = 'mixed'
  } else if (hasSelectedDirectories) {
    selectionType = 'directories'
  } else if (hasSelectedFiles) {
    selectionType = 'files'
  } else {
    selectionType = 'none'
  }

  if (!props.state.selectedUploads.some(({ id }) => id === props.upload.id)) {
    selectedCount++
    emit('select', props.upload)
  }

  startMoving(__('pruvious-dashboard', 'Moving $count $uploads', { count: selectedCount, type: selectionType }))
  event.dataTransfer?.setDragImage(document.getElementById('pruvious-drag-image')!, -16, 10)
}

function onMoveEnd() {
  stopMoving()
}

async function onDelete() {
  const action = await puiDialog({
    content:
      __('pruvious-dashboard', 'Are you sure you want to delete this $uploadType?', {
        uploadType: props.upload.type,
      }) +
      (props.upload.type === 'directory'
        ? '<br>' + __('pruvious-dashboard', 'Deleting a folder will also delete all of its contents.')
        : ''),
    actions: [
      { name: 'cancel', label: __('pruvious-dashboard', 'Cancel') },
      { name: 'delete', label: __('pruvious-dashboard', 'Delete'), variant: 'destructive' },
    ],
  })

  if (action === 'delete') {
    let count = 0
    let type: 'files' | 'directories' | 'mixed' | 'none' = 'none'

    await $pfetchDashboard(runtimeConfig.public.pruvious.apiBasePath + 'uploads/path' + props.upload.path, {
      method: 'delete',
      query: { recursive: true },
    })
      .then((results) => {
        const deleted = (results as DeleteUploadResult<any, false>[]).filter(({ success }) => success)
        const deletedFiles = deleted.filter(({ details }) => details.type === 'file').length
        const deletedDirectories = deleted.filter(({ details }) => details.type === 'directory').length
        const deletedType =
          deletedFiles > 0 && deletedDirectories > 0
            ? 'mixed'
            : deletedDirectories > 0
              ? 'directories'
              : deletedFiles > 0
                ? 'files'
                : 'none'
        count += deleted.length
        if (type === 'none') {
          type = deletedType
        } else if (type !== deletedType && deletedType !== 'none') {
          type = 'mixed'
        }
      })
      .catch(() => null)

    if (count) {
      window.dispatchEvent(new CustomEvent('pruvious:delete-upload-complete'))
      puiToast(__('pruvious-dashboard', 'Deleted $count $uploads', { count, type }), {
        type: 'success',
      })
    } else {
      puiToast(__('pruvious-dashboard', 'No uploads were deleted'))
    }
  }
}
</script>

<style scoped>
.p-media-item {
  transition: var(--pui-transition);
  transition-property: opacity;
}

.p-media-library-moving .p-media-item-selected {
  opacity: 0.25;
}

.p-media-item-box {
  position: relative;
}

.p-media-item-checkbox {
  --pui-card: var(--pui-background);
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  opacity: 0;
  visibility: hidden;
  transition: var(--pui-transition);
}

.p-media-item-delete-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  opacity: 0;
  visibility: hidden;
  transition: var(--pui-transition);
}

.p-media-item-selected .p-media-item-checkbox,
.p-media-item-selected .p-media-item-delete-button,
.p-media-item-box:hover .p-media-item-checkbox,
.p-media-item-box:hover .p-media-item-delete-button,
.p-media-item-box:focus-within .p-media-item-checkbox,
.p-media-item-box:focus-within .p-media-item-delete-button {
  opacity: 1;
  visibility: visible;
}

.p-media-item-name {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  align-items: center;
  height: 1.5rem;
  margin-top: 0.25rem;
  padding: 0 0.75rem;
  font-size: 0.875rem;
}

.p-media-item-name-text {
  text-decoration: none;
}

.p-media-item-rename-button {
  display: none;
}

.p-media-item-name:hover .p-media-item-rename-button {
  display: inline-flex;
}

.p-media-item-rename-upload-popup-buttons {
  justify-content: flex-end;
  margin-top: 0.75rem;
}

@media (max-width: 767px) {
  .p-media-item-checkbox {
    bottom: 0.375rem;
    left: 0.375rem;
  }

  .p-media-item-delete-button {
    top: 0.375rem;
    right: 0.375rem;
  }
}
</style>
