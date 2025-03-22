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
            resolvedPermissions = await resolveCollectionRecordPermissions(Number(row.id), collection)
          }
        "
        :selectable="selectable"
        :selectAllState="selectAllState"
        :showEmptyState="initialized"
        @doubleClick="navigateTo(dashboardBasePath + `collections/${route.params.collection}/${$event.id}`)"
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
            :collectionName="collection.name"
            :columns="columns"
            :data="cellProps.row"
            :fields="collection.definition.fields"
            :is="resolvedCustomComponents[cellProps.key]"
            :params="params"
            :push="push"
            :refresh="refresh"
          />
          <PruviousDynamicTableField
            v-else
            :cell="cellProps"
            :collectionName="collection.name"
            :columns="columns"
            :data="cellProps.row"
            :fields="collection.definition.fields"
            :modelValue="cellProps.row[cellProps.key]"
            :name="String(cellProps.key)"
            :options="collection.definition.fields[cellProps.key]!"
            :synced="
              collection.definition.translatable && collection.definition.syncedFields.includes(String(cellProps.key))
            "
            :translatable="collection.definition.translatable"
            :type="collection.definition.fields[cellProps.key]!.__fieldType"
          />
        </template>

        <template #actions="{ row }">
          <PUIDropdownItem
            v-if="resolvedPermissions?.[contentLanguage].canUpdate"
            :title="__('pruvious-dashboard', 'Edit')"
            :to="dashboardBasePath + `collections/${route.params.collection}/${row.id}`"
          >
            <Icon mode="svg" name="tabler:pencil" />
            <span>{{ __('pruvious-dashboard', 'Edit') }}</span>
          </PUIDropdownItem>

          <PUIDropdownItem
            v-else
            :title="__('pruvious-dashboard', 'View')"
            :to="dashboardBasePath + `collections/${route.params.collection}/${row.id}`"
          >
            <Icon mode="svg" name="tabler:list-search" />
            <span>{{ __('pruvious-dashboard', 'View') }}</span>
          </PUIDropdownItem>

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

          <PUIDropdownItem
            v-if="collection.definition.duplicate && canCreate"
            :title="__('pruvious-dashboard', 'Duplicate')"
            @click="onDuplicate(row.id)"
          >
            <Icon mode="svg" name="tabler:copy" />
            <span>{{ __('pruvious-dashboard', 'Duplicate') }}</span>
          </PUIDropdownItem>

          <PUIDropdownItem
            v-if="collection.definition.translatable"
            :title="__('pruvious-dashboard', 'Translate')"
            @click="isTranslationPopupVisible = true"
          >
            <Icon mode="svg" name="tabler:language" />
            <span>{{ __('pruvious-dashboard', 'Translate') }}</span>
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

            <PUIButton :to="dashboardBasePath + `collections/${route.params.collection}/new`" variant="primary">
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
    />

    <PruviousDashboardTableSettingsPopup
      v-if="isTableSettingsPopupVisible"
      v-model:columns="columns"
      v-model:params="params"
      :collection="collection"
      :paginated="paginated"
      :size="-1"
      @close="$event().then(() => (isTableSettingsPopupVisible = false))"
      @update:columns="
        (columns) => {
          if (compareColumns(columns, defaultColumns)) {
            route.query._columns = null
          } else {
            route.query._columns = Object.entries(columns)
              .map(([fieldName, { width, minWidth }]) => [fieldName, width, minWidth].filter(isDefined).join('|'))
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
  getCollectionBySlug,
  hasPermission,
  maybeTranslate,
  pruviousDashboardGet,
  pruviousDashboardPost,
  QueryBuilder,
  resolveCollectionRecordPermissions,
  useDashboardContentLanguage,
  useSelectQueryBuilderParams,
  type ResolvedCollectionRecordPermissions,
} from '#pruvious/client'
import type { CollectionUIOptions, Permission } from '#pruvious/server'
import type { Paginated, QueryBuilderResult } from '@pruvious/orm'
import {
  deepCompare,
  isDefined,
  isEmpty,
  isNull,
  isObject,
  isString,
  isUndefined,
  nanoid,
  omit,
  titleCase,
} from '@pruvious/utils'
import { onKeyStroke } from '@vueuse/core'
import { resolveCollectionLayout } from '../../../../utils/pruvious/dashboard/layout'

definePageMeta({
  path: dashboardBasePath + 'collections/:collection',
  middleware: [
    'pruvious-dashboard',
    'pruvious-dashboard-auth-guard',
    (to) => {
      const collection = getCollectionBySlug(to.params.collection)

      if (!collection || collection.definition.ui.hidden) {
        puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
          type: 'error',
          description: __('pruvious-dashboard', 'Page not found'),
          showAfterRouteChange: true,
        })
        return navigateTo(dashboardBasePath + 'overview')
      }
    },
  ],
})

const route = useRoute()
const collection = getCollectionBySlug(route.params.collection)!
const layout = resolveCollectionLayout('index', collection)
const label = isDefined(collection.definition.ui.label)
  ? maybeTranslate(collection.definition.ui.label)
  : __('pruvious-dashboard', titleCase(collection.name ?? '', false) as any)

useHead({
  title: label,
})

provide('showContentLanguageSwitcher', collection.definition.translatable)

const queryBuilder = new QueryBuilder({ fetcher: pruviousDashboardPost })
const contentLanguage = useDashboardContentLanguage()
const canManage = hasPermission(`collection:${route.params.collection}:manage` as Permission)
const canCreate =
  collection.definition.api.update && hasPermission(`collection:${route.params.collection}:create` as Permission)
const canDelete =
  collection.definition.api.update && hasPermission(`collection:${route.params.collection}:delete` as Permission)
