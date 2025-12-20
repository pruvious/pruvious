<template>
  <div class="p-media-library" :class="{ 'p-media-library-moving': isMoving }">
    <template v-if="groupedUploads.length || !ready">
      <div v-for="{ group, label, uploads } of groupedUploads" :key="group" class="p-media-group">
        <span v-if="label" class="p-media-group-label">{{ label }}</span>
        <div class="p-media-group-items">
          <PruviousDashboardMediaItem
            v-for="upload of uploads"
            :key="upload.id"
            :permissionsResolver="recordsPermissions.resolver"
            :showPathTooltip="showPathTooltips"
            :state="state"
            :upload="upload"
            @deselect="onDeselect"
            @select="onSelect"
          />
        </div>
      </div>
    </template>
    <div v-else class="p-media-empty">
      <span v-if="state.currentDirectory === '/'">{{ __('pruvious-dashboard', 'No uploads found') }}</span>
      <span v-else>{{ __('pruvious-dashboard', 'Folder is empty') }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  __,
  selectFrom,
  useCollectionRecordPermissions,
  usePruviousDashboard,
  usePruviousDashboardIsMoving,
  type DashboardMediaLibraryState,
  type ResolvedCollectionRecordPermissions,
  type UploadItem,
} from '#pruvious/client'
import { usePUIOverlayCounter } from '@pruvious/ui/pui/overlay'
import { deepCompare } from '@pruvious/utils'
import { useDebounceFn, useEventListener, useKeyModifier } from '@vueuse/core'

