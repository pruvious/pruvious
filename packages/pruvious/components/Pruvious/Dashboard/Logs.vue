<template>
  <PruviousDashboardTableWrapper ref="tableWrapper" :class="{ 'p-empty': !pagination.total }">
    <PUITable
      v-model:selected="selected"
      v-model:sort="sort"
      :columns="columns"
      :data="data"
      :labels="{
        actions: __('pruvious-dashboard', 'Actions'),
        sortInAscendingOrder: __('pruvious-dashboard', 'Sort in ascending order'),
        sortInDescendingOrder: __('pruvious-dashboard', 'Sort in descending order'),
        selectAll:
          pagination.lastPage === 1
            ? __('pruvious-dashboard', 'Selected $count $entries', { count: selectedCount })
            : __('pruvious-dashboard', 'Selected $entryCount $entries across $pageCount $pages', {
                entryCount: selectedCount,
                pageCount: pagination.lastPage,
              }),
        selectAllIndeterminate: __('pruvious-dashboard', 'Selected $count $entries on this page', {
          count: selectedCount,
        }),
        noData: __('pruvious-dashboard', 'No data available'),
      }"
      :selectable="selectable"
      :selectAllState="selectAllState"
      :showEmptyState="initialized"
      @doubleClick="$emit('update:detailsId', Number($event.id))"
      @selectAll="onSelectAll()"
      @update:selected="refreshSelectable()"
      @update:sort="
        (value) => {
          params.page = 1
          params.orderBy = value ? [{ field: value.column as any, direction: value.direction }] : undefined
          push()
        }
      "
      ref="table"
    >
      <template #cell="cellProps">
        <div class="p-cell">
          <slot v-bind="cellProps" name="cell" />
        </div>
      </template>

      <template #actions="{ row }">
        <PUIDropdownItem
          :title="__('pruvious-dashboard', 'Show details')"
          @click="$emit('update:detailsId', Number(row.id))"
        >
          <Icon mode="svg" name="tabler:list-search" />
          <span>{{ __('pruvious-dashboard', 'Show details') }}</span>
        </PUIDropdownItem>

        <PUIDropdownItem
          v-if="canDeleteLogs && selected[row.id]"
          :title="__('pruvious-dashboard', 'Deselect')"
          @click="deselect(row.id)"
        >
          <Icon mode="svg" name="tabler:square-off" />
          <span>{{ __('pruvious-dashboard', 'Deselect') }}</span>
        </PUIDropdownItem>

        <PUIDropdownItem
          v-else-if="canDeleteLogs && !selected[row.id]"
          :title="__('pruvious-dashboard', 'Select')"
          @click="select(row.id)"
        >
          <Icon mode="svg" name="tabler:checkbox" />
          <span>{{ __('pruvious-dashboard', 'Select') }}</span>
        </PUIDropdownItem>

        <PUIDropdownItem
          v-if="canDeleteLogs"
          :title="__('pruvious-dashboard', 'Delete')"
          @click="onDelete(row.id)"
          destructive
        >
          <Icon mode="svg" name="tabler:trash-x" />
          <span>{{ __('pruvious-dashboard', 'Delete') }}</span>
        </PUIDropdownItem>
      </template>
    </PUITable>

    <PUIPopup
      v-if="details"
      :size="-1"
      @close="$event().then(() => $emit('update:detailsId', null))"
      @keydown="onPopupKeyDown"
      fullHeight
      ref="detailsPopup"
    >
      <template v-if="$slots.detailsHeader" #header>
        <div class="pui-row">
          <slot name="detailsHeader" />
          <PUIButton
            :size="-2"
            :title="__('pruvious-dashboard', 'Close')"
            @click="detailsPopup?.close().then(() => $emit('update:detailsId', null))"
            variant="ghost"
            class="pui-ml-auto"
          >
            <Icon mode="svg" name="tabler:x" />
          </PUIButton>
        </div>
      </template>

      <div class="p-details">
        <slot name="details" />
      </div>

      <template #footer>
        <div class="pui-row">
          <div class="pui-row pui-mr-auto">
            <PUIButton
              v-pui-tooltip="__('pruvious-dashboard', 'Previous entry')"
              :disabled="data.findIndex(({ id }) => id === detailsId) === 0"
              @click="
                () => {
                  const index = data.findIndex(({ id }) => id === detailsId)
                  if (index > 0) {
                    emit('update:detailsId', Number(data[index - 1]!.id))
                  }
                }
              "
              variant="outline"
            >
              <Icon mode="svg" name="tabler:chevron-left" />
            </PUIButton>
            <PUIButton
              v-pui-tooltip="__('pruvious-dashboard', 'Next entry')"
              :disabled="data.findIndex(({ id }) => id === detailsId) === data.length - 1"
              @click="
                () => {
                  const index = data.findIndex(({ id }) => id === detailsId)
                  if (index < data.length - 1) {
                    emit('update:detailsId', Number(data[index + 1]!.id))
                  }
                }
              "
              variant="outline"
            >
              <Icon mode="svg" name="tabler:chevron-right" />
            </PUIButton>
          </div>
          <PUIButton
            v-if="canDeleteLogs"
            @click="
              onDelete(detailsId!).then((success) => {
                if (success) {
                  detailsPopup?.close().then(() => {
                    $emit('update:detailsId', null)
                  })
                } else {
                  detailsPopup?.focus()
                }
              })
            "
            variant="destructive"
          >
            <span>{{ __('pruvious-dashboard', 'Delete') }}</span>
            <Icon mode="svg" name="tabler:trash-x" />
          </PUIButton>
        </div>
      </template>
    </PUIPopup>

    <template #footer>
      <div class="pui-justify-between">
        <PUIPagination
          :currentPage="pagination.currentPage"
          :goToPageTitle="__('pruvious-dashboard', 'Go to page')"
          :lastPage="pagination.lastPage"
          :nextPageTitle="__('pruvious-dashboard', 'Next page')"
          :pageLabel="__('pruvious-dashboard', 'Page')"
          :previousPageTitle="__('pruvious-dashboard', 'Previous page')"
          @change="
            (page) => {
              params.page = page
              push()
            }
          "
        />

        <div class="pui-row pui-ml-auto">
          <PUIButton
            v-if="canDeleteLogs && selectable"
            v-pui-tooltip="__('pruvious-dashboard', 'Delete $count $entries', { count: selectedCount })"
            @click="onDeleteSelection()"
            variant="destructive"
          >
            <Icon mode="svg" name="tabler:trash-x" />
          </PUIButton>

          <!-- @todo
          <PUIButton v-pui-tooltip="'@todo'" variant="outline">
            <Icon mode="svg" name="tabler:adjustments" />
          </PUIButton>
          -->
        </div>
      </div>
    </template>
  </PruviousDashboardTableWrapper>
