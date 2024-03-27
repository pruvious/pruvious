<template>
  <div>
    <PruviousPopup
      :visible="visible"
      @hotkey="onHotkey"
      @update:visible="!$event && closeMediaLibraryPopup()"
      size="large"
      width="100%"
    >
      <template #header>
        <PruviousMediaBreadcrumbs
          v-if="mediaLibraryPopup && !searchValue"
          :directory="directory"
          :rootLabel="__('pruvious-dashboard', 'Media library')"
          @openDirectory="onOpenDirectory"
          class="font-medium"
        />

        <p v-if="searchValue" class="truncate text-sm">
          {{ __('pruvious-dashboard', 'Search results for:') }}
          <strong class="text-primary-600">{{ searchValue }}</strong>
        </p>

        <div class="-mr-5 ml-auto w-56">
          <component
            v-model="searchValue"
            :is="TextField"
            :options="{
              name: 'media-library-popup-search',
              placeholder: __('pruvious-dashboard', 'Search media...'),
              clearable: true,
            }"
            @update:modelValue="onSearch()"
            fieldKey="media-library-popup-search"
          />
        </div>
      </template>

      <div class="flex h-[calc(100vh-3.5rem)] flex-col">
        <div class="flex flex-1 flex-col gap-8 overflow-y-auto bg-gray-50 p-8">
          <PruviousMediaLibrary
            :active="!!fetchCount"
            :allowedTypes="allowedTypes"
            :allowPick="true"
            :directory="directory"
            :fetchCount="fetchCount"
            :filter="filter"
            :minHeight="mediaLibraryPopup?.minHeight"
            :minWidth="mediaLibraryPopup?.minWidth"
            :pickCallback="mediaLibraryPopup?.pickCallback"
            :selection="selection"
            @openDirectory="onOpenDirectory"
            @pickUpload="closeMediaLibraryPopup()"
          />
        </div>

        <div class="flex h-[4.3125rem] shrink-0 items-center gap-2 border-t p-4">
          <div v-show="!selection.count.value && !searchValue" class="flex gap-2">
            <button
              v-show="!filter.isActive.value && canCreate"
              @click="createMediaDirectory(directory)"
              type="button"
              class="button button-white"
            >
              <span>{{ __('pruvious-dashboard', 'Add new folder') }}</span>
            </button>

            <button
              v-pruvious-tooltip="__('pruvious-dashboard', 'Upload limit is $limit', { limit: uploadLimitString })"
              v-show="!filter.isActive.value && canCreate"
              @click="startUpload()"
              type="button"
              class="button button-white"
            >
              <span>{{ __('pruvious-dashboard', 'Upload') }}</span>
            </button>
          </div>

          <div v-show="selection.count.value && !searchValue" class="flex gap-2">
            <button
              v-pruvious-tooltip="__('pruvious-dashboard', 'Clear selection')"
              @click="selection.deselectAll()"
              type="button"
              class="button button-white button-square"
            >
              <PruviousIconSquareOff />
            </button>

            <button
              v-show="!filter.isActive.value && canUpdate"
              @click="movePopupVisible = true"
              type="button"
              class="button button-white"
            >
              <span>{{ __('pruvious-dashboard', 'Move') }}</span>
            </button>

            <button
              v-pruvious-tooltip="{
                content:
                  clickConfirmation?.id === 'delete-media-items'
                    ? __('pruvious-dashboard', 'Confirm to !!delete!!')
                    : __('pruvious-dashboard', 'Delete'),
                showOnCreate: clickConfirmation?.id === 'delete-media-items',
              }"
              v-show="canDeleteMany"
              @click="deleteSelectedItems"
              type="button"
              class="button"
              :class="{
                'button-red border border-red-700': clickConfirmation?.id === 'delete-media-items',
                'button-white-red': clickConfirmation?.id !== 'delete-media-items',
              }"
            >
              <span>
                {{
                  __('pruvious-dashboard', 'Delete $count $items', {
                    count: selection.count.value,
                    items: selection.currentType.value,
                  })
                }}
              </span>
            </button>
          </div>

          <div v-show="allowedTypesTooltip || minSizeTooltip" class="ml-auto flex items-center gap-3">
            <span v-pruvious-tooltip="allowedTypesTooltip" v-show="allowedTypesTooltip">
              <PruviousIconFileSearch class="h-4 w-4" />
            </span>

            <span v-pruvious-tooltip="minSizeTooltip" v-show="minSizeTooltip.length">
              <PruviousIconRulerMeasure class="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </PruviousPopup>

    <PruviousMediaMovePopup v-model:visible="movePopupVisible" :directory="directory" :selection="selection" />
  </div>
</template>

<script lang="ts" setup>
import { nextTick, ref, useRuntimeConfig, watch } from '#imports'
import type { CastedFieldType } from '#pruvious'
import { dashboardMiscComponent, textFieldComponent } from '#pruvious/dashboard'
import { debounce } from 'perfect-debounce'
import { confirmClick, useClickConfirmation } from '../../composables/dashboard/confirm-click'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import type { HotkeyAction } from '../../composables/dashboard/hotkeys'
import {
  closeMediaLibraryPopup,
  createMediaDirectory,
  fetchDirectories,
  openMediaLibraryPopup,
  openUploadDialog,
  useLastMediaDirectory,
  useMediaClear,
  useMediaDirectories,
  useMediaDirectoryPopup,
  useMediaLibraryPopup,
  useMediaUpdated,
  useMediaUploadPopup,
} from '../../composables/dashboard/media'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { isArray } from '../../utils/array'
import { format } from '../../utils/bytes'
import { Filter } from '../../utils/dashboard/filter'
import { deleteMediaDirectories } from '../../utils/dashboard/media-directory'
import { MediaSelection } from '../../utils/dashboard/media-selection'
import { pruviousFetch } from '../../utils/fetch'
import { getCapabilities } from '../../utils/users'

