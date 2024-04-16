<template>
  <div
    class="flex flex-col items-center gap-2 transition"
    :class="{ 'opacity-25': isMoving && selection.directories.value[directory.path] }"
  >
    <div
      @dragenter.prevent="onMoveEnter()"
      @dragleave="isHighlighted = false"
      @dragover.prevent
      @drop.prevent="onMoveDrop()"
      class="group relative flex aspect-square w-full rounded-md border bg-white transition focus-within:border-primary-700 hocus:border-primary-700"
      :class="{ 'border-primary-700': selection.directories.value[directory.path] || isHighlighted }"
    >
      <button
        :draggable="canUpdate"
        :title="
          selection.count.value
            ? selection.directories.value[directory.path]
              ? __('pruvious-dashboard', 'Deselect $item', { item: directory.path })
              : __('pruvious-dashboard', 'Select $item', { item: directory.path })
            : __('pruvious-dashboard', 'Open $item', { item: directory.path })
        "
        @click="
          selection.count.value
            ? selection.directories.value[directory.path]
              ? selection.deselectDirectory(directory.path, $event)
              : selection.selectDirectory(directory.path, $event)
            : $emit('open-directory', directory.path)
        "
        @dragend="onMoveEnd"
        @dragstart="onMoveStart"
        type="button"
        class="absolute inset-0 w-full outline-none"
        :class="{ 'cursor-default': selection.count.value }"
      ></button>

      <div
        v-if="canUpdate || canDelete"
        class="invisible absolute -right-2 -top-2 flex justify-end gap-1 rounded-md bg-white p-2 opacity-0 drop-shadow-lg transition-all"
        :class="{ 'group-hocus:visible group-hocus:opacity-100': !selection.count.value }"
      >
        <button
          v-if="canUpdate"
          v-pruvious-tooltip="__('pruvious-dashboard', 'Rename')"
          @click="renameMediaDirectory(directory.path)"
          type="button"
          class="h-4 w-4 text-gray-400 transition hocus:text-primary-700"
        >
          <PruviousIconPencil />
        </button>

        <button
          v-if="canDelete"
          v-pruvious-tooltip="{
            content:
              clickConfirmation?.id === `delete-media-directory-${directory.path}`
                ? __('pruvious-dashboard', 'Confirm to !!delete!!')
                : __('pruvious-dashboard', 'Delete'),
            showOnCreate: clickConfirmation?.id === `delete-media-directory-${directory.path}`,
          }"
          @click="remove"
          type="button"
          class="h-4 w-4 text-gray-400 transition hocus:text-red-500"
        >
          <PruviousIconTrash />
        </button>
      </div>

      <div
        class="absolute bottom-2 left-2 flex gap-1 rounded-md transition-all group-hocus:visible group-hocus:opacity-100"
        :class="{
          'invisible opacity-0': !selection.directories.value[directory.path],
          'pointer-events-none': selection.count.value,
        }"
      >
        <component
          v-if="canUpdate"
          v-pruvious-tooltip="
            selection.directories.value[directory.path]
              ? __('pruvious-dashboard', 'Deselect')
              : __('pruvious-dashboard', 'Select')
          "
          :highlighted="true"
          :is="CheckboxField"
          :modelValue="!!selection.directories.value[directory.path]"
          :options="{}"
          @update:modelValue="
            $event ? selection.selectDirectory(directory.path) : selection.deselectDirectory(directory.path)
          "
        />
      </div>

      <PruviousIconFolder
        class="pointer-events-none relative m-auto h-5 w-5 transition group-hocus:text-primary-700"
        :class="{ 'text-primary-700': selection.directories.value[directory.path] }"
      ></PruviousIconFolder>
    </div>

    <button
      :title="__('pruvious-dashboard', 'Open $item', { item: directory.name })"
      @click="$emit('open-directory', directory.path)"
      type="button"
      class="max-w-full truncate text-sm transition hocus:text-primary-700"
    >
      {{ directory.name }}
    </button>
  </div>
</template>

<script lang="ts" setup>
import { ref, type PropType } from '#imports'
import { checkboxFieldComponent } from '#pruvious/dashboard'
import { confirmClick, useClickConfirmation } from '../../composables/dashboard/confirm-click'
import {
  moveSelection,
  renameMediaDirectory,
  useMediaDirectories,
  useMediaUpdated,
  type MediaDirectory,
} from '../../composables/dashboard/media'
import { startMoving, stopMoving, useIsMoving } from '../../composables/dashboard/move'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { deleteMediaDirectories } from '../../utils/dashboard/media-directory'
import { MediaSelection } from '../../utils/dashboard/media-selection'
import { pruviousFetch } from '../../utils/fetch'

const props = defineProps({
  canDelete: {
    type: Boolean,
    default: false,
  },
  canUpdate: {
    type: Boolean,
    default: false,
  },
  directory: {
    type: Object as PropType<MediaDirectory>,
    required: true,
  },
  selection: {
    type: Object as PropType<MediaSelection>,
    required: true,
  },
})

const emit = defineEmits<{
  'open-directory': [string]
}>()

const clickConfirmation = useClickConfirmation()
const isMoving = useIsMoving()
const mediaDirectories = useMediaDirectories()
const mediaUpdated = useMediaUpdated()

const CheckboxField = checkboxFieldComponent()

const isHighlighted = ref(false)

await loadTranslatableStrings('pruvious-dashboard')

async function remove(event: MouseEvent) {
  confirmClick({
    target: event.target as Element,
    id: `delete-media-directory-${props.directory.path}`,
    success: async () => {
      const response = await pruviousFetch('collections/uploads', {
        method: 'delete',
        query: { where: `some:[directory[=][${props.directory.path}],directory[like][${props.directory.path}%]]` },
      })

      if (response.success) {
        pruviousToasterShow({ message: __('pruvious-dashboard', 'Folder deleted') })
        deleteMediaDirectories(props.directory.path, mediaDirectories.value)
        props.selection.deselectDirectory(props.directory.path)
        mediaUpdated.value++
      }
    },
  })
}

function onMoveStart(event: DragEvent) {
  props.selection.selectDirectory(props.directory.path)
  startMoving({ dragImageLabel: `${props.selection.count.value} ${props.selection.currentType.value}` })
  event.dataTransfer?.setDragImage(document.getElementById('pruvious-drag-image')!, -16, 10)
}

function onMoveEnter() {
  isHighlighted.value = true
}

async function onMoveDrop() {
  isHighlighted.value = false

  if (!props.selection.directories.value[props.directory.path]) {
    await moveSelection(props.selection.clone(), props.directory.path)
  }
}

function onMoveEnd() {
  if (props.selection.count.value === 1) {
    setTimeout(() => props.selection.deselectDirectory(props.directory.path))
  }

  stopMoving()
  isHighlighted.value = false
}
</script>
