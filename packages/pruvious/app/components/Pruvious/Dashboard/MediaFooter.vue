<template>
  <div
    class="pui-justify-between"
    :class="{ 'p-media-footer-has-selection': selectionMode === 'none' && state.selectedUploads.length }"
  >
    <PUIPagination
      :currentPage="state.page"
      :goToPageTitle="__('pruvious-dashboard', 'Go to page')"
      :lastPage="state.lastPage"
      :nextPageTitle="__('pruvious-dashboard', 'Next page')"
      :pageLabel="__('pruvious-dashboard', 'Page')"
      :previousPageTitle="__('pruvious-dashboard', 'Previous page')"
      @change="(page) => $emit('update:state', { ...state, page })"
    >
      <template #button="{ currentPage, index, onClick }">
        <button
          v-pui-tooltip="
            __('pruvious-dashboard', 'Showing entries $from to $to', {
              from: (index - 1) * state.perPage + 1,
              to: Math.min(index * state.perPage, state.total),
              total: state.total,
            })
          "
          @click="onClick()"
          type="button"
          class="pui-pagination-button pui-raw"
          :class="{ 'pui-pagination-button-active': currentPage === index }"
        >
          {{ index }}
        </button>
      </template>
    </PUIPagination>

    <div class="pui-row pui-ml-auto">
      <PUIButton
        v-if="selectionMode === 'none' && state.selectedUploads.length && state.canDeleteSelection"
        v-pui-tooltip="
          __('pruvious-dashboard', 'Delete $count $uploads', {
            count: state.selectedUploads.length,
            type: selectionType,
          })
        "
        @click="onDeleteSelection()"
        variant="destructive"
      >
        <Icon mode="svg" name="tabler:trash-x" />
      </PUIButton>

      <PUIButton
        v-if="selectionMode === 'none' && state.selectedUploads.length"
        v-pui-tooltip="__('pruvious-dashboard', 'Clear selection')"
        @click="$emit('update:state', { ...state, selectedUploads: [] })"
        variant="accent"
      >
        <Icon mode="svg" name="tabler:square-off" />
      </PUIButton>

      <PUIButton
        v-if="selectionMode === 'none' && state.selectedUploads.length && state.canUpdateSelection"
        v-pui-tooltip="
          __('pruvious-dashboard', 'Move $count $uploads', { count: state.selectedUploads.length, type: selectionType })
        "
        @click="openMovePopup()"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:file-arrow-right" />
      </PUIButton>

      <PUIButton
        v-if="selectionMode !== 'none'"
        v-pui-tooltip="__('pruvious-dashboard', 'Search files')"
        :variant="searchKeyword ? 'accent' : 'outline'"
        @click="openSearchPopup()"
      >
        <Icon mode="svg" name="tabler:search" />
        <template v-if="searchKeyword" #bubble>
          <PUIBubble></PUIBubble>
        </template>
      </PUIButton>

      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'Configure view')"
        :variant="isDirty ? 'accent' : 'outline'"
        @click="isTableSettingsPopupVisible = true"
      >
        <Icon mode="svg" name="tabler:adjustments" />
        <template v-if="isDirty" #bubble>
          <PUIBubble></PUIBubble>
        </template>
      </PUIButton>

      <PruviousDashboardCreateUploadActions v-if="selectionMode === 'none'" :state="state" />

      <PUIButton v-if="selectionMode === 'multiple'" @click="$emit('applySelection')" variant="primary">
        <span>{{ __('pruvious-dashboard', 'Apply') }} ({{ state.selectedUploads.length }})</span>
      </PUIButton>
    </div>

    <PruviousDashboardTableSettingsPopup
      v-if="isTableSettingsPopupVisible"
      :collection="collection"
      :columns="columns"
      :defaultColumns="columns"
      :defaultOrderBy="defaultParams.orderBy"
      :paginated="{ currentPage: state.page, perPage: state.perPage, lastPage: state.lastPage, total: state.total }"
      :params="{ where: state.where, orderBy: state.orderBy }"
      :size="-1"
      @close="$event().then(() => (isTableSettingsPopupVisible = false))"
      @update:params="
        (params) => $emit('update:state', { ...state, where: params.where as any, orderBy: params.orderBy as any })
      "
      hideColumnsTab
      width="64rem"
    />

    <PUIPopup
      v-if="isMovePopupVisible"
      :size="-1"
      @close="$event().then(() => (isMovePopupVisible = false))"
      fullHeight="auto"
      ref="movePopup"
      width="32rem"
    >
      <template #header>
        <div class="pui-row">
          <span class="pui-medium">
            {{
              __('pruvious-dashboard', 'Move $count $uploads', {
                count: state.selectedUploads.length,
                type: selectionType,
              })
            }}
          </span>

          <PUIButton
            :size="-2"
            :title="__('pruvious-dashboard', 'Close')"
            @click="closeMovePopup()"
            variant="ghost"
            class="pui-ml-auto"
          >
            <Icon mode="svg" name="tabler:x" />
          </PUIButton>
        </div>
      </template>

      <div v-if="hasValidTargetDirectories">
        <PruviousDashboardMediaTargetDirectory :directory="targetDirectories[0]!" @select="moveUploads" />
      </div>

      <p v-else class="pui-muted">
        {{ __('pruvious-dashboard', 'There are no folders available to move the selected uploads to.') }}
      </p>

      <template #footer>
        <div class="pui-row">
          <PUIButton @click="closeMovePopup()" variant="outline" class="pui-ml-auto">
            {{ __('pruvious-dashboard', 'Close') }}
          </PUIButton>
        </div>
      </template>
    </PUIPopup>

    <PUIPopup
      v-if="isSearchPopupVisible"
      :size="-1"
      @close="$event().then(() => (isSearchPopupVisible = false))"
      fullHeight="auto"
      ref="searchPopup"
      width="26rem"
    >
      <template #header>
        <div class="pui-row">
          <span class="pui-medium">
            {{ __('pruvious-dashboard', 'Search files') }}
          </span>

          <PUIButton
            :size="-2"
            :title="__('pruvious-dashboard', 'Close')"
            @click="closeSearchPopup()"
            variant="ghost"
            class="pui-ml-auto"
          >
            <Icon mode="svg" name="tabler:x" />
          </PUIButton>
        </div>
      </template>

      <PUIField>
        <PUIFieldLabel>
          <label for="keyword">
            {{ __('pruvious-dashboard', 'Keyword') }}
          </label>
        </PUIFieldLabel>

        <PUIInput
          v-model="searchKeywordInput"
          :placeholder="__('pruvious-dashboard', 'Search by filename...')"
          @keydown.enter="search()"
          autofocus
          id="keyword"
          name="keyword"
        />
      </PUIField>

      <div class="p-media-footer-search-popup-buttons pui-row">
        <PUIButton @click="closeSearchPopup()" variant="outline">
          {{ __('pruvious-dashboard', 'Cancel') }}
        </PUIButton>

        <PUIButton @click="search()">
          {{ __('pruvious-dashboard', 'Search') }}
        </PUIButton>
      </div>
    </PUIPopup>
  </div>
