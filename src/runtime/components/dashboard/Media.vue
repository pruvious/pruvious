<template>
  <PruviousBase>
    <template #search>
      <PruviousSearchMedia :directory="directory" />
    </template>

    <div class="flex min-h-full flex-col gap-8 p-8">
      <div class="flex items-center justify-between gap-8">
        <div class="flex flex-col gap-1" :class="{ 'overflow-hidden': !filter.isActive.value }">
          <h1 class="text-xl">{{ __('pruvious-dashboard', 'Media') }}</h1>

          <div v-if="filter.isActive.value" class="flex gap-2 text-sm">
            <span class="truncate">Filtered results</span>

            <button
              v-pruvious-tooltip="'Clear filters'"
              @click="clearFilter()"
              type="button"
              class="button button-white button-square-xs"
            >
              <PruviousIconFilterOff />
            </button>
          </div>

          <PruviousMediaBreadcrumbs
            v-if="!filter.isActive.value"
            :directory="directory"
            :root-label="__('pruvious-dashboard', 'Library')"
            @openDirectory="onOpenDirectory"
          />
        </div>

        <div v-if="!selection.count.value" class="flex gap-2">
          <button
            v-pruvious-tooltip="
              filter.isActive.value
                ? __('pruvious-dashboard', 'Edit filters')
                : __('pruvious-dashboard', 'Filter $items', { items: __('pruvious-dashboard', 'files') })
            "
            @click="filterPopupVisible = true"
            type="button"
            class="button button-white button-square"
            :class="{ '!border-primary-700 !text-primary-700': filterPopupVisible }"
          >
            <PruviousIconFilter />
          </button>

          <button
            v-if="!filter.isActive.value && canCreate"
            @click="createMediaDirectory(directory)"
            type="button"
            class="button button-white"
          >
            <span>{{ __('pruvious-dashboard', 'Add new folder') }}</span>
          </button>

          <button
            v-if="!filter.isActive.value && canCreate"
            v-pruvious-tooltip="__('pruvious-dashboard', 'Upload limit is $limit', { limit: uploadLimitString })"
            @click="openUploadDialog(directory)"
            type="button"
            class="button"
          >
            <span>{{ __('pruvious-dashboard', 'Upload') }}</span>
          </button>
        </div>

        <div v-if="selection.count.value" class="flex gap-2">
          <button
            v-pruvious-tooltip="__('pruvious-dashboard', 'Clear selection')"
            @click="selection.deselectAll()"
            type="button"
            class="button button-white button-square"
          >
            <PruviousIconSquareOff />
          </button>

          <button
            v-if="!filter.isActive.value && canUpdate"
            @click="movePopupVisible = true"
            type="button"
            class="button button-white"
          >
            <span>{{ __('pruvious-dashboard', 'Move') }}</span>
          </button>

          <button
            v-if="canDeleteMany"
            v-pruvious-tooltip="{
              content:
                clickConfirmation?.id === 'delete-media-items'
                  ? __('pruvious-dashboard', 'Confirm to !!delete!!')
                  : __('pruvious-dashboard', 'Delete'),
              showOnCreate: clickConfirmation?.id === 'delete-media-items',
            }"
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
      </div>

      <PruviousMediaLibrary
        v-model:directory="directory"
        :active="true"
        :filter="filter"
        :selection="selection"
        @openDirectory="onOpenDirectory"
      />
    </div>

    <PruviousFilterPopup
      v-model:visible="filterPopupVisible"
      :filter="filter"
      :title="__('pruvious-dashboard', 'Filter $items', { items: __('pruvious-dashboard', 'files') })"
      @updateFilter="onUpdateFilter()"
    />

    <PruviousMediaMovePopup v-model:visible="movePopupVisible" :directory="directory" :selection="selection" />
  </PruviousBase>
</template>

<script lang="ts" setup>
import { ref, useHead, useRoute, useRuntimeConfig, watch } from '#imports'
import { type CastedFieldType } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { stringifyQuery } from '#vue-router'
import { confirmClick, useClickConfirmation } from '../../composables/dashboard/confirm-click'
import { navigateToPruviousDashboardPath, usePruviousDashboard } from '../../composables/dashboard/dashboard'
import {
  createMediaDirectory,
  openUploadDialog,
  useMediaDirectories,
  useMediaUpdated,
} from '../../composables/dashboard/media'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { format } from '../../utils/bytes'
import { Filter } from '../../utils/dashboard/filter'
import { deleteMediaDirectories } from '../../utils/dashboard/media-directory'
import { MediaSelection } from '../../utils/dashboard/media-selection'
import { pruviousFetch } from '../../utils/fetch'
import { objectOmit } from '../../utils/object'
import { parseMediaDirectoryName } from '../../utils/uploads'
import { getCapabilities } from '../../utils/users'

const clickConfirmation = useClickConfirmation()
const dashboard = usePruviousDashboard()
const mediaDirectories = useMediaDirectories()
const mediaUpdated = useMediaUpdated()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const user = useUser()

const directory = parseMediaDirectoryName(route.params.catchAll as string)
const filter = new Filter(stringifyQuery(route.query))
const filterPopupVisible = ref(false)
const movePopupVisible = ref(false)
const selection = new MediaSelection()
const uploadLimitString = format(runtimeConfig.public.pruvious.uploadLimit)!
const userCapabilities = getCapabilities(user.value)

const canCreate =
  dashboard.value.collections.uploads.apiRoutes.create &&
  (user.value?.isAdmin || userCapabilities['collection-uploads-create'])
const canDeleteMany =
  dashboard.value.collections.uploads.apiRoutes.deleteMany &&
  (user.value?.isAdmin || userCapabilities['collection-uploads-delete-many'])
const canUpdate =
  dashboard.value.collections.uploads.apiRoutes.update &&
  (user.value?.isAdmin || userCapabilities['collection-uploads-update'])

const PruviousBase = dashboardMiscComponent.Base()
const PruviousFilterPopup = dashboardMiscComponent.FilterPopup()
const PruviousMediaBreadcrumbs = dashboardMiscComponent.MediaBreadcrumbs()
const PruviousMediaLibrary = dashboardMiscComponent.MediaLibrary()
const PruviousMediaMovePopup = dashboardMiscComponent.MediaMovePopup()
const PruviousSearchMedia = dashboardMiscComponent.SearchMedia()

await loadTranslatableStrings('pruvious-dashboard')

dashboard.value.collection = 'uploads'

useHead({ title: __('pruvious-dashboard', 'Media') })

watch(
  () => route.query,
  () => {
    filter.fromString(stringifyQuery(route.query))
  },
)

async function onOpenDirectory(directory: string) {
  await navigateToPruviousDashboardPath(directory ? `/media/${directory.slice(0, -1)}` : '/media')
}

async function clearFilter() {
  filter.clear()
  await navigateToPruviousDashboardPath('/media', {}, { ...route, query: objectOmit(route.query, 'where' as any) })
}

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

async function onUpdateFilter() {
  const query = filter.toString()
  await navigateToPruviousDashboardPath('/media' + (query ? `?${query}` : ''))
}
</script>