const dashboard = usePruviousDashboard()
const lastMediaDirectory = useLastMediaDirectory()
const mediaLibraryPopup = useMediaLibraryPopup()
const runtimeConfig = useRuntimeConfig()
const user = useUser()

const PruviousMediaBreadcrumbs = dashboardMiscComponent.MediaBreadcrumbs()
const PruviousMediaLibrary = dashboardMiscComponent.MediaLibrary()
const PruviousMediaMovePopup = dashboardMiscComponent.MediaMovePopup()
const PruviousPopup = dashboardMiscComponent.Popup()
const TextField = textFieldComponent()

const allowedTypes = ref<Record<string, true>>()
const allowedTypesTooltip = ref('')
const clickConfirmation = useClickConfirmation()
const directory = ref('')
const fetchCount = ref(0)
const filter = new Filter()
const mediaClear = useMediaClear()
const mediaDirectories = useMediaDirectories()
const mediaDirectoryPopup = useMediaDirectoryPopup()
const mediaUpdated = useMediaUpdated()
const mediaUploadPopup = useMediaUploadPopup()
const minSizeTooltip = ref<string[]>([])
const movePopupVisible = ref(false)
const searchValue = ref('')
const selection = new MediaSelection()
const uploadLimitString = format(runtimeConfig.public.pruvious.uploadLimit)!
const userCapabilities = getCapabilities(user.value)
const visible = ref(false)

const canCreate =
  dashboard.value.collections.uploads?.apiRoutes.create &&
  (user.value?.isAdmin || userCapabilities['collection-uploads-create'])
const canDeleteMany =
  dashboard.value.collections.uploads?.apiRoutes.deleteMany &&
  (user.value?.isAdmin || userCapabilities['collection-uploads-delete-many'])
const canUpdate =
  dashboard.value.collections.uploads?.apiRoutes.update &&
  (user.value?.isAdmin || userCapabilities['collection-uploads-update'])

let prevSearchValue = ''

await loadTranslatableStrings('pruvious-dashboard')

watch(mediaLibraryPopup, async (value) => {
  if (value) {
    await fetchDirectories()
    allowedTypes.value = isArray(value.allowedTypes)
      ? Object.fromEntries(
          value.allowedTypes?.map((type) => [
            type.includes('/') ? type.toLowerCase() : type.replace('.', '').toLowerCase(),
            true,
          ]) ?? [],
        )
      : value.allowedTypes
    allowedTypesTooltip.value = __('pruvious-dashboard', '**Allowed types:** $types', {
      types: Object.keys(allowedTypes.value ?? {}).join(', '),
    })
    directory.value = value.directory ?? ''
    fetchCount.value++
    minSizeTooltip.value = []

    if (mediaLibraryPopup.value?.minWidth) {
      minSizeTooltip.value.push(
        __('pruvious-dashboard', '**Minimum width:** $width', { width: mediaLibraryPopup.value.minWidth }),
      )
    }

    if (mediaLibraryPopup.value?.minHeight) {
      minSizeTooltip.value.push(
        __('pruvious-dashboard', '**Minimum height:** $height', { height: mediaLibraryPopup.value.minHeight }),
      )
    }

    visible.value = true
  } else {
    visible.value = false
  }
})

const onSearch = debounce(() => {
  const trimmed = searchValue.value.trim()

  if (trimmed !== prevSearchValue) {
    prevSearchValue = trimmed
    filter.search(trimmed)
    filter.isActive.value = !!trimmed
    filter.updated.value++
    mediaClear.value++
  }
}, 250)

async function deleteSelectedItems(event: MouseEvent) {
  confirmClick({
    target: event.target as Element,
    id: 'delete-media-items',
    success: async () => {
      const where: string[] = []

      if (Object.keys(selection.uploads.value).length) {
        where.push(`id[in][${Object.keys(selection.uploads.value)}]`)
      }

      for (const directory of Object.keys(selection.directories.value)) {
        where.push(`directory[=][${directory}]`, `directory[like][${directory}%]`)
      }

      const response = await pruviousFetch<CastedFieldType['uploads'][]>('collections/uploads', {
        method: 'delete',
        query: { where: `some:[${where.join(',')}]` },
      })

      if (response.success) {
        pruviousToasterShow({
          message: __('pruvious-dashboard', 'Deleted $count $items', {
            count: selection.count.value,
            items: selection.currentType.value,
          }),
        })

        deleteMediaDirectories(Object.keys(selection.directories.value), mediaDirectories.value)
        selection.deselectAll()
        mediaUpdated.value++
      }
    },
  })
}

function onOpenDirectory(dir: string) {
  mediaLibraryPopup.value!.directory = dir
  lastMediaDirectory.value = dir
  directory.value = dir
}

function startUpload() {
  const options = { ...mediaLibraryPopup.value! }
  closeMediaLibraryPopup()

  nextTick(() => {
    openUploadDialog(directory.value)
    openMediaLibraryPopup(options)
  })
}

function onHotkey(action: HotkeyAction) {
  if (action === 'close' && !mediaDirectoryPopup.value && !mediaUploadPopup.value && !movePopupVisible.value) {
    closeMediaLibraryPopup()
  }
}
</script>