</template>

<script lang="ts" setup>
import {
  $pfetchDashboard,
  __,
  maybeTranslate,
  selectFrom,
  usePruviousDashboard,
  type DashboardMediaLibraryState,
} from '#pruvious/client'
import type { DeleteUploadResult, MoveUploadResult } from '#pruvious/server'
import { puiDialog } from '@pruvious/ui/pui/dialog'
import { puiHasModifierKey, puiIsEditingText, usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import { usePUIOverlayCounter } from '@pruvious/ui/pui/overlay'
import { puiColumn, type PUIColumns } from '@pruvious/ui/pui/table'
import { puiToast } from '@pruvious/ui/pui/toast'
import { deepCompare, isDefined, isObject, remap, titleCase } from '@pruvious/utils'
import { onKeyStroke, useEventListener } from '@vueuse/core'
import { basename, join } from 'pathe'

export interface TargetDirectory {
  path: string
  name: string
  disabled: boolean
  children: TargetDirectory[]
}

const props = defineProps({
  state: {
    type: Object as PropType<DashboardMediaLibraryState>,
    required: true,
  },
  defaultParams: {
    type: Object as PropType<Pick<DashboardMediaLibraryState, 'orderBy' | 'page' | 'perPage'>>,
    required: true,
  },
  isDirty: {
    type: Boolean,
    required: true,
  },
  selectionMode: {
    type: String as PropType<'single' | 'multiple' | 'none'>,
    default: 'none',
  },
})

const emit = defineEmits<{
  'update:state': [state: DashboardMediaLibraryState]
  'applySelection': []
}>()

const dashboard = usePruviousDashboard()
const runtimeConfig = useRuntimeConfig()
const collection = {
  name: 'Uploads' as const,
  definition: dashboard.value!.collections.Uploads!,
}
const overlayCounter = usePUIOverlayCounter()
const popupRoot = inject<Ref<HTMLElement | undefined> | null>('popup', null)
const { listen, isListening } = usePUIHotkeys({
  allowInOverlays: true,
  target: () => popupRoot?.value,
  listen: false,
})
const isTableSettingsPopupVisible = ref(false)
const movePopup = useTemplateRef('movePopup')
const searchPopup = useTemplateRef('searchPopup')
const isMovePopupVisible = ref(false)
const isSearchPopupVisible = ref(false)
const searchKeyword = ref('')
const searchKeywordInput = ref('')
const targetDirectories = ref<TargetDirectory[]>([])
const hasValidTargetDirectories = ref(false)
const columns = resolveColumns()
const selectionType = computed(() => {
  const hasDirectories = props.state.selectedUploads.some(({ type }) => type === 'directory')
  const hasFiles = props.state.selectedUploads.some(({ type }) => type === 'file')
  if (hasDirectories && hasFiles) {
    return 'mixed'
  } else if (hasDirectories) {
    return 'directories'
  } else if (hasFiles) {
    return 'files'
  } else {
    return 'none'
  }
})

let currentOverlayCounter = overlayCounter.value

onMounted(() => {
  setTimeout(() => {
    if (popupRoot?.value) {
      isListening.value = true
    }
    setTimeout(() => {
      currentOverlayCounter = overlayCounter.value
    })
  })
})

useEventListener('pruvious:create-upload-directory-complete' as any, () => {
  if (isMovePopupVisible.value) {
    openMovePopup()
  }
})

onKeyStroke('ArrowLeft', (e) => {
  if (
    !puiHasModifierKey(e) &&
    !puiIsEditingText() &&
    overlayCounter.value === currentOverlayCounter &&
    props.state.page > 1
  ) {
    e.preventDefault()
    emit('update:state', { ...props.state, page: props.state.page - 1 })
  }
})

onKeyStroke('ArrowRight', (e) => {
  if (
    !puiHasModifierKey(e) &&
    !puiIsEditingText() &&
    overlayCounter.value === currentOverlayCounter &&
    props.state.page < props.state.lastPage
  ) {
    e.preventDefault()
    emit('update:state', { ...props.state, page: props.state.page + 1 })
  }
})

listen('search', (event) => {
  if (props.selectionMode !== 'none' && overlayCounter.value === currentOverlayCounter) {
    event.preventDefault()
    openSearchPopup()
  }
})

watch(
  () => props.state.where,
  (where) => {
    if (
      where?.length === 2 &&
      deepCompare(where[0], { field: 'type', operator: '=', value: 'file' }) &&
      !('or' in where[1]!) &&
      where[1]!.field === 'path' &&
      where[1]!.operator === 'ilike'
    ) {
      searchKeyword.value = String(where[1]!.value).replaceAll('%', ' ').trim()
    } else {
      searchKeyword.value = ''
    }
  },
  { deep: true, immediate: true },
)

function resolveColumns(): PUIColumns {
  return remap(collection.definition.fields, (fieldName, options) => [
    fieldName,
    puiColumn({
      label:
        'ui' in options && isDefined(options.ui?.label)
          ? maybeTranslate(options.ui.label)
          : __('pruvious-dashboard', titleCase(fieldName, false) as any),
      sortable:
        options.ui?.dataTable === false || (isObject(options.ui?.dataTable) && options.ui.dataTable.sortable === false)
          ? false
          : options._dataType === 'text'
            ? 'text'
            : 'numeric',
      minWidth: '16rem',
    }),
  ])
}

async function onDeleteSelection() {
  const action = await puiDialog({
    content:
      __('pruvious-dashboard', 'Are you sure you want to delete $count $uploads?', {
        count: props.state.selectedUploads.length,
        type: selectionType.value,
      }) +
      (selectionType.value === 'directories' || selectionType.value === 'mixed'
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

    const pathsToDelete: string[] = []
    const candidates = props.state.selectedUploads.map(({ path }) => path).sort()

    for (const path of candidates) {
      if (!pathsToDelete.some((p) => path.startsWith(`${p}/`))) {
        pathsToDelete.push(path)
      }
    }

    for (let i = 0; i < pathsToDelete.length; i += 50) {
      const queries: Promise<any>[] = []
      const batch = pathsToDelete.slice(i, i + 50)

      for (const path of batch) {
        queries.push(
          $pfetchDashboard(runtimeConfig.public.pruvious.apiBasePath + 'uploads/path' + path, {
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
            .catch(() => null),
        )
      }

      await Promise.all(queries)
    }

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

async function openMovePopup() {
  const allDirectories = await selectFrom('Uploads')
    .select('path')
    .where('type', '=', 'directory')
    .orderBy('path')
    .all()

  targetDirectories.value = [
    {
      path: '/',
      name: __('pruvious-dashboard', 'Root folder'),
      disabled: props.state.selectedUploads.every(({ level }) => level === 0),
      children: sortTargetDirectories(allDirectories.data ?? []),
    },
  ]
  hasValidTargetDirectories.value = getValidTargetDirectories(targetDirectories.value).length > 0
  isMovePopupVisible.value = true
}

function closeMovePopup() {
  movePopup.value?.close().then(() => (isMovePopupVisible.value = false))
}

function openSearchPopup() {
  isSearchPopupVisible.value = true
  searchKeywordInput.value = searchKeyword.value
}

function search() {
  const keyword = searchKeywordInput.value.trim()

  if (keyword !== searchKeyword.value) {
    if (keyword) {
      emit('update:state', {
        ...props.state,
        page: 1,
        where: [
          { field: 'type', operator: '=', value: 'file' },
          { field: 'path', operator: 'ilike', value: `%${keyword.replace(/ +/g, '%')}%` },
        ],
      })
    } else {
      emit('update:state', { ...props.state, page: 1, where: [] })
    }
  }

  closeSearchPopup()
}

function closeSearchPopup() {
  searchPopup.value?.close().then(() => (isSearchPopupVisible.value = false))
}

function sortTargetDirectories(directories: { path: string }[]): TargetDirectory[] {
  const sorted: TargetDirectory[] = []

  for (const directory of directories) {
    const parts = directory.path.split('/').filter((part) => part.length > 0)
    let currentLevel = sorted

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      let existingDir = currentLevel.find((dir) => dir.name === part)

      if (!existingDir) {
        const path = '/' + parts.slice(0, i + 1).join('/')
        existingDir = {
          name: part,
          path,
          disabled: props.state.selectedUploads.some(
            (upload) => upload.path === path || path.startsWith(`${upload.path}/`),
          ),
          children: [],
        }
        currentLevel.push(existingDir)
      }

      currentLevel = existingDir.children
    }
  }

  for (const dir of sorted) {
    sortChildTargetDirectories(dir)
  }

  return sorted
}

function sortChildTargetDirectories(node: TargetDirectory) {
  node.children.sort((a, b) => a.name.localeCompare(b.name))
  for (const child of node.children) {
    sortChildTargetDirectories(child)
  }
}

function getValidTargetDirectories(directories: TargetDirectory[]): TargetDirectory[] {
  const validDirs: TargetDirectory[] = []

  for (const dir of directories) {
    if (!dir.disabled) {
      validDirs.push(dir)
    }

    const childValidDirs = getValidTargetDirectories(dir.children)
    validDirs.push(...childValidDirs)
  }

  return validDirs
}

async function moveUploads(target: TargetDirectory) {
  closeMovePopup()

  for (let i = 0; i < props.state.selectedUploads.length; i += 50) {
    const pathsToCheck = props.state.selectedUploads
      .slice(i, i + 50)
      .map(({ path }) => {
        const newPath = join(target.path, basename(path))
        return newPath === path ? '' : newPath
      })
      .filter(Boolean)

    if (!pathsToCheck.length) {
      continue
    }

    const existsQuery = await selectFrom('Uploads').select('id').where('path', 'in', pathsToCheck).first()

    if (existsQuery.data) {
      const action = await puiDialog({
        content: __(
          'pruvious-dashboard',
          'Some uploads already exist in the target directory. Do you want to overwrite them?',
        ),
        actions: [
          { name: 'cancel', label: __('pruvious-dashboard', 'Cancel') },
          { name: 'move', label: __('pruvious-dashboard', 'OK'), variant: 'primary' },
        ],
      })

      if (action === 'move') {
        break
      } else {
        return
      }
    }
  }

  let count = 0
  let type: 'files' | 'directories' | 'mixed' | 'none' = 'none'

  const pathsToMove = props.state.selectedUploads.map(({ path }) => path).sort((a, b) => b.length - a.length)

  for (let i = 0; i < pathsToMove.length; i += 50) {
    const queries: Promise<any>[] = []
    const batch = pathsToMove.slice(i, i + 50)

    for (const path of batch) {
      queries.push(
        $pfetchDashboard(runtimeConfig.public.pruvious.apiBasePath + 'uploads/move/path' + path, {
          method: 'patch',
          body: {
            path: join(target.path, basename(path)),
          },
          query: { overwrite: true },
        })
          .then((results) => {
            const moved = (results as MoveUploadResult<any, false>[]).filter(({ success }) => success)
            const movedFiles = moved.filter(({ details }) => details.type === 'file').length
            const movedDirectories = moved.filter(({ details }) => details.type === 'directory').length
            const movedType =
              movedFiles > 0 && movedDirectories > 0
                ? 'mixed'
                : movedDirectories > 0
                  ? 'directories'
                  : movedFiles > 0
                    ? 'files'
                    : 'none'
            count += moved.length
            if (type === 'none') {
              type = movedType
            } else if (type !== movedType && movedType !== 'none') {
              type = 'mixed'
            }
          })
          .catch(() => null),
      )
    }

    await Promise.all(queries)
  }

  if (count) {
    window.dispatchEvent(new CustomEvent('pruvious:move-upload-complete'))
    puiToast(__('pruvious-dashboard', 'Moved $count $uploads', { count, type }), {
      type: 'success',
    })
  } else {
    puiToast(__('pruvious-dashboard', 'No uploads were moved'))
  }
}
</script>

<style scoped>
.p-media-footer-search-popup-buttons {
  justify-content: flex-end;
  margin-top: 0.75rem;
}

:deep(.pui-pagination-buttons) {
  margin: -0.75rem -0.25rem;
  padding: 0.75rem 0.25rem;
}

@container (max-width: 767px) {
  .p-media-footer-has-selection .pui-pagination {
    display: none;
  }
}
</style>