</template>

<script lang="ts" setup>
import { __, useSelectQueryBuilderParams } from '#pruvious/client'
import type { LogsDatabase } from '#pruvious/server'
import type { Paginated } from '@pruvious/orm'
import { omit } from '@pruvious/utils'
import { onKeyStroke } from '@vueuse/core'
import { logsQueryBuilder } from '../../../utils/pruvious/dashboard/logs'

const props = defineProps({
  /**
   * Name of the log collection to display.
   */
  logCollection: {
    type: String as PropType<keyof LogsDatabase['collections']>,
    required: true,
  },

  /**
   * The default column definitions for the data table.
   */
  columns: {
    type: Object as PropType<PUIColumns>,
    required: true,
  },

  /**
   * The default table sorting order.
   *
   * @default
   * [{ field: 'createdAt', direction: 'desc' }]
   */
  orderBy: {
    type: Array as PropType<{ field: string; direction: 'asc' | 'desc' }[]>,
    default: () => [{ field: 'createdAt', direction: 'desc' }],
  },

  /**
   * Object containing information about the selected log entry.
   * This object is passed to the `details` slot and displayed in the details popup.
   */
  details: {
    type: null as unknown as PropType<Record<string, any> | null>,
    required: true,
  },

  /**
   * ID of the log entry to display in the details popup.
   */
  detailsId: {
    type: null as unknown as PropType<number | null>,
    required: true,
  },

  /**
   * Specifies whether the user has permission to delete log entries.
   */
  canDeleteLogs: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits<{
  'update:details': [details: Record<string, any> | null]
  'update:detailsId': [detailsId: number | null]
}>()

const route = useRoute()
const overlayCounter = usePUIOverlayCounter()
const { listen } = usePUIHotkeys()
const detailsPopup = useTemplateRef('detailsPopup')
const tableWrapper = useTemplateRef('tableWrapper')
const table = useTemplateRef('table')
const selectable = ref(false)
const selected = ref<Record<number | string, boolean>>({})
const allSelected = ref(false)
const selectedCount = computed(() =>
  allSelected.value ? pagination.value.total : Object.values(selected.value).filter(Boolean).length,
)
const selectAllState = ref<boolean | 'indeterminate'>(false)
const initialized = ref(false)
const pagination = ref<Omit<Paginated<any>, 'records'>>({ currentPage: 1, lastPage: 1, perPage: 50, total: 0 })
const { columns, data, sort } = puiTable({ columns: props.columns })
const { params, push, refresh } = useSelectQueryBuilderParams({
  callback: async ({ queryString, params }) => {
    sort.value = params.orderBy?.[0]
      ? { column: params.orderBy[0].field, direction: params.orderBy[0].direction! }
      : null

    const response = await logsQueryBuilder
      .selectFrom(props.logCollection)
      .fromQueryString(queryString)
      .select(['id', ...Object.keys(columns.value)] as any)
      .paginate()

    if (response.success) {
      data.value = response.data.records as any
      pagination.value = omit(response.data, ['records'])

      if (pagination.value.currentPage > pagination.value.lastPage) {
        params.page = pagination.value.lastPage || 1
        push(true)
      }
    }

    initialized.value = true
  },
  defaultParams: {
    orderBy: props.orderBy,
    page: 1,
    perPage: 50,
  },
})

let scrollTop = false
watch(params, () => (scrollTop = true))
watch(data, () => {
  deselectAll()
  if (scrollTop) {
    tableWrapper.value?.scroller?.scrollTo({ top: 0, behavior: 'instant' })
    scrollTop = false
  }
})

watch(
  () => route.query,
  async () => {
    const details = route.query.details ? Number(route.query.details) : null
    if (details) {
      emit('update:detailsId', details)
    } else {
      await detailsPopup.value?.close()
      emit('update:detailsId', null)
    }
  },
  { immediate: true },
)

onKeyStroke('ArrowLeft', (e) => {
  if (!puiHasModifierKey(e) && !puiIsEditingText() && !overlayCounter.value && pagination.value.currentPage > 1) {
    e.preventDefault()
    params.value.page = pagination.value.currentPage - 1
    push()
  }
})

onKeyStroke('ArrowRight', (e) => {
  if (
    !puiHasModifierKey(e) &&
    !puiIsEditingText() &&
    !overlayCounter.value &&
    pagination.value.currentPage < pagination.value.lastPage
  ) {
    e.preventDefault()
    params.value.page = pagination.value.currentPage + 1
    push()
  }
})

listen('selectAll', (event) => {
  if (props.canDeleteLogs && pagination.value.total) {
    event.preventDefault()
    onSelectAll()
  }
})

listen('delete', () => {
  if (props.canDeleteLogs && selectable.value) {
    onDeleteSelection()
  }
})

function select(id: number | string) {
  selected.value[id] = true
  table.value!.selectOrigin = id
  refreshSelectable()
}

async function onSelectAll() {
  if (selectAllState.value) {
    selected.value = {}
    allSelected.value = false
    refreshSelectable()
  } else if (pagination.value.lastPage > 1) {
    const action = await puiDialog({
      content: __(
        'pruvious-dashboard',
        'Would you like to select $perPage $perPageEntries on this page or all $total entries?',
        {
          perPage: data.value.length,
          total: pagination.value.total,
        },
      ),
      actions: [
        {
          name: 'cancel',
          label: __('pruvious-dashboard', 'Cancel'),
        },
        {
          name: 'page',
          label: __('pruvious-dashboard', 'Page ($count)', { count: data.value.length }),
          variant: 'primary',
        },
        {
          name: 'all',
          label: __('pruvious-dashboard', 'All ($count)', { count: pagination.value.total }),
          variant: 'primary',
        },
      ],
    })

    if (action === 'page') {
      selected.value = data.value.reduce((acc, row) => ({ ...acc, [row.id]: true }), {})
      allSelected.value = false
      refreshSelectable()
    } else if (action === 'all') {
      selected.value = data.value.reduce((acc, row) => ({ ...acc, [row.id]: true }), {})
      allSelected.value = true
      refreshSelectable()
    }
  } else {
    selected.value = data.value.reduce((acc, row) => ({ ...acc, [row.id]: true }), {})
    allSelected.value = true
    refreshSelectable()
  }
}

function deselect(id: number | string) {
  delete selected.value[id]
  refreshSelectable()
}

function deselectAll() {
  selected.value = {}
  refreshSelectable()
}

function refreshSelectable() {
  if (Object.values(selected.value).some((value) => value)) {
    selectable.value = true
    allSelected.value = allSelected.value && data.value.every((row) => selected.value[row.id])
    selectAllState.value = allSelected.value
      ? true
      : data.value.every((row) => selected.value[row.id])
        ? pagination.value.lastPage === 1
          ? true
          : 'indeterminate'
        : false
  } else {
    selectable.value = false
    selectAllState.value = false
  }
}

function onPopupKeyDown(event: KeyboardEvent) {
  if ((event.code === 'ArrowLeft' || event.code === 'ArrowRight') && !puiHasModifierKey(event) && !puiIsEditingText()) {
    const index = data.value.findIndex((row) => row.id === props.detailsId)
    const next = event.code === 'ArrowLeft' ? index - 1 : index + 1
    const row = data.value[next]
    if (row) {
      emit('update:detailsId', Number(row.id))
    }
  }
}

async function onDelete(id: number | string): Promise<boolean> {
  const action = await puiDialog({
    content: __('pruvious-dashboard', 'Are you sure you want to delete this entry?'),
    actions: [
      { name: 'cancel', label: __('pruvious-dashboard', 'Cancel') },
      { name: 'delete', label: __('pruvious-dashboard', 'Delete'), variant: 'destructive' },
    ],
  })

  if (action === 'delete') {
    const query = await logsQueryBuilder.deleteFrom(props.logCollection).where('id', '=', id).run()

    if (query.success) {
      puiQueueToast(__('pruvious-dashboard', 'Entry deleted'), { type: 'success' })
      await refresh(true)
      return true
    }
  }

  return false
}

async function onDeleteSelection() {
  const action = await puiDialog({
    content: __('pruvious-dashboard', 'Are you sure you want to delete $count $entries?', {
      count: selectedCount.value,
    }),
    actions: [
      { name: 'cancel', label: __('pruvious-dashboard', 'Cancel') },
      { name: 'delete', label: __('pruvious-dashboard', 'Delete'), variant: 'destructive' },
    ],
  })

  if (action === 'delete') {
    let count = 0

    if (allSelected.value) {
      const lastId = await logsQueryBuilder
        .selectFrom(props.logCollection)
        .select('id')
        .orderBy('id', 'desc')
        .limit(pagination.value.total)
        .first()

      if (lastId.success && lastId.data) {
        const query = await logsQueryBuilder.deleteFrom(props.logCollection).where('id', '<=', lastId.data.id).run()

        if (query.success) {
          count = query.data
        }
      }
    } else {
      const ids = Object.keys(selected.value).filter((id) => selected.value[id])
      const queries: Promise<any>[] = []

      for (let i = 0; i < ids.length; i += 50) {
        queries.push(
          logsQueryBuilder
            .deleteFrom(props.logCollection)
            .where('id', 'in', ids.slice(i, i + 50))
            .run()
            .then((query) => {
              if (query.success) {
                count += query.data
              }
            }),
        )
      }

      await Promise.all(queries)
    }

    if (count) {
      puiQueueToast(__('pruvious-dashboard', 'Deleted $count $entries', { count }), { type: 'success' })
      await refresh(true)
    } else {
      puiQueueToast(__('pruvious-dashboard', 'No entries were deleted'))
    }
  }
}
</script>

<style scoped>
:deep(.p-table-scroller) {
  flex: 1;
}

.p-empty :deep(.pui-table) {
  min-height: 100%;
}

.p-cell {
  display: flex;
  align-items: center;
}

.p-cell > :deep(code) {
  font-family: var(--pui-font-mono);
  font-size: calc(1em - 0.0625rem);
}

.p-cell :deep(.p-cell-foreground) {
  color: hsl(var(--pui-foreground));
}

.p-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

:deep(.p-details-title) {
  font-family: var(--pui-font-mono);
  font-size: calc(1em - 0.0625rem);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

:deep(.p-details-title strong) {
  font-weight: 500;
}

.p-details :deep(.pui-field-label) {
  margin-bottom: 0.5em;
}

.p-details :deep(.pui-tabs::before) {
  content: '';
  position: sticky;
  z-index: 3;
  top: 0;
  display: block;
  width: 100%;
  height: 1.5rem;
  margin-bottom: -1.5rem;
  background-color: hsl(var(--pui-background));
}

.p-details :deep(.pui-tabs-list) {
  position: sticky;
  z-index: 3;
  top: 0.75rem;
}

.p-details :deep(.pui-tabs-content:not(:first-child)) {
  margin-top: 0.75rem;
}

:deep(.p-details-field + .p-details-field) {
  margin-top: 1rem;
}

:deep(.p-details-field .pui-code) {
  --pui-padding: 0.5rem;
}
</style>
