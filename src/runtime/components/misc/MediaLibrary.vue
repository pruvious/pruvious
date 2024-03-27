<template>
  <div class="flex flex-1 flex-col">
    <div v-if="!filter.isActive.value && data.directories.length && !dragCount" data-no-dropzone class="space-y-2">
      <h2 class="text-sm">{{ __('pruvious-dashboard', 'Folders') }}</h2>

      <div class="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-6">
        <PruviousMediaItemDirectory
          v-for="(directory, i) of data.directories"
          :canDelete="canDelete"
          :canUpdate="canUpdate"
          :directory="directory"
          :key="i"
          :selection="selection"
          @openDirectory="$emit('openDirectory', $event)"
        />
      </div>
    </div>

    <div v-if="data.uploads.length && !dragCount" data-no-dropzone class="space-y-2">
      <h2 class="text-sm">{{ __('pruvious-dashboard', 'Files') }}</h2>

      <div class="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-6">
        <PruviousMediaItemUpload
          v-for="(upload, i) of data.uploads"
          :allowedTypes="allowedTypes"
          :allowPick="allowPick"
          :canDelete="canDelete"
          :canUpdate="canUpdate"
          :key="i"
          :minHeight="minHeight"
          :minWidth="minWidth"
          :pickCallback="pickCallback"
          :selection="selection"
          :upload="upload"
          @pickUpload="$emit('pickUpload', $event)"
        />
      </div>
    </div>

    <div
      v-if="loaded && !filter.isActive.value && !data.directories.length && !data.uploads.length && !dragCount"
      data-no-dropzone
      class="flex h-full flex-1 rounded-md border p-8 text-sm text-gray-500"
    >
      <p class="m-auto">
        {{ directory ? __('pruvious-dashboard', 'Folder is empty') : __('pruvious-dashboard', 'Library is empty') }}
      </p>
    </div>

    <div
      v-if="loaded && filter.isActive.value && !data.uploads.length && !dragCount"
      data-no-dropzone
      class="flex h-full flex-1 rounded-md border p-8 text-sm text-gray-500"
    >
      <p class="m-auto">
        {{
          __('pruvious-dashboard', 'No $items matching the current filter were found', {
            items: __('pruvious-dashboard', 'files'),
          })
        }}
      </p>
    </div>

    <div
      v-if="dragCount"
      @dragenter="dragAreaHighlighted = true"
      @dragleave="dragAreaHighlighted = false"
      @drop="onDropInArea"
      class="flex h-full flex-1 border p-8 text-sm text-gray-500 transition"
      :class="{ 'border-primary-400 bg-primary-50': dragAreaHighlighted }"
    >
      <p class="pointer-events-none m-auto" :class="{ 'text-primary-700': dragAreaHighlighted }">
        {{ __('pruvious-dashboard', 'Drop files here to upload') }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, useRuntimeConfig, watch, type PropType } from '#imports'
import type { CastedFieldType, CreateInput } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { useEventListener } from '@vueuse/core'
import {
  fetchDirectories,
  upload,
  useMediaClear,
  useMediaDirectories,
  useMediaUpdated,
  type MediaData,
  type PickCallback,
} from '../../composables/dashboard/media'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __ } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { sortNaturalByProp } from '../../utils/array'
import { format } from '../../utils/bytes'
import { Filter } from '../../utils/dashboard/filter'
import { addMediaDirectories, listMediaDirectoryWithPath } from '../../utils/dashboard/media-directory'
import { MediaSelection } from '../../utils/dashboard/media-selection'
import { getFilesFromDataTransferItems } from '../../utils/data-transfer'
import { isDropzone } from '../../utils/dom'
import { pruviousFetch } from '../../utils/fetch'
import { slugify } from '../../utils/slugify'
import { imageTypes } from '../../utils/uploads'
import { getCapabilities } from '../../utils/users'

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
  allowedTypes: {
    type: Object as PropType<Record<string, true>>,
  },
  allowPick: {
    type: Boolean,
    default: false,
  },
  directory: {
    type: String,
    default: '',
  },
  fetchCount: {
    type: Number,
    default: 0,
  },
  filter: {
    type: Object as PropType<Filter>,
    required: true,
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
  selection: {
    type: Object as PropType<MediaSelection>,
    default: new MediaSelection(),
  },
})

const emit = defineEmits<{
  openDirectory: [string]
  pickUpload: [CastedFieldType['uploads']]
}>()

const loaded = ref(false)
const mediaClear = useMediaClear()
const mediaUpdated = useMediaUpdated()
const mediaDirectories = useMediaDirectories()
const runtimeConfig = useRuntimeConfig()
const user = useUser()

