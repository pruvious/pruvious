<template>
  <PruviousDashboardTableWrapper ref="tableWrapper" :class="{ 'p-empty': !paginated.total }">
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
          paginated.lastPage === 1
            ? __('pruvious-dashboard', 'Selected $count $entries', { count: selectedCount })
            : __('pruvious-dashboard', 'Selected $entryCount $entries across $pageCount $pages', {
                entryCount: selectedCount,
                pageCount: paginated.lastPage,
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
      <template #cell="{ row, key }">
        <div class="p-cell">
          <slot v-bind="{ row, key }" name="cell">
            <PUIBadge
              v-if="key === 'method'"
              :color="
                row[key] === 'GET'
                  ? 'hsl(var(--p-green))'
                  : row[key] === 'POST'
                    ? 'hsl(var(--p-purple))'
                    : row[key] === 'PUT'
                      ? 'hsl(var(--p-yellow))'
                      : row[key] === 'PATCH'
                        ? 'hsl(var(--p-orange))'
                        : row[key] === 'DELETE'
                          ? 'destructive'
                          : 'secondary'
              "
            >
              {{ row[key] }}
            </PUIBadge>

            <code
              v-else-if="key === 'path' || key === 'sql'"
              :title="row[key] ? String(row[key]) : undefined"
              class="pui-truncate p-cell-foreground"
            >
              {{ row[key] }}
            </code>

            <code
              v-else-if="
                key === 'result' ||
                key === 'rawResult' ||
                key === 'params' ||
                key === 'payload' ||
                key === 'body' ||
                key === 'statusMessage' ||
                key === 'headers'
              "
              :title="row[key] ? String(row[key]) : undefined"
              class="pui-truncate"
            >
              {{ row[key] ? row[key] : '' }}
            </code>

            <code
              v-else-if="key === 'queryString'"
              :title="row[key] ? '?' + String(row[key]) : undefined"
              class="pui-truncate"
            >
              {{ row[key] ? '?' + row[key] : '-' }}
            </code>

            <div
              v-else-if="key === 'createdAt' || key === 'scheduledAt' || key === 'completedAt'"
              v-pui-tooltip.nomd="row[key] ? dayjsRelative(row[key]) : '-'"
              class="pui-truncate"
            >
              {{ row[key] ? dayjsFormatDateTime(row[key]) : '-' }}
            </div>

            <PUIBadge
              v-else-if="key === 'statusCode'"
              :color="
                row[key] >= 200 && row[key] < 300
                  ? 'hsl(var(--p-green))'
                  : row[key] >= 400 && row[key] < 500
                    ? 'hsl(var(--p-orange))'
                    : row[key] >= 500
                      ? 'destructive'
                      : 'accent'
              "
            >
              {{ row[key] }}
            </PUIBadge>

            <PUIBadge
              v-else-if="key === 'operation'"
              :color="
                row[key] === 'insert'
                  ? 'hsl(var(--p-purple))'
                  : row[key] === 'select'
                    ? 'hsl(var(--p-green))'
                    : row[key] === 'update'
                      ? 'hsl(var(--p-orange))'
                      : 'destructive'
              "
              class="pui-uppercase"
            >
              {{ row[key] }}
            </PUIBadge>

            <span v-else-if="key === 'executionTime'">{{ row[key] }} ms</span>

            <PUIBadge v-else-if="key === 'success'" :color="row[key] ? 'hsl(var(--p-green))' : 'destructive'">
              {{ row[key] ? __('pruvious-dashboard', 'Success') : __('pruvious-dashboard', 'Error') }}
            </PUIBadge>

            <PUIBadge v-else-if="key === 'priority'" color="accent">{{ row[key] }}</PUIBadge>

            <PUIBadge
              v-else-if="key === 'status'"
              :color="row[key] === 'success' ? 'hsl(var(--p-green))' : row[key] === 'error' ? 'destructive' : 'accent'"
              class="pui-capitalize"
            >
              {{
                row[key] === 'success'
                  ? __('pruvious-dashboard', 'Success')
                  : row[key] === 'error'
                    ? __('pruvious-dashboard', 'Error')
                    : __('pruvious-dashboard', 'Pending')
              }}
            </PUIBadge>

            <PUIBadge v-else-if="key === 'type'" color="accent">{{ row[key] }}</PUIBadge>

            <PUIBadge v-else-if="key === 'severity'" color="secondary">{{ row[key] }}</PUIBadge>

            <!-- @todo 'user' key -->

            <span v-else :title="row[key] ? String(row[key]) : undefined" class="pui-truncate">
              {{ typeof row[key] === 'string' ? row[key] || '-' : (row[key] ?? '-') }}
            </span>
          </slot>
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
        <slot :scrollToTop="scrollToTop" name="details" />
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

    <PruviousDashboardTableSettingsPopup
      v-if="isTableSettingsPopupVisible"
      v-model:columns="columns"
      v-model:params="params"
      :collection="{ name: `logs:${logCollectionName}` as any, definition: logCollectionDefinition }"
      :defaultColumns="defaultColumns"
      :defaultOrderBy="defaultOrderBy"
      :paginated="paginated"
      :size="-1"
      @close="$event().then(() => (isTableSettingsPopupVisible = false))"
      @update:columns="
        (columns) => {
          if (compareColumns(columns, defaultColumns)) {
            route.query._columns = null
          } else {
            route.query._columns = Object.entries(columns)
              .map(([fieldName, { width, minWidth }]) => {
                const parts = [fieldName]
                if (isDefined(width)) {
                  parts.push(width)
                } else if (isDefined(minWidth) && minWidth !== '16rem') {
                  parts.push(minWidth)
                }
                return parts.join('|')
              })
              .join(',')
          }
        }
      "
      @update:params="push()"
      width="64rem"
    />

    <template #footer>
      <div class="pui-justify-between">
        <PUIPagination
          :currentPage="paginated.currentPage"
          :goToPageTitle="__('pruvious-dashboard', 'Go to page')"
          :lastPage="paginated.lastPage"
          :nextPageTitle="__('pruvious-dashboard', 'Next page')"
          :pageLabel="__('pruvious-dashboard', 'Page')"
          :previousPageTitle="__('pruvious-dashboard', 'Previous page')"
          @change="
            (page) => {
              params.page = page
              push()
            }
          "
        >
          <template #button="{ currentPage, index, onClick }">
            <button
              v-pui-tooltip="
                __('pruvious-dashboard', 'Showing entries $from to $to', {
                  from: (index - 1) * paginated.perPage + 1,
                  to: Math.min(index * paginated.perPage, paginated.total),
                  total: paginated.total,
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
            v-if="canDeleteLogs && selectable"
            v-pui-tooltip="__('pruvious-dashboard', 'Delete $count $entries', { count: selectedCount })"
            @click="onDeleteSelection()"
            variant="destructive"
          >
            <Icon mode="svg" name="tabler:trash-x" />
          </PUIButton>

          <PUIButton
            v-pui-tooltip="__('pruvious-dashboard', 'Configure view')"
            :variant="isDirty || columnsDirty ? 'accent' : 'outline'"
            @click="isTableSettingsPopupVisible = true"
          >
            <Icon mode="svg" name="tabler:adjustments" />
            <template v-if="isDirty || columnsDirty" #bubble>
              <PUIBubble></PUIBubble>
            </template>
          </PUIButton>
        </div>
      </div>
    </template>
  </PruviousDashboardTableWrapper>
</template>

<script lang="ts" setup>
import { __, maybeTranslate, useSelectQueryBuilderParams } from '#pruvious/client'
import { dayjsFormatDateTime, dayjsRelative } from '#pruvious/client/dayjs'
import type { CollectionUIOptions, LogsDatabase, SerializableCollection } from '#pruvious/server'
import type { Paginated } from '@pruvious/orm'
import { puiDialog } from '@pruvious/ui/pui/dialog'
import { puiHasModifierKey, puiIsEditingText, usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import { usePUIOverlayCounter } from '@pruvious/ui/pui/overlay'
import { puiColumn, puiTable, type PUIColumns } from '@pruvious/ui/pui/table'
import { puiQueueToast } from '@pruvious/ui/pui/toast'
import {
  deepCompare,
  isDefined,
  isEmpty,
  isNull,
  isString,
  isUndefined,
  omit,
  titleCase,
  toArray,
} from '@pruvious/utils'
import { onKeyStroke } from '@vueuse/core'
import { logsQueryBuilder } from '../../../utils/pruvious/dashboard/logs'

const props = defineProps({
  /**
   * Name of the log collection to display.
   */
  logCollectionName: {
    type: String as PropType<keyof LogsDatabase['collections']>,
    required: true,
  },

  /**
   * Pseudo-definition of the log collection to display.
   */
  logCollectionDefinition: {
    type: Object as PropType<SerializableCollection>,
    required: true,
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
  allSelected.value ? paginated.value.total : Object.values(selected.value).filter(Boolean).length,
)
const selectAllState = ref<boolean | 'indeterminate'>(false)
const initialized = ref(false)
const isTableSettingsPopupVisible = ref(false)
const paginated = ref<Omit<Paginated<any>, 'records'>>({ currentPage: 1, lastPage: 1, perPage: 50, total: 0 })
const defaultColumns = resolveColumns(props.logCollectionDefinition.ui.indexPage.table.columns)
const columnsDirty = ref(false)
const { columns, data, sort } = puiTable({ columns: defaultColumns })
const defaultOrderBy = resolveOrderBy()
const { params, push, refresh, isDirty } = useSelectQueryBuilderParams({
  watch: ['columns'],
  callback: async ({ queryString, params }) => {
    columns.value = resolveColumns()
    columnsDirty.value = !compareColumns(columns.value, defaultColumns)

    sort.value = params.orderBy?.[0]
      ? { column: params.orderBy[0].field, direction: params.orderBy[0].direction! }
      : null

    const response = await logsQueryBuilder
      .selectFrom(props.logCollectionName)
      .fromQueryString(queryString)
      .select(['id', ...Object.keys(columns.value)] as any)
      .paginate()

    if (response.success) {
      data.value = response.data.records as any
      paginated.value = omit(response.data, ['records'])

      if (paginated.value.currentPage > paginated.value.lastPage) {
        params.page = paginated.value.lastPage || 1
        push(true)
      }
    }

    initialized.value = true
  },
  defaultParams: {
    orderBy: defaultOrderBy,
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
  if (!puiHasModifierKey(e) && !puiIsEditingText() && !overlayCounter.value && paginated.value.currentPage > 1) {
    e.preventDefault()
    params.value.page = paginated.value.currentPage - 1
    push()
  }
})

onKeyStroke('ArrowRight', (e) => {
  if (
    !puiHasModifierKey(e) &&
    !puiIsEditingText() &&
    !overlayCounter.value &&
    paginated.value.currentPage < paginated.value.lastPage
  ) {
    e.preventDefault()
    params.value.page = paginated.value.currentPage + 1
    push()
  }
})

listen('selectAll', (event) => {
  if (props.canDeleteLogs && paginated.value.total) {
    event.preventDefault()
    onSelectAll()
  }
})

listen('delete', () => {
  if (props.canDeleteLogs && selectable.value) {
    onDeleteSelection()
  }
})

function resolveColumns(
  from: 'auto' | string | CollectionUIOptions['indexPage']['table']['columns'] | null = 'auto',
): PUIColumns {
  const columns: PUIColumns = {}
  const source =
    from === 'auto'
      ? isEmpty(route.query.columns)
        ? props.logCollectionDefinition.ui.indexPage.table.columns
        : String(route.query.columns).split(',')
      : isString(from)
        ? from.split(',')
        : from

  if (isUndefined(source) || isNull(source)) {
    const filteredFieldEntries = Object.entries(props.logCollectionDefinition.fields).filter(([_, options]) =>
      'ui' in options ? !options.ui?.hidden : true,
    )

    for (const [fieldName, options] of filteredFieldEntries.slice(
      0,
      props.logCollectionDefinition.createdAtField ? 4 : 5,
    )) {
      columns[fieldName] = puiColumn({
        label:
          'ui' in options && isDefined(options.ui?.label)
            ? maybeTranslate(options.ui.label)
            : __('pruvious-dashboard', titleCase(fieldName, false) as any),
        sortable: options._dataType === 'text' ? 'text' : 'numeric',
        minWidth: '16rem',
      })
    }

    if (props.logCollectionDefinition.createdAtField) {
      const options = props.logCollectionDefinition.fields.createdAt!
      columns.createdAt = puiColumn({
        label:
          'ui' in options && isDefined(options.ui?.label)
            ? maybeTranslate(options.ui.label)
            : __('pruvious-dashboard', 'Created at'),
        sortable: 'numeric',
        minWidth: '16rem',
      })
    }
  } else {
    for (const column of source) {
      if (isString(column)) {
        const [field, width, minWidth] = column.split('|').map((p) => p.trim())

        if (field) {
          const options = props.logCollectionDefinition.fields[field]

          if (options) {
            columns[field] = puiColumn({
              label:
                'ui' in options && isDefined(options.ui?.label)
                  ? maybeTranslate(options.ui.label)
                  : __('pruvious-dashboard', titleCase(field, false) as any),
              sortable: options._dataType === 'text' ? 'text' : 'numeric',
              width,
              minWidth: minWidth ?? (isUndefined(width) ? '16rem' : undefined),
            })
          } else {
            console.warn(
              `Unable to resolve field \`${field}\` in \`${props.logCollectionName}\` log collection table columns. Available fields:`,
              toRaw(props.logCollectionDefinition.fields),
            )
          }
        }
      } else if ('field' in column) {
        const options = props.logCollectionDefinition.fields[column.field]

        if (options) {
          columns[column.field] = puiColumn({
            label: isDefined(column.label)
              ? maybeTranslate(column.label)
              : 'ui' in options && isDefined(options.ui?.label)
                ? maybeTranslate(options.ui.label)
                : __('pruvious-dashboard', titleCase(column.field, false) as any),
            sortable: options._dataType === 'text' ? 'text' : 'numeric',
            width: column.width,
            minWidth: column.minWidth ?? (isUndefined(column.width) ? '16rem' : undefined),
          })
        } else {
          console.warn(
            `Unable to resolve field \`${column.field}\` in \`${props.logCollectionName}\` log collection table columns. Available fields:`,
            toRaw(props.logCollectionDefinition.fields),
          )
        }
      }
    }
  }

  if (isEmpty(columns)) {
    Object.assign(columns, {
      id: puiColumn({ label: maybeTranslate(props.logCollectionDefinition.fields.id!.ui.label), sortable: 'numeric' }),
    })
  }

  return columns
}

function compareColumns(a: PUIColumns, b: PUIColumns): boolean {
  return (
    deepCompare(Object.keys(a), Object.keys(b)) &&
    Object.entries(a).every(([key, A]) => {
      const B = b[key]
      const AMinWidth = A.minWidth ?? (isUndefined(A.width) ? '16rem' : undefined)
      const BMinWidth = B ? (B.minWidth ?? (isUndefined(B.width) ? '16rem' : undefined)) : undefined
      return B && A.label === B.label && A.width === B.width && A.sortable === B.sortable && AMinWidth === BMinWidth
    })
  )
}

function resolveOrderBy(): {
  field: string
  direction?: 'asc' | 'desc'
  nulls?: 'nullsAuto' | 'nullsFirst' | 'nullsLast'
}[] {
  const orderBy = props.logCollectionDefinition.ui.indexPage.table.orderBy

  if (isDefined(orderBy)) {
    return toArray(orderBy).map((orderBy) => {
      if (isString(orderBy)) {
        const [field, direction, nulls] = orderBy.split(':').map((p) => p.trim())
        return { field, direction: direction ?? 'asc', nulls: nulls ?? 'nullsAuto' } as any
      } else {
        return orderBy
      }
    })
  }

  return [{ field: props.logCollectionDefinition.createdAtField ? 'createdAt' : 'id', direction: 'desc' }]
}

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
  } else if (paginated.value.lastPage > 1) {
    const action = await puiDialog({
      content: __(
        'pruvious-dashboard',
        'Would you like to select $perPage $perPageEntries on this page or all $total entries?',
        {
          perPage: data.value.length,
          total: paginated.value.total,
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
          label: __('pruvious-dashboard', 'All ($count)', { count: paginated.value.total }),
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
        ? paginated.value.lastPage === 1
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
    const query = await logsQueryBuilder.deleteFrom(props.logCollectionName).where('id', '=', id).run()

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
        .selectFrom(props.logCollectionName)
        .select('id')
        .orderBy('id', 'desc')
        .limit(paginated.value.total)
        .first()

      if (lastId.success && lastId.data) {
        const query = await logsQueryBuilder.deleteFrom(props.logCollectionName).where('id', '<=', lastId.data.id).run()

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
            .deleteFrom(props.logCollectionName)
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

function scrollToTop() {
  if (detailsPopup.value?.content instanceof HTMLElement) {
    detailsPopup.value.content.scrollTo({ top: 0, behavior: 'instant' })
  } else {
    detailsPopup.value?.content?.$el.scrollTo({ top: 0, behavior: 'instant' })
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
