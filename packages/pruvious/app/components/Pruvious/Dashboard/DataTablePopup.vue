<template>
  <PUIPopup
    :additionalClasses="['pui-popup-no-padding']"
    :size="-1"
    @close="$emit('close', $event)"
    @keydown="$emit('keydown', $event)"
    fullHeight
    ref="popup"
    width="80rem"
  >
    <template #header>
      <div class="pui-row">
        <span class="p-title">{{ title }}</span>
        <PUIButton
          :size="-2"
          :title="__('pruvious-dashboard', 'Close')"
          @click="$emit('close', popup!.close)"
          variant="ghost"
          class="pui-ml-auto"
        >
          <Icon mode="svg" name="tabler:x" />
        </PUIButton>
      </div>
    </template>

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
          noData: __('pruvious-dashboard', 'No data available'),
        }"
        :onOpenActions="
          async ({ row }) => {
            resolvedPermissions = await resolveTranslatableCollectionRecordPermissions(Number(row.id), collection)
          }
        "
        :selectable="multiSelect"
        :showEmptyState="initialized"
        @doubleClick="
          ({ id }) => {
            if (multiSelect) {
              select(id)
            } else {
              $emit('update:modelValue', [+id])
              $emit('close', popup!.close)
            }
          }
        "
        @selectAll="onSelectAll()"
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
          <component
            v-if="String(cellProps.key)[0] === '$'"
            v-model:selected="selected"
            v-model:sort="sort"
            :cell="cellProps"
            :collection="collection"
            :columns="columns"
            :data="cellProps.row"
            :fields="collection.definition.fields"
            :is="resolvedCustomComponents[cellProps.key]"
            :params="params"
            :permissionsResolver="recordsPermissions.resolver"
            :push="push"
            :refresh="refresh"
          />
          <PruviousDynamicTableField
            v-else
            :cell="cellProps"
            :collection="collection"
            :columns="columns"
            :data="cellProps.row"
            :fields="collection.definition.fields"
            :modelValue="cellProps.row[cellProps.key]"
            :name="String(cellProps.key)"
            :options="collection.definition.fields[cellProps.key]!"
            :params="params"
            :permissionsResolver="recordsPermissions.resolver"
            :push="push"
            :refresh="refresh"
            :synced="
              collection.definition.translatable && collection.definition.syncedFields.includes(String(cellProps.key))
            "
            :translatable="collection.definition.translatable"
            :type="collection.definition.fields[cellProps.key]!._fieldType"
          />
        </template>

        <template #actions="{ row }">
          <PUIDropdownItem
            v-if="selected[row.id]"
            :title="__('pruvious-dashboard', 'Deselect')"
            @click="deselect(row.id)"
          >
            <Icon mode="svg" name="tabler:square-off" />
            <span>{{ __('pruvious-dashboard', 'Deselect') }}</span>
          </PUIDropdownItem>

          <PUIDropdownItem
            v-if="!selected[row.id]"
            :title="__('pruvious-dashboard', 'Select')"
            @click="
              () => {
                if (multiSelect) {
                  select(row.id)
                } else {
                  $emit('update:modelValue', [+row.id])
                  $emit('close', popup!.close)
                }
              }
            "
          >
            <Icon mode="svg" name="tabler:checkbox" />
            <span>{{ __('pruvious-dashboard', 'Select') }}</span>
          </PUIDropdownItem>

          <hr />

          <PUIDropdownItem
            v-if="resolvedPermissions?.[contentLanguage].canUpdate"
            :title="__('pruvious-dashboard', 'Edit')"
            :to="dashboardBasePath + `collections/${collection.slug}/${row.id}`"
          >
            <Icon mode="svg" name="tabler:pencil" />
            <span>{{ __('pruvious-dashboard', 'Edit') }}</span>
          </PUIDropdownItem>

          <PUIDropdownItem
            v-else
            :title="__('pruvious-dashboard', 'View')"
            :to="dashboardBasePath + `collections/${collection.slug}/${row.id}`"
          >
            <Icon mode="svg" name="tabler:list-search" />
            <span>{{ __('pruvious-dashboard', 'View') }}</span>
          </PUIDropdownItem>
        </template>
      </PUITable>
    </PruviousDashboardTableWrapper>

    <PruviousDashboardTableSettingsPopup
      v-if="isTableSettingsPopupVisible"
      v-model:columns="columns"
      v-model:params="params"
      :collection="collectionWithoutTranslationFields"
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
            v-if="!hideViewConfiguration"
            v-pui-tooltip="__('pruvious-dashboard', 'Configure view')"
            :variant="isDirty || columnsDirty ? 'accent' : 'outline'"
            @click="isTableSettingsPopupVisible = true"
          >
            <Icon mode="svg" name="tabler:adjustments" />
            <template v-if="isDirty || columnsDirty" #bubble>
              <PUIBubble></PUIBubble>
            </template>
          </PUIButton>

          <PUIButton @click="$emit('close', popup!.close)" variant="outline">
            <span v-if="multiSelect">{{ __('pruvious-dashboard', 'Cancel') }}</span>
            <span v-else>{{ __('pruvious-dashboard', 'Close') }}</span>
          </PUIButton>

          <PUIButton v-if="multiSelect" :variant="selectionChanged ? 'accent' : 'outline'" @click="applyMultiSelect()">
            <span>{{ __('pruvious-dashboard', 'Apply') }}</span>
          </PUIButton>
        </div>
      </div>
    </template>
  </PUIPopup>