const data = ref<MediaData>({ directories: [], uploads: [] })
const dragCount = ref(0)
const dragAreaHighlighted = ref(false)
const uploadLimitString = format(runtimeConfig.public.pruvious.uploadLimit)!
const userCapabilities = getCapabilities(user.value)

const canCreateMany = user.value?.isAdmin || userCapabilities['collection-uploads-create-many']
const canDelete = user.value?.isAdmin || userCapabilities['collection-uploads-delete']
const canUpdate = user.value?.isAdmin || userCapabilities['collection-uploads-update']

const PruviousMediaItemDirectory = dashboardMiscComponent.MediaItemDirectory()
const PruviousMediaItemUpload = dashboardMiscComponent.MediaItemUpload()

watch(() => props.directory, fetchData, { immediate: true })
watch(() => props.fetchCount, fetchData)
watch(props.filter.updated, fetchData)
watch(mediaClear, () => (data.value.uploads = []))
watch(mediaUpdated, fetchData)

useEventListener(window, 'dragenter', (event) => {
  if (
    canCreateMany &&
    event.dataTransfer?.items &&
    [...(event.dataTransfer.items as any)].some((item) => item.kind === 'file')
  ) {
    if (!dragCount.value) {
      window.addEventListener('dragover', onDragOver)
    }

    dragCount.value++

    if (!isDropzone(event.target as HTMLElement)) {
      setTimeout(() => {
        dragCount.value--

        if (!dragCount.value) {
          window.removeEventListener('dragover', onDragOver)
        }
      }, 100)
    }
  }
})

useEventListener(window, 'dragleave', (event) => {
  if (
    canCreateMany &&
    event.dataTransfer?.items &&
    [...(event.dataTransfer.items as any)].some((item) => item.kind === 'file')
  ) {
    dragCount.value--

    if (!dragCount.value) {
      window.removeEventListener('dragover', onDragOver)
    }
  }
})

useEventListener(window, 'drop', (event) => onDrop(event))
useEventListener(window, 'click', () => onDrop())

/**
 * Fetch files.
 */
async function fetchData() {
  if (props.active) {
    loaded.value = false

    const query: Record<string, string | undefined> = props.filter.isActive.value
      ? { where: `${props.filter.stringifyWhere()}` || undefined, order: 'filename' }
      : { where: `directory[=][${props.directory}]`, order: 'filename' }

    if (props.filter.searchOption.value.length) {
      query.search = props.filter.searchOption.value.join(' ')
    }

    const response = await pruviousFetch<{ records: CastedFieldType['uploads'][] }>('collections/uploads', { query })

    if (response.success) {
      data.value.uploads = response.data.records.map((upload) => ({
        extension: upload.filename.split('.').pop() ?? '',
        isImage: imageTypes.includes(upload.type),
        ...upload,
      }))
      addMediaDirectories(
        data.value.uploads.map(({ directory }) => directory),
        mediaDirectories.value,
      )
    } else {
      data.value.uploads = []
    }

    data.value.directories = sortNaturalByProp(
      listMediaDirectoryWithPath(props.directory, mediaDirectories.value)!,
      'name',
    )

    props.selection.setData(data.value)

    loaded.value = true
  }
}

function onDragOver(event: DragEvent) {
  event.stopPropagation()
  event.preventDefault()
}

function onDrop(event?: DragEvent) {
  event?.preventDefault()
  dragCount.value = 0
  dragAreaHighlighted.value = false
  window.removeEventListener('dragover', onDragOver)
}

async function onDropInArea(event: DragEvent) {
  dragCount.value = 0
  dragAreaHighlighted.value = false
  window.removeEventListener('dragover', onDragOver)

  if (event.dataTransfer?.items.length) {
    try {
      const files: (File & { filepath: string })[] = await getFilesFromDataTransferItems(event.dataTransfer.items)
      const uploads: CreateInput['uploads'][] = []

      for (const file of files) {
        if (file.size <= runtimeConfig.public.pruvious.uploadLimit) {
          uploads.push({
            $file: file,
            directory:
              props.directory +
              (file.filepath.includes('/') ? file.filepath.split('/').slice(0, -1).map(slugify).join('/') : ''),
          })
        } else {
          pruviousToasterShow({
            message: __('pruvious-dashboard', 'The file **$file** exceeds the upload limit of $limit', {
              file: file.name,
              limit: uploadLimitString,
            }),
            type: 'error',
          })
        }
      }

      const uploaded = await upload(uploads)

      if (uploaded) {
        pruviousToasterShow({ message: __('pruvious-dashboard', 'Uploaded $count $files', { count: uploaded }) })
        fetchDirectories()
        fetchData()
      }
    } catch (_) {}
  }
}
</script>
