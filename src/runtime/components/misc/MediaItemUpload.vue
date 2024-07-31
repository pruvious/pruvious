<template>
  <div
    v-pruvious-tooltip="
      meetsRequirements
        ? undefined
        : upload.isImage
        ? __('pruvious-dashboard', 'The image does not meet the requirements')
        : __('pruvious-dashboard', 'The file does not meet the requirements')
    "
    class="flex flex-col items-center gap-2"
    :class="{ 'opacity-25': !meetsRequirements || isMoving }"
  >
    <div
      :tabindex="allowPick ? -1 : 0"
      class="group relative flex aspect-square w-full rounded-md border bg-white transition"
      :class="{
        'border-primary-700': selection.uploads.value[upload.id],
        'before:absolute before:inset-0 before:rounded before:bg-gray-900 before:opacity-0 before:transition':
          upload.isImage,
        'hocus:before:opacity-50': upload.isImage && meetsRequirements,
        'focus-within:border-primary-70 hocus:border-primary-700': meetsRequirements,
        'pointer-events-none': allowPick && !meetsRequirements,
      }"
      :style="{ backgroundImage: upload.isImage ? `url(${backgroundImage})` : undefined }"
    >
      <PruviousImagePreview v-if="upload.isImage" :upload="upload" />

      <button
        v-if="allowPick"
        :draggable="canUpdate"
        :title="
          selection.count.value
            ? selection.directories.value[upload.id]
              ? __('pruvious-dashboard', 'Deselect $item', { item: upload.filename })
              : __('pruvious-dashboard', 'Select $item', { item: upload.filename })
            : meetsRequirements
            ? __('pruvious-dashboard', 'Choose $item', { item: upload.filename })
            : undefined
        "
        @click="
          selection.count.value
            ? selection.uploads.value[upload.id]
              ? selection.deselectUpload(upload, $event)
              : selection.selectUpload(upload, $event)
            : pick()
        "
        @dragend="onMoveEnd"
        @dragstart="onMoveStart"
        type="button"
        class="absolute inset-0 w-full"
        :class="{ 'cursor-default': selection.count.value || !meetsRequirements }"
      ></button>

      <span
        v-if="!allowPick"
        :draggable="canUpdate"
        :title="
          selection.count.value
            ? selection.uploads.value[upload.id]
              ? 'Deselect ' + upload.filename
              : 'Select ' + upload.filename
            : upload.directory + upload.filename
        "
        @click="
          selection.count.value
            ? selection.uploads.value[upload.id]
              ? selection.deselectUpload(upload, $event)
              : selection.selectUpload(upload, $event)
            : null
        "
        @dblclick="open(runtimeConfig.public.pruvious.uploadsBase + upload.directory + upload.filename)"
        @dragend="onMoveEnd"
        @dragstart="onMoveStart"
        class="absolute inset-0 w-full"
      ></span>

      <div
        v-if="meetsRequirements"
        class="invisible absolute -right-2 -top-2 flex justify-end gap-1 rounded-md bg-white p-2 opacity-0 drop-shadow-lg transition-all"
        :class="{ 'group-hover:visible group-hover:opacity-100': !selection.count.value }"
      >
        <a
          v-pruvious-tooltip="__('pruvious-dashboard', 'Open in new tab')"
          :href="runtimeConfig.public.pruvious.uploadsBase + upload.directory + upload.filename"
          target="_blank"
          class="h-4 w-4 text-gray-400 transition hocus:text-primary-700"
        >
          <PruviousIconExternalLink />
        </a>

        <button
          v-if="canUpdate"
          v-pruvious-tooltip="__('pruvious-dashboard', 'Edit')"
          @click="editMediaUpload(upload)"
          type="button"
          class="h-4 w-4 text-gray-400 transition hocus:text-primary-700"
        >
          <PruviousIconPencil />
        </button>

        <button
          v-if="canDelete"
          v-pruvious-tooltip="{
            content:
              clickConfirmation?.id === `delete-media-upload-${upload.id}`
                ? __('pruvious-dashboard', 'Confirm to !!delete!!')
                : __('pruvious-dashboard', 'Delete'),
            showOnCreate: clickConfirmation?.id === `delete-media-upload-${upload.id}`,
          }"
          @click="remove"
          type="button"
          class="h-4 w-4 text-gray-400 transition hocus:text-red-500"
        >
          <PruviousIconTrash />
        </button>
      </div>

      <div
        class="absolute bottom-2 left-2 flex gap-1 rounded-md transition-all group-hover:visible group-hover:opacity-100"
        :class="{
          'invisible opacity-0': !selection.uploads.value[upload.id],
          'pointer-events-none': selection.count.value,
        }"
      >
        <component
          v-if="canUpdate"
          v-pruvious-tooltip="
            selection.uploads.value[upload.id]
              ? __('pruvious-dashboard', 'Deselect')
              : __('pruvious-dashboard', 'Select')
          "
          :highlighted="true"
          :is="CheckboxField"
          :modelValue="!!selection.uploads.value[upload.id]"
          :options="{}"
          @update:modelValue="$event ? selection.selectUpload(upload) : selection.deselectUpload(upload)"
        />
      </div>

      <span
        v-if="upload.isImage && meetsRequirements"
        class="invisible absolute -bottom-1.5 -right-1.5 flex justify-end gap-1 rounded bg-gray-800 px-1.5 py-1 text-xs text-white opacity-0 drop-shadow-lg transition-all"
        :class="{ 'group-hover:visible group-hover:opacity-100': !selection.count.value }"
      >
        {{ upload.width }} × {{ upload.height }}
      </span>

      <PruviousIconFile
        v-if="!upload.isImage"
        class="pointer-events-none relative m-auto h-5 w-5 transition group-hover:text-primary-700"
        :class="{ 'text-primary-700': selection.uploads.value[upload.id] }"
      />
    </div>

    <button
      v-if="allowPick"
      :title="meetsRequirements ? __('pruvious-dashboard', 'Choose $item', { item: upload.filename }) : undefined"
      @click="pick()"
      type="button"
      class="max-w-full truncate text-sm transition"
      :class="{
        'hocus:text-primary-700': meetsRequirements,
        'cursor-default': !meetsRequirements,
      }"
    >
      {{ upload.filename }}
    </button>

    <span v-if="!allowPick" :title="upload.filename" class="max-w-full truncate text-sm">
      {{ upload.filename }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { computed, useRuntimeConfig, type PropType } from '#imports'
import type { CastedFieldType } from '#pruvious'
import { checkboxFieldComponent, dashboardMiscComponent } from '#pruvious/dashboard'
import backgroundImage from '../../assets/image-background.png'
import { confirmClick, useClickConfirmation } from '../../composables/dashboard/confirm-click'
import {
  editMediaUpload,
  useMediaUpdated,
  type MediaUpload,
  type PickCallback,
} from '../../composables/dashboard/media'
import { startMoving, stopMoving, useIsMoving } from '../../composables/dashboard/move'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { MediaSelection } from '../../utils/dashboard/media-selection'
import { pruviousFetch } from '../../utils/fetch'
import { objectOmit } from '../../utils/object'

const props = defineProps({
  allowedTypes: {
    type: Object as PropType<Record<string, true>>,
  },
  allowPick: {
    type: Boolean,
    default: false,
  },
  canDelete: {
    type: Boolean,
    default: false,
  },
  canUpdate: {
    type: Boolean,
    default: false,
  },
  minHeight: {
    type: Number,
    default: 0,
  },
  minWidth: {
    type: Number,
    default: 0,
  },
  pickCallback: {
    type: Function as PropType<PickCallback>,
  },
  upload: {
    type: Object as PropType<MediaUpload>,
    required: true,
  },
  selection: {
    type: Object as PropType<MediaSelection>,
    required: true,
  },
})

const emit = defineEmits<{
  pickUpload: [CastedFieldType['uploads']]
}>()

const clickConfirmation = useClickConfirmation()
const isMoving = useIsMoving()
const mediaUpdated = useMediaUpdated()
const runtimeConfig = useRuntimeConfig()

const meetsRequirements = computed(() => {
  if (props.allowedTypes && !props.allowedTypes[props.upload.type] && !props.allowedTypes[props.upload.extension]) {
    return false
  }

  if (props.upload.isImage && props.upload.type !== 'image/svg+xml') {
    if (props.upload.width < props.minWidth || props.upload.height < props.minHeight) {
      return false
    }
  }

  return true
})

const CheckboxField = checkboxFieldComponent()
const PruviousImagePreview = dashboardMiscComponent.ImagePreview()

await loadTranslatableStrings('pruvious-dashboard')

async function pick() {
  if (meetsRequirements.value) {
    const upload = objectOmit(props.upload, ['extension', 'isImage'])

    if (props.pickCallback) {
      await props.pickCallback(upload)
    }

    emit('pickUpload', upload)
  }
}

function open(url: string) {
  window.open(url, '_blank')
}

async function remove(event: MouseEvent) {
  confirmClick({
    target: event.target as Element,
    id: `delete-media-upload-${props.upload.id}`,
    success: async () => {
      const response = await pruviousFetch(`collections/uploads/${props.upload.id}`, { method: 'delete' })

      if (response.success) {
        pruviousToasterShow({ message: __('pruvious-dashboard', 'File deleted') })
        props.selection.deselectUpload(props.upload)
        mediaUpdated.value++
      }
    },
  })
}

function onMoveStart(event: DragEvent) {
  props.selection.selectUpload(props.upload)
  startMoving({ dragImageLabel: `${props.selection.count.value} ${props.selection.currentType.value}` })
  event.dataTransfer?.setDragImage(document.getElementById('pruvious-drag-image')!, -16, 10)
}

function onMoveEnd() {
  if (props.selection.count.value === 1) {
    setTimeout(() => props.selection.deselectUpload(props.upload))
  }

  stopMoving()
}
</script>