</template>

<script lang="ts" setup>
import {
  __,
  customComponents,
  dashboardBasePath,
  maybeTranslate,
  pruviousDashboardPost,
  QueryBuilder,
  resolveTranslatableCollectionRecordPermissions,
  useCollectionRecordPermissions,
  useDashboardContentLanguage,
  usePruviousDashboard,
  useSelectQueryBuilderParams,
  type ResolvedTranslatableCollectionRecordPermissions,
} from '#pruvious/client'
import type { Collections, CollectionUIOptions } from '#pruvious/server'
import type { Paginated } from '@pruvious/orm'
import { puiHasModifierKey, puiIsEditingText, usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import { usePUIOverlayCounter } from '@pruvious/ui/pui/overlay'
import { puiColumn, puiTable, type PUIColumns } from '@pruvious/ui/pui/table'
import {
  deepCompare,
  defu,
  isArray,
  isDefined,
  isEmpty,
  isNull,
  isObject,
  isString,
  isUndefined,
  omit,
  slugify,
  titleCase,
  toArray,
} from '@pruvious/utils'
import { onKeyStroke } from '@vueuse/core'
import { usePruviousDataTablePopupQueryString } from '../../../utils/pruvious/dashboard/data-table-popup'
import { collectionsToMenuItems } from '../../../utils/pruvious/dashboard/menu'

const props = defineProps({
  /**
   * The selected record IDs.
   */
  modelValue: {
    type: Array as PropType<number[]>,
    required: true,
  },

  /**
   * The title of the popup.
   */
  title: {
    type: String,
  },

  /**
   * The name of the collection whose data are displayed in the popup.
   */
  collectionName: {
    type: String as PropType<keyof Collections>,
    required: true,
  },

  /**
   * Whether the popup allows multiple selections.
   */
  multiSelect: {
    type: Boolean,
    default: false,
  },

  /**
   * Filters collection records by language.
   */
  languages: {
    type: [Array, String] as PropType<string[] | 'all' | 'current'>,
    default: 'current',
  },
})

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
  'close': [close: () => Promise<void>]
  'keydown': [event: KeyboardEvent]
}>()

const popup = useTemplateRef('popup')
const dashboard = usePruviousDashboard()
const collection = {
  name: props.collectionName,
  slug: slugify(props.collectionName),
  definition: dashboard.value!.collections[props.collectionName]!,
}
const collectionWithoutTranslationFields = computed(() => ({
  name: collection.name,
  definition: collection.definition.translatable
    ? {
        ...collection.definition,
        fields: Object.fromEntries(
          Object.entries(collection.definition.fields).filter(([k]) => k !== 'translations' && k !== 'language'),
        ),
      }
    : collection.definition,
}))
const hideViewConfiguration = inject('hideViewConfiguration', false)
const storedQueryStrings = hideViewConfiguration
  ? ref<Record<string, { query: Record<string, string | null | undefined> }>>({ [collection.name]: { query: {} } })
  : usePruviousDataTablePopupQueryString()
