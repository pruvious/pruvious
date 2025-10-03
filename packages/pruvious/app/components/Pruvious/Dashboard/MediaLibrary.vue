<template>
  <div>
    <pre>{{ state }}</pre>
    <pre>{{ uploads }}</pre>
  </div>
</template>

<script lang="ts" setup>
import {
  hasPermission,
  selectFrom,
  useCollectionRecordPermissions,
  usePruviousDashboard,
  type DashboardMediaLibraryState,
  type ResolvedTranslatableCollectionRecordPermissions,
} from '#pruvious/client'
import type { Collections } from '#pruvious/server'
import { usePUIOverlayCounter } from '@pruvious/ui/pui/overlay'
import { deepCompare } from '@pruvious/utils'
import { useDebounceFn, useEventListener } from '@vueuse/core'

const props = defineProps({
  state: {
    type: Object as PropType<DashboardMediaLibraryState>,
    required: true,
  },
  queryString: {
    type: String,
    required: true,
  },
})

const emit = defineEmits<{
  'update:state': [DashboardMediaLibraryState]
}>()

const dashboard = usePruviousDashboard()
const collection = { name: 'Uploads' as const, definition: dashboard.value!.collections.Uploads! }
const canManage = hasPermission('collection:uploads:manage')
const canCreate = collection.definition.api.create && hasPermission('collection:uploads:create')
const canDelete = collection.definition.api.delete && hasPermission('collection:uploads:delete')
const isManaged = collection.definition.authorField || collection.definition.editorsField
const recordsPermissions = useCollectionRecordPermissions(collection)
const overlayCounter = usePUIOverlayCounter()
const currentOverlayCounter = overlayCounter.value
const resolvedPermissions = ref<ResolvedTranslatableCollectionRecordPermissions | null>(null)
const isTableSettingsPopupVisible = ref(false)
const uploads = ref<(Collections['Uploads']['TCastedTypes'] & { id: number })[]>([])

async function refresh() {
  const { currentDirectory, where } = props.state
  const level = currentDirectory === '/' ? 0 : currentDirectory.split('/').length - 1
  const query = selectFrom('Uploads').fromQueryString(props.queryString)

  if (level > 0) {
    query.where('path', 'like', `${currentDirectory}/%`)
  }

  // @todo show folder in upload items if we are showing uploads from subfolders
  query.where('level', where.length ? '>=' : '=', level)

  const result = await query.paged(props.state.page, props.state.perPage).paginate()

  if (result.success) {
    uploads.value = result.data.records as any
    const newState = { ...props.state, total: result.data.total, lastPage: result.data.lastPage }
    if (!deepCompare(newState, props.state)) {
      emit('update:state', newState)
    }
  }
}

const refreshDebounced = useDebounceFn(refresh, 100)

watch(
  () => [props.state.currentDirectory, props.queryString],
  (newValue, oldValue) => {
    if (!deepCompare(newValue, oldValue)) {
      refreshDebounced()
    }
  },
  { immediate: true },
)

useEventListener('pruvious:upload-complete' as any, refreshDebounced)
</script>