const props = defineProps({
  state: {
    type: Object as PropType<DashboardMediaLibraryState>,
    required: true,
  },
  queryString: {
    type: String,
    required: true,
  },
  showPathTooltips: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  'update:state': [DashboardMediaLibraryState]
}>()

const dashboard = usePruviousDashboard()
const collection = { name: 'Uploads' as const, definition: dashboard.value!.collections.Uploads! }
const ready = ref(false)
const recordsPermissions = useCollectionRecordPermissions(collection)
const overlayCounter = usePUIOverlayCounter()
const isMoving = usePruviousDashboardIsMoving()
const uploads = ref<UploadItem[]>([])
const groupedUploads = computed<{ group: string; label?: string; uploads: UploadItem[] }[]>(() => {
  const groupBy = props.state.orderBy[0]?.field
  if (groupBy === 'category') {
    const groups: { group: string; label?: string; uploads: UploadItem[] }[] = []
    for (const upload of uploads.value) {
      if (!groups.some((g) => g.group === upload.category)) {
        groups.push({
          group: upload.category,
          label:
            upload.type === 'file'
              ? upload.category
                ? __('pruvious-dashboard', `cat:${upload.category}`)
                : __('pruvious-dashboard', 'Uncategorized')
              : __('pruvious-dashboard', 'Folders'),
          uploads: [],
        })
      }
      const group = groups.find((g) => g.group === upload.category)!
      group.uploads.push(upload)
    }
    return groups
  } else if (groupBy === 'mime') {
    const groups: { group: string; label?: string; uploads: UploadItem[] }[] = []
    for (const upload of uploads.value) {
      if (!groups.some((g) => g.group === upload.mime)) {
        groups.push({
          group: upload.mime,
          label:
            upload.type === 'file'
              ? upload.mime || __('pruvious-dashboard', 'Uncategorized')
              : __('pruvious-dashboard', 'Folders'),
          uploads: [],
        })
      }
      const group = groups.find((g) => g.group === upload.mime)!
      group.uploads.push(upload)
    }
    return groups
  } else if (groupBy === 'type') {
    const groups: { group: string; label: string; uploads: UploadItem[] }[] = []
    for (const upload of uploads.value) {
      if (!groups.some((g) => g.group === upload.type)) {
        groups.push({
          group: upload.type,
          label: upload.type === 'file' ? __('pruvious-dashboard', 'Files') : __('pruvious-dashboard', 'Folders'),
          uploads: [],
        })
      }
      const group = groups.find((g) => g.group === upload.type)!
      group.uploads.push(upload)
    }
    return groups
  } else {
    return [{ group: '', uploads: uploads.value }]
  }
})

async function refresh() {
  const { currentDirectory, where } = props.state
  const level = currentDirectory === '/' ? 0 : currentDirectory.split('/').length - 1
  const query = selectFrom('Uploads').fromQueryString(props.queryString)

  if (level > 0) {
    query.where('path', 'like', `${currentDirectory}/%`)
  }

  query.where('level', where?.length ? '>=' : '=', level)

  const [result, exists] = await Promise.all([
    query.paged(props.state.page, props.state.perPage).paginate(),
    currentDirectory === '/'
      ? new Promise<{ data: true }>((resolve) => resolve({ data: true }))
      : selectFrom('Uploads').select('id').where('path', '=', currentDirectory).where('type', '=', 'directory').first(),
  ])

  if (!exists.data) {
    uploads.value = []

    emit('update:state', {
      ...props.state,
      currentDirectory: '/',
      total: 0,
      page: 1,
      lastPage: 1,
    })
  } else if (result.success) {
    uploads.value = result.data.records as any
    const newState = { ...props.state, total: result.data.total, lastPage: result.data.lastPage }
    if (!deepCompare(newState, props.state)) {
      emit('update:state', newState)
    }
  }

  ready.value = true
  setTimeout(emitClearSelection)
}
const shiftKeyState = useKeyModifier('Shift')
const selectionOrigin = ref<UploadItem | null>(null)

const refreshDebounced = useDebounceFn(refresh, 100)

watch(
  () => [props.state.currentDirectory, props.queryString],
  (newValue, oldValue) => {
    if (!deepCompare(newValue, oldValue)) {
      ready.value = false
      refreshDebounced()
    }
  },
  { immediate: true },
)

watch(
  () => props.state.selectedUploads,
  () => updateSelectionOrigin(),
)

useEventListener('pruvious:upload-complete' as any, refreshDebounced)
useEventListener('pruvious:create-upload-directory-complete' as any, refreshDebounced)
useEventListener('pruvious:move-upload-complete' as any, () => {
  emitClearSelectionDebounced()
  refreshDebounced()
})
useEventListener('pruvious:update-upload-complete' as any, refreshDebounced)
useEventListener('pruvious:delete-upload-complete' as any, () => {
  emitClearSelectionDebounced()
  refreshDebounced()
})

async function onSelect(upload: UploadItem) {
  if (shiftKeyState.value && selectionOrigin.value) {
    const flattenedUploads = flattenGroupedUploads()
    const originIndex = flattenedUploads.findIndex(({ id }) => id === selectionOrigin.value?.id)
    const targetIndex = flattenedUploads.findIndex(({ id }) => id === upload.id)
    const [start, end] = originIndex < targetIndex ? [originIndex, targetIndex] : [targetIndex, originIndex]
    const newSelection: UploadItem[] = []
    let canUpdateSelection = true
    let canDeleteSelection = true

    for (let i = start; i <= end; i++) {
      const upload = flattenedUploads[i]!
      const { canUpdate, canDelete } = await resolveUploadPermissions(upload)
      if (canUpdate || canDelete) {
        newSelection.push(upload)
      }
      if (!canUpdate) {
        canUpdateSelection = false
      }
      if (!canDelete) {
        canDeleteSelection = false
      }
    }

    if (originIndex > targetIndex) {
      newSelection.reverse()
    }

    emit('update:state', { ...props.state, selectedUploads: newSelection, canUpdateSelection, canDeleteSelection })
  } else {
    if (!props.state.selectedUploads.some(({ id }) => id === upload.id)) {
      const { canUpdate, canDelete } = await resolveUploadPermissions(upload)
      emit('update:state', {
        ...props.state,
        selectedUploads: [...props.state.selectedUploads, upload],
        canUpdateSelection: canUpdate,
        canDeleteSelection: canDelete,
      })
    }
  }
}

async function onDeselect(upload: UploadItem) {
  if (
    shiftKeyState.value &&
    selectionOrigin.value &&
    (props.state.selectedUploads.length !== 1 || props.state.selectedUploads[0]?.id !== upload.id)
  ) {
    await onSelect(upload)
  } else {
    const newSelection = props.state.selectedUploads.filter(({ id }) => id !== upload.id)
    let canUpdateSelection = true
    let canDeleteSelection = true

    for (const selectedUpload of newSelection) {
      const { canUpdate, canDelete } = await resolveUploadPermissions(selectedUpload)
      if (!canUpdate) {
        canUpdateSelection = false
      }
      if (!canDelete) {
        canDeleteSelection = false
      }
    }

    emit('update:state', {
      ...props.state,
      selectedUploads: newSelection,
      canUpdateSelection,
      canDeleteSelection,
    })
  }
}

function updateSelectionOrigin() {
  if (!props.state.selectedUploads.length) {
    selectionOrigin.value = null
  } else if (
    !selectionOrigin.value ||
    !props.state.selectedUploads.some(({ id }) => id === selectionOrigin.value?.id)
  ) {
    selectionOrigin.value = props.state.selectedUploads[0] ?? null
  }
}

function emitClearSelection() {
  if (props.state.selectedUploads.length) {
    emit('update:state', { ...props.state, selectedUploads: [], canUpdateSelection: false, canDeleteSelection: false })
  }
}

const emitClearSelectionDebounced = useDebounceFn(emitClearSelection, 100)

function flattenGroupedUploads(): UploadItem[] {
  return groupedUploads.value.reduce<UploadItem[]>((acc, group) => {
    return acc.concat(group.uploads)
  }, [])
}

async function resolveUploadPermissions(upload: UploadItem): Promise<ResolvedCollectionRecordPermissions> {
  return recordsPermissions.resolver(Number(upload.id), {
    author: collection.definition.authorField ? upload.author : undefined,
    editors: collection.definition.editorsField ? upload.editors : undefined,
  })
}
</script>

<style scoped>
.p-media-library {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.p-media-group:not(:first-child) {
  margin-top: 1.5rem;
}

.p-media-group-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  gap: 1.5rem;
  padding: 0.75rem;
}

.p-media-group-label {
  position: sticky;
  top: 0;
  z-index: 3;
  display: block;
  padding: 0.25rem 0.75rem;
  background-color: hsl(var(--pui-background));
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.75rem;
  font-weight: 600;
  line-height: calc(1em + 0.5rem);
  text-transform: uppercase;
}

.p-media-empty {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.875rem;
}

@media (max-width: 767px) {
  .p-media-group-items {
    grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
    gap: 0.75rem;
    padding: 0;
  }

  .p-media-group-label {
    padding-right: 0;
    padding-left: 0;
  }
}
</style>