storedQueryStrings.value[collection.name] ??= {
  query: Object.fromEntries(
    new URLSearchParams(
      collectionsToMenuItems({
        [collection.name]: defu({ ui: { menu: { hidden: false } } }, collection.definition),
      })[0]!
        .to?.toString()
        .split('?')[1],
    ).entries(),
  ),
}
const route = storedQueryStrings.value[collection.name]!
const queryBuilder = new QueryBuilder({ fetcher: pruviousDashboardPost })
const contentLanguage = useDashboardContentLanguage()
const recordsPermissions = useCollectionRecordPermissions(collection)
const { listen, isListening } = usePUIHotkeys({
  allowInOverlays: true,
  target: () => popup.value?.root,
  listen: false,
})
const overlayCounter = usePUIOverlayCounter()
const tableWrapper = useTemplateRef('tableWrapper')
const table = useTemplateRef('table')
const selected = ref<Record<number | string, boolean>>(Object.fromEntries(props.modelValue.map((id) => [id, true])))
const selectionChanged = computed(() => {
  return !deepCompare(
    Object.entries(selected.value)
      .filter(([_, value]) => value)
      .map(([id]) => +id)
      .sort(),
    [...props.modelValue].sort(),
  )
})
const resolvedPermissions = ref<ResolvedTranslatableCollectionRecordPermissions | null>(null)
const isTableSettingsPopupVisible = ref(false)
const paginated = ref<Omit<Paginated<any>, 'records'>>({
  currentPage: 1,
  lastPage: 1,
  perPage: collection.definition.ui.indexPage.table.perPage,
  total: 0,
})
const resolvedCustomComponents: Record<string, Component | string> = {}
const initialized = ref(false)
const defaultColumns = resolveColumns(collection.definition.ui.indexPage.table.columns ?? null)
const columnsDirty = ref(false)
const { columns, data, sort } = puiTable({ columns: resolveColumns() })
const refreshing = ref(false)
const defaultOrderBy = resolveOrderBy()
const { params, push, refresh, isDirty } = useSelectQueryBuilderParams({
  route,
  syncRoute: 'mutate',
  watch: ['columns'],
  callback: async ({ queryString, params }) => {
    refreshing.value = true
    columns.value = resolveColumns()
    columnsDirty.value = !compareColumns(columns.value, defaultColumns)

    sort.value = params.orderBy?.[0]
      ? { column: params.orderBy[0].field, direction: params.orderBy[0].direction! }
      : null

    const select = ['id', ...Object.keys(columns.value).filter((column) => !column.startsWith('$'))]

    if (collection.definition.authorField) {
      select.push('author')
    }

    if (collection.definition.editorsField) {
      select.push('editors')
    }

    const query = queryBuilder
      .selectFrom(collection.name)
      .fromQueryString(queryString)
      .select(select as any)

    if (collection.definition.translatable) {
      if (props.languages === 'current') {
        query.where('language', '=', contentLanguage.value)
      } else if (isArray(props.languages)) {
        query.where('language', 'in', props.languages)
      }
    }

    const response = await query.paginate()

    if (response.success) {
      data.value = response.data.records as any
      paginated.value = omit(response.data, ['records'])
      recordsPermissions.clearCache()

      if (paginated.value.currentPage > paginated.value.lastPage) {
        params.page = paginated.value.lastPage || 1
        push()
      }
    }

    initialized.value = true
    refreshing.value = false
  },
  defaultParams: {
    orderBy: defaultOrderBy,
    page: 1,
    perPage: collection.definition.ui.indexPage.table.perPage,
  },
  checkDirty: ['where', 'orderBy'],
})

let scrollTop = false
watch(params, () => (scrollTop = true))
watch(data, () => {
  if (scrollTop) {
    tableWrapper.value?.scroller?.scrollTo({ top: 0, behavior: 'instant' })
    scrollTop = false
  }
})

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

onMounted(() => {
  setTimeout(() => {
    isListening.value = true
    listen('selectAll', (event) => {
      event.preventDefault()
      if (props.multiSelect) {
        onSelectAll()
      }
    })
    listen('save', (event) => {
      event.preventDefault()
      if (props.multiSelect) {
        applyMultiSelect()
      } else {
        emit('close', popup.value!.close)
      }
    })
  })
})

