<template>
  <table
    class="pui-table"
    :class="{ 'pui-table-selectable': selectable, 'pui-table-has-actions': $slots.actions }"
    :style="{ '--pui-size': size }"
  >
    <colgroup>
      <col
        v-if="selectable"
        style="width: calc((1rem + var(--pui-size) * 0.125rem) + 1.125rem)"
        :style="{ '--pui-size': buttonSize }"
      />
      <col v-for="(column, key) in columns" :key="key" :style="{ width: column.width, minWidth: column.minWidth }" />
      <col
        v-if="$slots.actions"
        style="width: calc(2 * (1rem + var(--pui-size) * 0.125rem) + 1.75rem)"
        :style="{ '--pui-size': buttonSize }"
      />
    </colgroup>

    <thead>
      <tr>
        <th v-if="selectable">
          <PUICheckbox
            v-pui-tooltip="
              selectAllState === 'indeterminate'
                ? labels?.selectAllIndeterminate
                : selectAllState
                  ? labels?.selectAll
                  : undefined
            "
            :indeterminate="selectAllState === 'indeterminate'"
            :modelValue="!!selectAllState"
            @update:modelValue="$emit('selectAll', $event)"
            strict
            variant="accent"
          />
        </th>
        <th v-for="(column, key, columnIndex) in columns" :key="key" scope="col">
          <div class="pui-table-header">
            <slot v-bind="{ column, key, columnIndex }" name="header">
              <span class="pui-table-column-label">{{ column.label ?? key }}</span>
            </slot>

            <div
              v-if="column.sortable"
              class="pui-table-button-wrapper pui-table-sort-button-wrapper"
              :style="{ '--pui-size': buttonSize }"
            >
              <PUIButton
                :title="
                  sort?.column === key && sort.direction === 'asc'
                    ? (labels?.sortInDescendingOrder ?? 'Sort in descending order')
                    : (labels?.sortInAscendingOrder ?? 'Sort in ascending order')
                "
                @click="toggleSort(key)"
                variant="secondary"
                class="pui-table-sort-button"
                :style="{ display: sort?.column === key ? 'inline-flex' : undefined }"
              >
                <Icon v-if="!sort || sort.column !== key" mode="svg" name="tabler:arrows-sort" />
                <Icon
                  v-else-if="column.sortable === 'numeric' && sort.direction === 'asc'"
                  mode="svg"
                  name="tabler:sort-ascending-numbers"
                />
                <Icon
                  v-else-if="column.sortable === 'numeric' && sort.direction === 'desc'"
                  mode="svg"
                  name="tabler:sort-descending-numbers"
                />
                <Icon
                  v-else-if="column.sortable === 'text' && sort.direction === 'asc'"
                  mode="svg"
                  name="tabler:sort-ascending-letters"
                />
                <Icon
                  v-else-if="column.sortable === 'text' && sort.direction === 'desc'"
                  mode="svg"
                  name="tabler:sort-descending-letters"
                />
                <Icon v-else-if="sort.direction === 'asc'" mode="svg" name="tabler:sort-ascending" />
                <Icon v-else mode="svg" name="tabler:sort-descending" />
              </PUIButton>
            </div>
          </div>
        </th>
        <th v-if="$slots.actions"></th>
      </tr>
    </thead>

    <tbody v-if="data.length">
      <tr v-for="(row, rowIndex) of data" :key="row.id" @dblclick="onDoubleClick(row)">
        <td v-if="selectable">
          <PUICheckbox
            :disabled="shift && selectOrigin === row.id"
            :modelValue="!!selected[row.id]"
            @update:modelValue="shift ? onShiftSelect(row.id, $event) : onSelect(row.id, $event)"
            strict
            variant="accent"
          />
        </td>
        <td v-for="(column, key, columnIndex) in columns" :key="key">
          <slot v-bind="{ row, rowIndex, column, key, columnIndex }" name="cell">
            <div>{{ row[key] }}</div>
          </slot>
        </td>
        <td v-if="$slots.actions" :class="{ 'pui-table-cell-active-actions': visibleActions === rowIndex }">
          <div class="pui-table-button-wrapper pui-table-action-button-wrapper" :style="{ '--pui-size': buttonSize }">
            <PUIButton
              :ref="(el) => (actionButtons[rowIndex] = el)"
              :title="labels?.actions ?? 'Actions'"
              @click="
                async () => {
                  await onOpenActions?.({ row, rowIndex })
                  visibleActions = visibleActions === rowIndex ? -1 : rowIndex
                }
              "
              class="pui-table-action-button"
              :style="{ display: visibleActions === rowIndex ? 'inline-flex' : undefined }"
            >
              <Icon mode="svg" name="tabler:dots" />
            </PUIButton>
            <PUIDropdown
              v-if="visibleActions === rowIndex"
              :reference="actionButtons?.[rowIndex]?.$el"
              :size="size ?? -1"
              @click="visibleActions = -1"
              @close="visibleActions = -1"
              placement="end"
            >
              <slot v-bind="{ row, rowIndex }" name="actions" />
            </PUIDropdown>
          </div>
        </td>
      </tr>
    </tbody>

    <tbody v-else>
      <tr>
        <td :colspan="Object.keys(columns).length + (selectable ? 1 : 0) + ($slots.actions ? 1 : 0)">
          <slot v-if="showEmptyState" name="empty">
            <p class="pui-center">{{ labels?.noData ?? 'No data available' }}</p>
          </slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script generic="TColumns extends PUIColumns" lang="ts" setup>
