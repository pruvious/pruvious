<template>
  <div class="p-media-library" :class="{ 'p-media-library-moving': isMoving }">
    <template v-if="groupedUploads.length || !ready">
      <div v-for="{ group, label, uploads } of groupedUploads" :key="group" class="p-media-group">
        <span v-if="label" class="p-media-group-label">{{ label }}</span>
        <div class="p-media-group-items">
          <PruviousDashboardMediaItem
            v-for="upload of uploads"
            :disabledResolver="disabledResolver"
            :key="upload.id"
            :linkHandler="linkHandler"
            :permissionsResolver="recordsPermissions.resolver"
            :selectionMode="selectionMode"
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
import { __ } from '#pruvious/app'
import {
  selectFrom,
  useCollectionRecordPermissions,
  useIsMoving,
  usePruviousDashboard,
  type DashboardMediaLibraryState,
  type ResolvedCollectionRecordPermissions,
  type UploadItem,
} from '#pruvious/dashboard'
import type { MediaCategory } from '#pruvious/server'
import { deepCompare, uniqueArrayByProp } from '@pruvious/utils'
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
  filterUnlocked: {
    type: Boolean,
    default: false,
  },
  filterCategory: {
    type: String as PropType<MediaCategory>,
  },
})

const emit = defineEmits<{
  'update:state': [state: DashboardMediaLibraryState]
  'update:customSelection': [selection: number[]]
}>()

const dashboard = usePruviousDashboard()
const collection = { name: 'Uploads' as const, definition: dashboard.value!.collections.Uploads! }
const ready = ref(false)
const recordsPermissions = useCollectionRecordPermissions(collection)
const isMoving = useIsMoving()
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

  if (props.filterUnlocked) {
    query.where('isLocked', '=', false)
  }

  if (props.filterCategory) {
    query.orGroup([
      (eb) => eb.where('category', '=', props.filterCategory!),
      (eb) => eb.where('type', '=', 'directory'),
    ])
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

    emit('update:state', {
      ...props.state,
      selectedUploads: uniqueArrayByProp([...props.state.selectedUploads, ...newSelection], 'id'),
      canUpdateSelection,
      canDeleteSelection,
    })
  } else {
    if (!props.state.selectedUploads.some(({ id }) => id === upload.id)) {
      selectionOrigin.value = upload
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

    selectionOrigin.value = null

    emit('update:state', {
      ...props.state,
      selectedUploads: newSelection,
      canUpdateSelection,
      canDeleteSelection,
    })
  }
}

function updateSelectionOrigin() {
  if (
    !props.state.selectedUploads.length ||
    (selectionOrigin.value &&
      (!props.state.selectedUploads.some(({ id }) => id === selectionOrigin.value?.id) ||
        !uploads.value.some(({ id }) => id === selectionOrigin.value?.id)))
  ) {
    selectionOrigin.value = null
  }
}

function emitClearSelection() {
  if (props.state.selectedUploads.length) {
    if (props.selectionMode === 'none') {
      emit('update:state', {
        ...props.state,
        selectedUploads: [],
        canUpdateSelection: false,
        canDeleteSelection: false,
      })
    } else {
      selectionOrigin.value = null
    }
  }
}

const emitClearSelectionDebounced = useDebounceFn(emitClearSelection, 100)

function flattenGroupedUploads(): UploadItem[] {
  return groupedUploads.value
    .reduce<UploadItem[]>((acc, group) => {
      return acc.concat(group.uploads)
    }, [])
    .filter(({ isLocked }) => !isLocked)
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
  margin-top: 1.25rem;
}

.p-media-group-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  gap: 0.75rem;
}

.p-media-group-label {
  position: sticky;
  top: 0;
  z-index: 3;
  display: block;
  margin-bottom: 0.25rem;
  padding: 0.25rem 0;
  background-color: hsl(var(--pui-background));
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.75rem;
  font-weight: 600;
  line-height: calc(1em + 0.5rem);
  text-transform: uppercase;
}

.p-media-group:first-child .p-media-group-label {
  margin-top: -0.25rem;
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
  }
}
</style>