function resolveColumns(
  from: 'auto' | string | CollectionUIOptions['indexPage']['table']['columns'] | null = 'auto',
): PUIColumns {
  const columns: PUIColumns = {}
  const source =
    from === 'auto'
      ? isEmpty(route.query.columns)
        ? collection.definition.ui.indexPage.table.columns
        : String(route.query.columns).split(',')
      : isString(from)
        ? from.split(',')
        : from

  if (isUndefined(source) || isNull(source)) {
    const filteredFieldEntries = Object.entries(collection.definition.fields).filter(([_, options]) =>
      'ui' in options ? !options.ui?.hidden : true,
    )
    let sliceFrom = 0
    let sliceLength = 5

    if (collection.definition.routing.enabled) {
      const options = collection.definition.fields.subpath!
      columns.subpath = puiColumn({
        label:
          'ui' in options && isDefined(options.ui?.label)
            ? maybeTranslate(options.ui.label)
            : __('pruvious-dashboard', 'Subpath'),
        sortable: 'text',
        minWidth: '20rem',
      })
      sliceFrom++
      sliceLength--

      if (collection.definition.routing.isPublicField) {
        const options = collection.definition.fields.isPublic!
        columns.isPublic = puiColumn({
          label:
            'ui' in options && isDefined(options.ui?.label)
              ? maybeTranslate(options.ui.label)
              : __('pruvious-dashboard', 'Status'),
          sortable: 'numeric',
          minWidth: '16rem',
        })
        sliceFrom++
        sliceLength--
      }
    }

    if (collection.definition.createdAtField) {
      sliceLength--
    }

    for (const [fieldName, options] of filteredFieldEntries.slice(sliceFrom, sliceFrom + sliceLength)) {
      columns[fieldName] = puiColumn({
        label:
          'ui' in options && isDefined(options.ui?.label)
            ? maybeTranslate(options.ui.label)
            : __('pruvious-dashboard', titleCase(fieldName, false) as any),
        sortable:
          options.ui.dataTable === false || (isObject(options.ui.dataTable) && options.ui.dataTable.sortable === false)
            ? false
            : options._dataType === 'text'
              ? 'text'
              : 'numeric',
        minWidth: '16rem',
      })
    }

    if (collection.definition.createdAtField) {
      const options = collection.definition.fields.createdAt!
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

        if (field?.startsWith('$')) {
          const column: any = collection.definition.ui.indexPage.table.columns?.find(
            (column) => isObject(column) && 'component' in column && column.key === field,
          )

          if (isDefined(column)) {
            resolvedCustomComponents[column.key] = customComponents[column.component]!()
            columns[column.key] = puiColumn({
              label: isDefined(column.label)
                ? maybeTranslate(column.label)
                : __('pruvious-dashboard', titleCase(column.key.slice(1), false) as any),
              width,
              minWidth: minWidth ?? (isUndefined(width) ? '16rem' : undefined),
            })
          } else {
            console.warn(
              `Unable to resolve custom column \`${field}\` in \`${collection.name}\` collection table columns.`,
            )
          }
        } else if (field) {
          const options = collection.definition.fields[field]

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
              `Unable to resolve field \`${field}\` in \`${collection.name}\` collection table columns. Available fields:`,
              toRaw(collection.definition.fields),
            )
          }
        }
      } else if ('field' in column) {
        const options = collection.definition.fields[column.field]

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
            `Unable to resolve field \`${column.field}\` in \`${collection.name}\` collection table columns. Available fields:`,
            toRaw(collection.definition.fields),
          )
        }
      } else {
        if (isDefined(customComponents[column.component])) {
          resolvedCustomComponents[column.key] = customComponents[column.component]!()
          columns[column.key] = puiColumn({
            label: isDefined(column.label)
              ? maybeTranslate(column.label)
              : __('pruvious-dashboard', titleCase(column.key.slice(1), false) as any),
            width: column.width,
            minWidth: column.minWidth ?? (isUndefined(column.width) ? '16rem' : undefined),
          })
        } else {
          console.warn(
            `Unable to resolve custom component \`${column.component}\` in \`${collection.name}\` collection table columns. Available custom components:`,
            toRaw(customComponents),
          )
        }
      }
    }
  }

  if (isEmpty(columns)) {
    Object.assign(columns, {
      id: puiColumn({ label: maybeTranslate(collection.definition.fields.id!.ui.label), sortable: 'numeric' }),
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
  const orderBy = collection.definition.ui.indexPage.table.orderBy

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

  return [{ field: collection.definition.createdAtField ? 'createdAt' : 'id', direction: 'desc' }]
}

function select(id: number | string) {
  selected.value[id] = true
  table.value!.selectOrigin = id
}

async function onSelectAll() {
  if (data.value.every((row) => selected.value[row.id])) {
    for (const { id } of data.value) {
      delete selected.value[id]
    }
  } else {
    for (const { id } of data.value) {
      selected.value[id] = true
    }
  }
}

function deselect(id: number | string) {
  delete selected.value[id]
}

function applyMultiSelect() {
  emit(
    'update:modelValue',
    Object.entries(selected.value)
      .filter(([_, selected]) => selected)
      .map(([id]) => +id),
  )
  emit('close', popup.value!.close)
}
</script>

<style scoped>
:deep(.p-table-scroller) {
  flex: 1;
}

.p-empty :deep(.pui-table) {
  min-height: 100%;
}

:deep(.pui-table-select-all) {
  display: none;
}

:deep(.pui-table-cell-active-actions .pui-dropdown) {
  max-width: none;
}
</style>