import { deselectAll, isDefined, isNull } from '@pruvious/utils'
import { useMagicKeys } from '@vueuse/core'
import type { IPUITable, PUIColumns, PUIRow, PUITableSort } from '../pui/table'

interface PUITableProps extends /* @vue-ignore */ Partial<IPUITable> {
  columns: TColumns

  /**
   * @default []
   */
  data?: PUIRow<TColumns>[]

  /**
   * @default null
   */
  sort?: PUITableSort<TColumns>

  /**
   * @default false
   */
  selectable?: boolean

  /**
   * @default {}
   */
  selected?: Record<number | string, boolean>

  /**
   * @default false
   */
  selectAllState?: boolean | 'indeterminate'

  /**
   * Controls whether to display an empty state message when the table has no data.
   *
   * @default true
   */
  showEmptyState?: boolean

  /**
   * Callback function that is called when the user opens the actions menu for a row.
   * The function receives an `context` object with the current row and its index.
   * The function can return a promise to delay the opening of the actions menu.
   */
  onOpenActions?: (context: { row: PUIRow<TColumns>; rowIndex: number }) => void | Promise<void>

  /**
   * Text labels for interactive UI elements in the component.
   *
   * @default
   * {
   *   actions: 'Actions',
   *   noData: 'No data available',
   *   sortInAscendingOrder: 'Sort in ascending order',
   *   sortInDescendingOrder: 'Sort in descending order',
   * }
   */
  labels?: {
    /**
     * Text shown as `title` attribute for the row actions menu button.
     *
     * @default 'Actions'
     */
    actions?: string

    /**
     * Text displayed on the button that sorts rows in ascending order (A-Z, 0-9).
     *
     * @default 'Sort in ascending order'
     */
    sortInAscendingOrder?: string

    /**
     * Text displayed on the button that sorts rows in descending order (Z-A, 9-0).
     *
     * @default 'Sort in descending order'
     */
    sortInDescendingOrder?: string

    /**
     * Text shown in the tooltip of the select all checkbox when all items are selected (`selectAllState` is `true`).
     *
     * @default undefined
     */
    selectAll?: string

    /**
     * Text shown in the tooltip of the select all checkbox when some but not all items are selected (`selectAllState` is 'indeterminate').
     *
     * @default undefined
     */
    selectAllIndeterminate?: string

    /**
     * Text shown when there is no data to display in the table.
     *
     * @default 'No data available'
     */
    noData?: string
  }

  /**
   * Adjusts the size of the component.
   *
   * Examples:
   *
   * - -2 (very small)
   * - -1 (small)
   * - 0 (default size)
   * - 1 (large)
   * - 2 (very large)
   *
   * By default, the value is inherited as the CSS variable `--pui-size` from the parent element.
   */
  size?: number
}