const isManaged = collection.definition.authorField || collection.definition.editorsField
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
const resolvedPermissions = ref<ResolvedCollectionRecordPermissions | null>(null)
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
const defaultColumns = resolveColumns(collection.definition.ui.indexPage.table.columns)
const columnsDirty = ref(false)
const { columns, data, sort } = puiTable({ columns: resolveColumns() })
const refreshing = ref(false)
const { params, push, refresh, isDirty } = useSelectQueryBuilderParams({
  watch: ['columns'],
  callback: async ({ queryString, params }) => {
    refreshing.value = true
    columns.value = resolveColumns()
    columnsDirty.value = !compareColumns(columns.value, defaultColumns)

    sort.value = params.orderBy?.[0]
      ? { column: params.orderBy[0].field, direction: params.orderBy[0].direction! }
      : null

    const query = queryBuilder
      .selectFrom(collection.name)
      .fromQueryString(queryString)
      .select(['id', ...Object.keys(columns.value).filter((column) => !column.startsWith('$'))] as any)

    if (collection.definition.translatable) {
      query.where('language', '=', contentLanguage.value)
    }

    const response = await query.paginate()

    if (response.success) {
      data.value = response.data.records as any
      paginated.value = omit(response.data, ['records'])

      if (paginated.value.currentPage > paginated.value.lastPage) {
        params.page = paginated.value.lastPage || 1
        push(true)
      }
    }

    initialized.value = true
    refreshing.value = false
  },
  defaultParams: {
    orderBy: resolveOrderBy(),
    page: 1,
    perPage: collection.definition.ui.indexPage.table.perPage,
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

watch(contentLanguage, () => refresh(true))

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

    for (const [fieldName, options] of filteredFieldEntries.slice(0, collection.definition.createdAtField ? 4 : 5)) {
      columns[fieldName] = puiColumn({
        label:
          'ui' in options && isDefined(options.ui?.label)
            ? maybeTranslate(options.ui.label)
            : __('pruvious-dashboard', titleCase(fieldName, false) as any),
        sortable: options.__dataType === 'text' ? 'text' : 'numeric',
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
              sortable: options.__dataType === 'text' ? 'text' : 'numeric',
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
            sortable: options.__dataType === 'text' ? 'text' : 'numeric',
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
    if (isString(orderBy)) {
      const [field, direction, nulls] = orderBy.split(':').map((p) => p.trim())
      return [{ field, direction: direction ?? 'asc', nulls: nulls ?? 'nullsAuto' }] as any
    } else {
      return [orderBy]
    }
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
    const duplicate = await pruviousDashboardGet(`collections/${route.params.collection}/${id}/duplicate` as any)

    if (duplicate.success) {
      const query = await queryBuilder.insertInto(collection.name).values(duplicate.data).run()

      if (query.success && query.data > 0) {
        puiToast(__('pruvious-dashboard', 'Duplicated'), { type: 'success' })
      } else if (query.runtimeError) {
        puiToast(query.runtimeError)
      } else if (!isEmpty(query.inputErrors)) {
        puiToast(__('pruvious-dashboard', 'Error'), {
          type: 'error',
          description: '```\n' + JSON.stringify(query.inputErrors, null, 2) + '\n```',
        })
      } else {
        puiToast(__('pruvious-dashboard', 'An error occurred during duplication'), { type: 'error' })
      }
    } else {
      puiToast(duplicate.error.message ?? __('pruvious-dashboard', 'An error occurred during duplication'), {
        type: 'error',
      })
    }
  }

  if (
    collection.definition.translatable &&
    Object.values(resolvedPermissions.value!).filter(({ id }) => id).length > 1
  ) {
    const action = await puiDialog({
      content: __('pruvious-dashboard', 'Would you like to duplicate all translations or only the current one?'),
      actions: [
        { name: 'cancel', label: __('pruvious-dashboard', 'Cancel') },
        { name: 'all', label: __('pruvious-dashboard', 'All'), variant: 'primary' },
        { name: 'current', label: __('pruvious-dashboard', 'Current'), variant: 'primary' },
      ],
    })

    if (action === 'all') {
      const r1 = await Promise.all(
        Object.values(resolvedPermissions.value!).map(({ id }) =>
          pruviousDashboardGet(`collections/${route.params.collection}/${id}/duplicate` as any),
        ),
      )
      const p2: Promise<QueryBuilderResult<number, Record<string, string>[]>>[] = []
      const translations = nanoid()

      for (const [language, { id }] of Object.entries(resolvedPermissions.value!)) {
        if (id) {
          const duplicate = r1.find(({ data }) => data.language === language)

          if (!duplicate?.success) {
            puiToast(duplicate?.error.message ?? __('pruvious-dashboard', 'An error occurred during duplication'), {
              type: 'error',
            })
            return
          }

          p2.push(
            queryBuilder
              .insertInto(collection.name)
              .values({ ...duplicate.data, translations })
              .run(),
          )
        }
      }

      const r2 = await Promise.all(p2)

      for (const r of r2) {
        if (!r.success) {
          if (r.runtimeError) {
            puiToast(r.runtimeError)
          } else if (!isEmpty(r.inputErrors)) {
            puiToast(__('pruvious-dashboard', 'Error'), {
              type: 'error',
              description: '```\n' + JSON.stringify(r.inputErrors, null, 2) + '\n```',
            })
          } else {
            puiToast(__('pruvious-dashboard', 'An error occurred during duplication'), { type: 'error' })
          }
        }
      }

      if (r2.every((r) => r.success)) {
        puiToast(__('pruvious-dashboard', 'Duplicated'), { type: 'success' })
      }
    } else if (action === 'current') {
      await duplicateOne()
    }
  } else {
    await duplicateOne()
  }

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

        if (collection.definition.translatable) {
          query.where('language', '=', contentLanguage.value)
        }

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
