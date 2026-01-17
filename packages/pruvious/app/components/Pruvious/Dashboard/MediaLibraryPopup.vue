<template>
  <PUIPopup
    v-if="isVisible"
    :size="-1"
    @close="$event().then(() => $emit('update:isVisible', false))"
    fullHeight
    ref="popup"
    width="105rem"
  >
    <template #header>
      <span class="p-title pui-row">
        <PruviousDashboardMediaBreadcrumbs
          v-model:state="state"
          :linkHandler="(path) => linkHandler({ id: 0, path, type: 'directory' })"
          @update:state="updateRouteFromState($event)"
        />

        <PUIButton
          :size="-2"
          :title="__('pruvious-dashboard', 'Close')"
          @click="popup?.close().then(() => $emit('update:isVisible', false))"
          variant="ghost"
          class="pui-ml-auto"
        >
          <Icon mode="svg" name="tabler:x" />
        </PUIButton>
      </span>
    </template>

    <PruviousDashboardMediaLibrary
      v-model:state="state"
      :disabledResolver="disabledResolver"
      :filterCategory="filterCategory"
      :filterUnlocked="filterUnlocked"
      :linkHandler="linkHandler"
      :queryString="queryString"
      :selectionMode="selectionMode"
      :showPathTooltips="isDirty"
      @update:state="updateRouteFromState($event)"
    />

    <template #footer>
      <PruviousDashboardMediaFooter
        v-model:state="state"
        :defaultParams="defaultParams"
        :isDirty="isDirty"
        :selectionMode="selectionMode"
        @applySelection="
          () => {
            $emit(
              'update:modelValue',
              state.selectedUploads.map((upload) => upload.id),
            )
            popup?.close().then(() => $emit('update:isVisible', false))
          }
        "
        @update:state="updateRouteFromState($event)"
      />
    </template>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import {
  batchSelectIn,
  getDefaultDashboardMediaLibraryState,
  selectFrom,
  usePruviousDashboardMediaLibraryPopup,
  useSelectQueryBuilderParams,
  type DashboardMediaLibraryState,
  type UploadItem,
} from '#pruvious/dashboard'
import type { MediaCategory } from '#pruvious/server'
import { usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import { clearArray, deepClone, toArray } from '@pruvious/utils'
import { dirname } from 'pathe'
import { validateUpload, type UploadFieldValidation } from '../../../utils/pruvious/dashboard/upload-fields'

const props = defineProps({
  modelValue: {
    type: [Number, Array, null] as PropType<number | number[] | null>,
    required: true,
  },
  selectionMode: {
    type: String as PropType<'single' | 'multiple'>,
    required: true,
  },
  validation: {
    type: Object as PropType<UploadFieldValidation>,
  },
  isVisible: {
    type: Boolean,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  selectLabel: {
    type: String,
    required: true,
  },
  initialFilePath: {
    type: String,
  },
  filterUnlocked: {
    type: Boolean,
    default: true,
  },
  filterCategory: {
    type: String as PropType<MediaCategory>,
  },
})

const emit = defineEmits<{
  'update:modelValue': [value: number | number[] | null]
  'update:isVisible': [isVisible: boolean]
}>()

const popup = useTemplateRef('popup')
const mediaLibraryPopup = usePruviousDashboardMediaLibraryPopup()
const state = ref<DashboardMediaLibraryState>(getDefaultDashboardMediaLibraryState())
const defaultOrderBy = deepClone(state.value.orderBy)
const defaultParams: Pick<DashboardMediaLibraryState, 'orderBy' | 'page' | 'perPage'> = {
  orderBy: defaultOrderBy,
  page: 1,
  perPage: 1000,
}
const route: { query: Record<string, any> } = { query: {} }
const queryString = ref('')
const { params, refresh, isDirty } = useSelectQueryBuilderParams({
  route,
  syncRoute: 'mutate',
  init: false,
  callback: async ({ queryString: _queryString, params }) => {
    state.value.where = params.where as any
    state.value.orderBy = (params.orderBy as any) ?? defaultOrderBy
    const { page, perPage } = getPagedFromParams(params)
    state.value.page = page
    state.value.perPage = perPage
    queryString.value = _queryString
  },
  defaultParams,
  checkDirty: ['where'],
})
const { listen, isListening } = usePUIHotkeys({
  allowInOverlays: true,
  target: () => popup.value?.root,
  listen: false,
})
const hotkeyListeners: Array<() => void> = []

let directoryChanged = false

watch(
  () => props.isVisible,
  (value, oldValue) => {
    if (value) {
      if (props.initialFilePath && !directoryChanged) {
        state.value.currentDirectory = dirname(props.initialFilePath)
        directoryChanged = true
      }
      mediaLibraryPopup.value.isOpen = true
      mediaLibraryPopup.value.currentDirectory = state.value.currentDirectory

      if (props.modelValue) {
        batchSelectIn(toArray(props.modelValue), (batch) =>
          selectFrom('Uploads')
            .where('id', 'in', batch)
            .all()
            .then(({ data }) => data ?? []),
        ).then((data) => {
          state.value.selectedUploads = data.sort(
            (a, b) => toArray(props.modelValue).indexOf(a.id) - toArray(props.modelValue).indexOf(b.id),
          )
        })
      } else {
        state.value.selectedUploads = []
      }

      refresh()

      setTimeout(() => {
        isListening.value = true
        hotkeyListeners.push(
          listen('save', (event) => {
            event.preventDefault()
            if (props.selectionMode === 'multiple') {
              emit(
                'update:modelValue',
                state.value.selectedUploads.map((upload) => upload.id),
              )
            }
            popup.value?.close().then(() => emit('update:isVisible', false))
          }),
        )
      })
    } else if (!value && oldValue) {
      mediaLibraryPopup.value.isOpen = false
      mediaLibraryPopup.value.currentDirectory = '/'
      hotkeyListeners.forEach((removeListener) => removeListener())
      clearArray(hotkeyListeners)
      isListening.value = false
    }
  },
  { immediate: true },
)

function linkHandler(upload: Pick<UploadItem, 'id' | 'path' | 'type'>) {
  if (upload.type === 'file' && props.selectionMode === 'single') {
    emit('update:modelValue', upload.id)
    popup.value?.close().then(() => emit('update:isVisible', false))
  } else if (upload.type === 'directory') {
    updateCurrentDirectory(upload.path)
  }
}

function disabledResolver(upload: UploadItem) {
  return validateUpload(upload, props.validation)
}

function getPagedFromParams(params: Record<string, any>) {
  const limit = (params as any).limit ?? defaultParams.perPage
  const offset = (params as any).offset ?? 0
  return { perPage: limit, page: Math.floor(offset / limit) + 1 }
}

function updateRouteFromState(newState: DashboardMediaLibraryState) {
  if (state.value.currentDirectory === newState.currentDirectory) {
    params.value.where = newState.where
    params.value.orderBy = newState.orderBy
    params.value.page = newState.page
    refresh()
  }
}

function updateCurrentDirectory(newDirectory: string) {
  if (state.value.currentDirectory !== newDirectory) {
    state.value.currentDirectory = newDirectory
    mediaLibraryPopup.value.currentDirectory = newDirectory
    directoryChanged = true
  }
}
</script>

<style scoped>
:deep(.p-media-item-box) {
  --pui-card: var(--pui-secondary);
  --pui-card-foreground: var(--pui-secondary-foreground);
}
</style>