const props = withDefaults(defineProps<PUITableProps>(), {
  data: () => [],
  sort: null,
  selectable: false,
  selected: () => ({}),
  selectAllState: false,
  showEmptyState: true,
})

const emit = defineEmits<{
  'update:sort': [value: PUITableSort<TColumns>]
  'update:selected': [value: Record<number | string, boolean>]
  'selectAll': [value: boolean]
  'doubleClick': [row: PUIRow<TColumns>]
}>()

const buttonSize = computed(() => (isDefined(props.size) ? props.size - 2 : -3))
const actionButtons = ref<Record<number | string, any>>({})
const visibleActions = ref(-1)
const selectOrigin = ref<number | string | null>(null)
const { shift } = useMagicKeys()

defineExpose({ selectOrigin })

watch(
  () => props.data,
  () => {
    actionButtons.value = {}
    visibleActions.value = -1
    selectOrigin.value = null
  },
)

function toggleSort(columnKey: keyof TColumns) {
  if (props.sort?.column === columnKey) {
    emit('update:sort', { column: columnKey, direction: props.sort.direction === 'asc' ? 'desc' : 'asc' })
  } else {
    emit('update:sort', { column: columnKey, direction: 'asc' })
  }
}

function onDoubleClick(row: PUIRow<TColumns>) {
  deselectAll()
  emit('doubleClick', row)
}

function onSelect(id: number | string, value: boolean) {
  selectOrigin.value = value ? id : null
  emit('update:selected', { ...props.selected, [id]: value })
}

function onShiftSelect(id: number | string, value: boolean) {
  if (isNull(selectOrigin.value)) {
    onSelect(id, value)
  } else if (selectOrigin.value !== id) {
    const originIndex = props.data.findIndex((row) => row.id === selectOrigin.value)
    const index = props.data.findIndex((row) => row.id === id)
    const [start, end] = originIndex < index ? [originIndex, index] : [index, originIndex]
    const selected = { ...props.selected }

    for (let i = start; i <= end; i++) {
      selected[props.data[i]!.id] = value
    }

    selected[props.data[originIndex]!.id] = true
    emit('update:selected', selected)
  }
}
</script>

<style>
.pui-table {
  display: table;
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  text-indent: 0;
  vertical-align: middle;
}

.pui-table :where(thead) {
  border-bottom-width: 1px;
}

.pui-table :where(th, td) {
  border-bottom-width: 1px;
  text-align: start;
}

.pui-table :where(th, td) > :where(*) {
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.pui-table :where(th) {
  position: sticky;
  z-index: 11;
  top: 0;
  padding: 0.6875rem 0.75rem;
  padding-right: 0;
  background-color: hsl(var(--pui-background));
  font-weight: 500;
}

.pui-table :where(td) {
  padding: 0.5rem 0.75rem;
  padding-right: 0;
  color: hsl(var(--pui-muted-foreground));
}

.pui-table-selectable :where(th, td):first-child {
  position: sticky;
  z-index: 12;
  left: 0;
  background-color: hsl(var(--pui-background));
}

.pui-table :where(th, td):last-child {
  padding-right: 0.75rem;
}

.pui-table :where(th):last-child {
  pointer-events: none;
}

.pui-table-has-actions :where(th, td):last-child {
  position: sticky;
  right: 0;
}

.pui-table-has-actions :where(th):not(:last-child) {
  z-index: 12;
}

.pui-table-has-actions :where(td):last-child {
  background-color: transparent;
}

.pui-table-cell-active-actions {
  z-index: 13;
}

.pui-table-header {
  display: flex;
  align-items: center;
}

.pui-table-column-label {
  padding-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pui-table-button-wrapper {
  flex-shrink: 0;
  display: flex;
  height: calc(2 * (1rem + var(--pui-size) * 0.125rem) + 0.25rem);
}

.pui-table-sort-button-wrapper > * {
  margin-left: 0.5rem;
}

.pui-table-action-button-wrapper {
  justify-content: flex-end;
}

.pui-table :where(th):not(:hover) .pui-table-sort-button {
  display: none;
}

.pui-table :where(tr):not(:hover) .pui-table-action-button {
  display: none;
}
</style>
