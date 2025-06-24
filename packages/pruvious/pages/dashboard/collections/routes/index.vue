<template>
  <component
    :collection="collection"
    :is="layout"
    :label="label"
    :queryBuilder="queryBuilder"
    noMainPadding
    noMainScroll
  >
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
        :onOpenActions="
          async ({ row }) => {
            resolvedPermissions = await resolveTranslatableCollectionRecordPermissions(Number(row.id), collection)
          }
        "
        :selectable="selectable"
        :selectAllState="selectAllState"
        :showEmptyState="initialized"
        @doubleClick="
          navigateTo(
            dashboardBasePath +
              `collections/routes/${$event.id}` +
              (languages.length > 1 ? `?language=${contentLanguage}` : ''),
          )
        "
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
            :type="collection.definition.fields[cellProps.key]!._fieldType"
          />
        </template>

        <template #actions="{ row }">
          <PUIDropdownItem
            v-if="resolvedPermissions?.[contentLanguage].canUpdate"
            :title="__('pruvious-dashboard', 'Edit')"
            :to="
              dashboardBasePath +
              `collections/routes/${row.id}` +
              (languages.length > 1 ? `?language=${contentLanguage}` : '')
            "
          >
            <Icon mode="svg" name="tabler:pencil" />
            <span>{{ __('pruvious-dashboard', 'Edit') }}</span>
          </PUIDropdownItem>

          <PUIDropdownItem
            v-else
            :title="__('pruvious-dashboard', 'View')"
            :to="
              dashboardBasePath +
              `collections/routes/${row.id}` +
              (languages.length > 1 ? `?language=${contentLanguage}` : '')
            "
          >
            <Icon mode="svg" name="tabler:list-search" />
            <span>{{ __('pruvious-dashboard', 'View') }}</span>
          </PUIDropdownItem>

          <PUIDropdownItem
            v-if="collection.definition.duplicate && canCreate"
            :title="__('pruvious-dashboard', 'Duplicate')"
            @click="onDuplicate(row.id)"
          >
            <Icon mode="svg" name="tabler:copy" />
            <span>{{ __('pruvious-dashboard', 'Duplicate') }}</span>
          </PUIDropdownItem>

          <PUIDropdownItem
            v-if="resolvedPermissions?.[contentLanguage].canDelete"
            :title="__('pruvious-dashboard', 'Delete')"
            @click="onDelete(row.id)"
            destructive
          >
            <Icon mode="svg" name="tabler:trash-x" />
            <span>{{ __('pruvious-dashboard', 'Delete') }}</span>
          </PUIDropdownItem>

          <hr />

          <PUIDropdownItem
            v-if="selected[row.id]"
            :title="__('pruvious-dashboard', 'Deselect')"
            @click="deselect(row.id)"
          >
            <Icon mode="svg" name="tabler:square-off" />
            <span>{{ __('pruvious-dashboard', 'Deselect') }}</span>
          </PUIDropdownItem>

          <PUIDropdownItem
            v-else-if="canDelete && (!isManaged || canManage)"
            :title="__('pruvious-dashboard', 'Select')"
            @click="select(row.id)"
          >
            <Icon mode="svg" name="tabler:checkbox" />
            <span>{{ __('pruvious-dashboard', 'Select') }}</span>
          </PUIDropdownItem>
        </template>
      </PUITable>

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
              v-if="canDelete && selectable"
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

            <PUIButton :to="dashboardBasePath + 'collections/routes/new'" variant="primary">
              <span>{{ __('pruvious-dashboard', 'New') }}</span>
              <Icon mode="svg" name="tabler:note" />
            </PUIButton>
          </div>
        </div>
      </template>
    </PruviousDashboardTableWrapper>

    <PruviousDashboardCollectionTranslationsPopup
      v-if="isTranslationPopupVisible && resolvedPermissions"
      :collection="collection"
      :currentlyEditingLabel="__('pruvious-dashboard', 'selected')"
      :id="resolvedPermissions[contentLanguage].id!"
      :resolvedPermissions="resolvedPermissions"
      :size="-1"
      @close="$event().then(() => (isTranslationPopupVisible = false))"
      showEditCurrentButton
    />

    <PruviousDashboardTableSettingsPopup
      v-if="isTableSettingsPopupVisible"
      v-model:params="params"
      :collection="collectionWithoutSuffix"
      :columns="columnsWithoutSuffix"
      :defaultColumns="defaultColumnsWithoutSuffix"
      :defaultOrderBy="defaultOrderByWithoutSuffix"
      :paginated="paginated"
      :size="-1"
      @close="$event().then(() => (isTableSettingsPopupVisible = false))"
      @update:columns="
        (_columns) => {
          columns = remap(_columns, (k, v) => [addSuffixToColumns(k), v])
          if (compareColumns(columns, defaultColumns)) {
            route.query._columns = null
          } else {
            route.query._columns = Object.entries(columns)
              .map(([fieldName, { width, minWidth }]) => {
                const parts = removeSuffixFromColumns([fieldName])
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
  </component>
</template>

<script lang="ts" setup>
import {
  __,
  customComponents,
  dashboardBasePath,
  dashboardMiddleware,
  getCollectionBySlug,
  hasPermission,
  languages,
  maybeTranslate,
  pruviousDashboardGet,
  pruviousDashboardPost,
  QueryBuilder,
  resolveTranslatableCollectionRecordPermissions,
  useCollectionRecordPermissions,
  useDashboardContentLanguage,
  useSelectQueryBuilderParams,
  type ResolvedTranslatableCollectionRecordPermissions,
} from '#pruvious/client'
import type { CollectionUIOptions, Permission } from '#pruvious/server'
import type { ExplicitWhereOrGroup, Paginated, SelectQueryBuilderParams, WhereField } from '@pruvious/orm'
import { decodeQueryString, selectQueryBuilderParamsToQueryString } from '@pruvious/orm/query-string'
import { puiDialog } from '@pruvious/ui/pui/dialog'
import { puiHasModifierKey, puiIsEditingText, usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import { puiHTMLInit } from '@pruvious/ui/pui/html'
import { usePUIOverlayCounter } from '@pruvious/ui/pui/overlay'
import { puiColumn, puiTable, type PUIColumns } from '@pruvious/ui/pui/table'
import { puiQueueToast, puiToast } from '@pruvious/ui/pui/toast'
import { puiTooltipInit } from '@pruvious/ui/pui/tooltip'
import {
  deepClone,
  deepCompare,
  isArray,
  isDefined,
  isEmpty,
  isNull,
  isObject,
  isString,
  isUndefined,
  omit,
  remap,
  titleCase,
  toArray,
} from '@pruvious/utils'
import { onKeyStroke } from '@vueuse/core'
import { resolveCollectionLayout } from '../../../../utils/pruvious/dashboard/layout'

definePageMeta({
  path: dashboardBasePath + 'collections/routes',
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
    (to) =>
      dashboardMiddleware(to, ({ __, getCollectionBySlug, puiQueueToast }) => {
        const collection = getCollectionBySlug('routes')

        if (!collection || collection.definition.ui.hidden) {
          puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
            type: 'error',
            description: __('pruvious-dashboard', 'Page not found'),
            showAfterRouteChange: true,
          })
          return navigateTo(dashboardBasePath + 'overview')
        }
      }),
  ],
})

await puiHTMLInit()
puiTooltipInit()

const route = useRoute()
const collection = getCollectionBySlug('routes')!
const collectionWithoutSuffix = computed(() => ({
  name: collection.name,
  definition: {
    ...collection.definition,
    fields: Object.fromEntries(
      Object.entries(collection.definition.fields)
        .map(([k, v]) => [removeSuffixFromColumns(k)!, v])
        .filter(([k]) => !languages.some(({ code }) => k?.endsWith(code.toUpperCase()))),
    ),
  },
}))
const layout = resolveCollectionLayout('index', collection)
const label = isDefined(collection.definition.ui.label)
  ? maybeTranslate(collection.definition.ui.label)
  : __('pruvious-dashboard', titleCase(collection.name ?? '', false) as any)

useHead({
  title: label,
})

provide('showContentLanguageSwitcher', true)

const queryBuilder = new QueryBuilder({ fetcher: pruviousDashboardPost })
const contentLanguage = useDashboardContentLanguage()
const columnsWithSuffix = ['path', 'isPublic', 'scheduledAt', 'redirects']
const canManage = hasPermission('collection:routes:manage' as Permission)
const canCreate = collection.definition.api.create && hasPermission('collection:routes:create' as Permission)
const canDelete = collection.definition.api.update && hasPermission('collection:routes:delete' as Permission)
const isManaged = collection.definition.authorField || collection.definition.editorsField
const recordsPermissions = useCollectionRecordPermissions(collection)
const { listen } = usePUIHotkeys()
const overlayCounter = usePUIOverlayCounter()
const tableWrapper = useTemplateRef('tableWrapper')
const table = useTemplateRef('table')
const selectable = ref(false)
const selected = ref<Record<number | string, boolean>>({})
const allSelected = ref(false)
const selectedCount = computed(() =>
  allSelected.value ? paginated.value.total : Object.values(selected.value).filter(Boolean).length,
)
const selectAllState = ref<boolean | 'indeterminate'>(false)
const resolvedPermissions = ref<ResolvedTranslatableCollectionRecordPermissions | null>(null)
const isTranslationPopupVisible = ref(false)
const isTableSettingsPopupVisible = ref(false)
const paginated = ref<Omit<Paginated<any>, 'records'>>({
  currentPage: 1,
  lastPage: 1,
  perPage: collection.definition.ui.indexPage.table.perPage,
  total: 0,
})
const resolvedCustomComponents: Record<string, Component | string> = {}
const initialized = ref(false)
const defaultColumns = ref(resolveColumns(collection.definition.ui.indexPage.table.columns ?? null))
const defaultColumnsWithoutSuffix = computed(() =>
  remap(defaultColumns.value, (k, v) => [removeSuffixFromColumns(k)!, v]),
)
const columnsDirty = ref(false)
const { columns, data, sort } = puiTable({ columns: resolveColumns() })
const columnsWithoutSuffix = computed(() => remap(columns.value, (k, v) => [removeSuffixFromColumns(k)!, v]))
const refreshing = ref(false)
const defaultOrderBy = ref(resolveOrderBy())
const defaultOrderByWithoutSuffix = computed(() =>
  defaultOrderBy.value.map((order) => ({ ...order, field: removeSuffixFromColumns(order.field) })),
)
const defaultParams: Omit<SelectQueryBuilderParams, 'select' | 'groupBy' | 'offset' | 'limit' | 'populate'> = {
  orderBy: defaultOrderByWithoutSuffix.value,
  page: 1,
  perPage: collection.definition.ui.indexPage.table.perPage,
}
const stringifiedDefaultParams = Object.fromEntries(
  selectQueryBuilderParamsToQueryString(defaultParams)
    .split('&')
    .filter(Boolean)
    .map((param) => {
      const parts = param.split('=')
      return [parts.shift()!, parts.join('=')].map(decodeQueryString)
    }),
)
const { params, refresh, isDirty } = useSelectQueryBuilderParams({
  watch: ['columns'],
  callback: async ({ params }) => {
    refreshing.value = true
    columns.value = resolveColumns()
    columnsDirty.value =
      !compareColumns(columns.value, defaultColumns.value) &&
      !compareColumns(columns.value, defaultColumnsWithoutSuffix.value)

    sort.value = params.orderBy?.[0]
      ? { column: addSuffixToColumns(params.orderBy[0].field), direction: params.orderBy[0].direction! }
      : null

    const _params = deepClone(params)

    if (_params.where) {
      addSuffixToWhere(_params.where)
    }

    if (_params.orderBy) {
      _params.orderBy = _params.orderBy.map((order) => ({
        field: addSuffixToColumns(order.field),
        direction: order.direction,
        nulls: order.nulls,
      }))
    }

    const query = queryBuilder
      .selectFrom(collection.name)
      .fromQueryString(selectQueryBuilderParamsToQueryString(_params))
    const response = await query.paginate()

    if (response.success) {
      data.value = response.data.records as any
      paginated.value = omit(response.data, ['records'])
      recordsPermissions.clearCache()

      if (paginated.value.currentPage > paginated.value.lastPage) {
        params.page = paginated.value.lastPage || 1
        push(true)
      }
    }

    initialized.value = true
    refreshing.value = false
  },
  defaultParams,
  checkDirty: ['where', 'orderBy'],
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

watch(contentLanguage, async () => {
  columns.value = resolveColumns()
  defaultColumns.value = resolveColumns(collection.definition.ui.indexPage.table.columns ?? null)
  defaultOrderBy.value = resolveOrderBy()
  await refresh(true)
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

listen('selectAll', (event) => {
  if (canDelete && paginated.value.total && (!isManaged || canManage)) {
    event.preventDefault()
    onSelectAll()
  }
})

listen('delete', () => {
  if (canDelete && selectable.value) {
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
        ? collection.definition.ui.indexPage.table.columns
        : String(route.query.columns).split(',')
      : isString(from)
        ? from.split(',')
        : from

  if (isUndefined(source) || isNull(source)) {
    const filteredFieldEntries = Object.entries(collection.definition.fields).filter(([_, options]) =>
      'ui' in options ? !options.ui?.hidden : true,
    )
    let slice = 5

    if (collection.definition.createdAtField) {
      slice--
    }

    for (const [fieldName, options] of filteredFieldEntries.slice(0, slice)) {
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
        const [_field, width, minWidth] = column.split('|').map((p) => p.trim())
        const field = addSuffixToColumns(_field)

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
        const field = addSuffixToColumns(column.field)
        const options = collection.definition.fields[field]

        if (options) {
          columns[field] = puiColumn({
            label: isDefined(column.label)
              ? maybeTranslate(column.label)
              : 'ui' in options && isDefined(options.ui?.label)
                ? maybeTranslate(options.ui.label)
                : __('pruvious-dashboard', titleCase(field, false) as any),
            sortable: options._dataType === 'text' ? 'text' : 'numeric',
            width: column.width,
            minWidth: column.minWidth ?? (isUndefined(column.width) ? '16rem' : undefined),
          })
        } else {
          console.warn(
            `Unable to resolve field \`${field}\` in \`${collection.name}\` collection table columns. Available fields:`,
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
        const [_field, direction, nulls] = orderBy.split(':').map((p) => p.trim())
        const field = addSuffixToColumns(_field)
        return { field, direction: direction ?? 'asc', nulls: nulls ?? 'nullsAuto' } as any
      } else {
        return { ...orderBy, field: addSuffixToColumns(orderBy.field) }
      }
    })
  }

  return [{ field: collection.definition.createdAtField ? 'createdAt' : 'id', direction: 'desc' }]
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

async function onDuplicate(id: number | string) {
  async function duplicateOne() {
    const duplicate = await pruviousDashboardGet(`collections/routes/${id}/duplicate` as any)

    if (duplicate.success) {
      const query = await queryBuilder.insertInto(collection.name).values(duplicate.data).run()

      if (query.success && query.data > 0) {
        puiToast(__('pruvious-dashboard', 'Duplicated'), { type: 'success' })
      } else if (!isEmpty(query.inputErrors)) {
        puiToast(__('pruvious-dashboard', 'Error'), {
          type: 'error',
          description: '```\n' + JSON.stringify(query.inputErrors, null, 2) + '\n```',
        })
      } else if (!query.runtimeError) {
        puiToast(__('pruvious-dashboard', 'An error occurred during duplication'), { type: 'error' })
      }
    } else {
      puiToast(duplicate.error.message ?? __('pruvious-dashboard', 'An error occurred during duplication'), {
        type: 'error',
      })
    }
  }

  await duplicateOne()
  await refresh(true)
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
    const query = await queryBuilder.deleteFrom(collection.name).where('id', '=', id).run()

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
      const lastId = await queryBuilder
        .selectFrom(collection.name)
        .select('id')
        .orderBy('id', 'desc')
        .limit(paginated.value.total)
        .first()

      if (lastId.success && lastId.data) {
        const query = queryBuilder.deleteFrom(collection.name).where('id', '<=', lastId.data.id)
        const result = await query.run()

        if (result.success) {
          count = result.data
        }
      }
    } else {
      const ids = Object.keys(selected.value).filter((id) => selected.value[id])
      const queries: Promise<any>[] = []

      for (let i = 0; i < ids.length; i += 50) {
        queries.push(
          queryBuilder
            .deleteFrom(collection.name)
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

function addSuffixToColumns<T extends string | string[] | undefined>(columns: T): T {
  if (isUndefined(columns)) {
    return undefined as T
  }
  const resolved = toArray(columns).map((column) =>
    columnsWithSuffix.includes(column) ? column + contentLanguage.value.toUpperCase() : column,
  )
  return (isString(columns) ? resolved[0] : resolved) as T
}

function addSuffixToWhere(where: (WhereField<string> | ExplicitWhereOrGroup<string>)[]) {
  if (isArray(where)) {
    for (const condition of where) {
      if (isObject(condition)) {
        if ('field' in condition && isString(condition.field)) {
          condition.field = addSuffixToColumns(condition.field)
        } else if ('or' in condition) {
          condition.or.forEach(addSuffixToWhere)
        }
      }
    }
  }
}

function removeSuffixFromColumns<T extends string | string[] | undefined>(columns: T): T {
  if (isUndefined(columns)) {
    return undefined as T
  }
  const resolved = toArray(columns).map((column) =>
    column.endsWith(contentLanguage.value.toUpperCase()) ? column.slice(0, -contentLanguage.value.length) : column,
  )
  return (isString(columns) ? resolved[0] : resolved) as T
}

function removeSuffixFromWhere(where: (WhereField<string> | ExplicitWhereOrGroup<string>)[]) {
  if (isArray(where)) {
    for (const condition of where) {
      if (isObject(condition)) {
        if ('field' in condition && isString(condition.field)) {
          condition.field = removeSuffixFromColumns(condition.field)
        } else if ('or' in condition) {
          condition.or.forEach(removeSuffixFromWhere)
        }
      }
    }
  }
}

function push(replace = false) {
  const p: Record<string, any> = omit({ ...defaultParams, ...route.query, ...params.value }, [
    'select',
    'groupBy',
    'offset',
    'limit',
    'populate',
  ] as any)

  if (p.columns) {
    p.columns = isArray(p.columns)
      ? removeSuffixFromColumns(p.columns as any)
      : isString(p.columns)
        ? p.columns.split(',').map(removeSuffixFromColumns).join(',')
        : p.columns
  }

  if (p.where) {
    removeSuffixFromWhere(p.where as any)
  }

  if (p.orderBy) {
    p.orderBy = isArray(p.orderBy)
      ? p.orderBy.map((order: any) => ({
          field: removeSuffixFromColumns(order.field),
          direction: order.direction,
          nulls: order.nulls,
        }))
      : isString(p.orderBy)
        ? p.orderBy.split(',').map((order) => {
            const [field, direction, nulls] = order.split(':').map((p) => p.trim())
            return { field: removeSuffixFromColumns(field), direction, nulls }
          })
        : p.orderBy
  }

  const pOther = omit(p, ['where', 'orderBy', 'perPage', 'page'])
  const pSelect = Object.fromEntries(
    selectQueryBuilderParamsToQueryString(p)
      .split('&')
      .filter(Boolean)
      .map((param) => {
        const parts = param.split('=')
        return [parts.shift()!, decodeQueryString(parts.join('='))].map(decodeQueryString)
      }),
  )
  const query: Record<string, any> = { ...pOther, ...pSelect }

  for (const [key, value] of Object.entries(stringifiedDefaultParams)) {
    if (query[key] === value) {
      delete query[key]
    }
  }

  for (const key in query) {
    if (key.startsWith('_')) {
      query[key.slice(1)] = query[key]
      delete query[key]
    }
  }

  for (const key in query) {
    if (isNull(query[key])) {
      delete query[key]
    }
  }

  nextTick(() => navigateTo({ query, replace }))
}
</script>

<style scoped>
:deep(.p-page-main) {
  height: 100%;
}

:deep(.p-table-scroller) {
  flex: 1;
}

.p-empty :deep(.pui-table) {
  min-height: 100%;
}
</style>
