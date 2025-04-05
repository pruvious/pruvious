<template>
  <PUIPopup @close="close()" @keydown="$emit('keydown', $event)" fullHeight ref="popup">
    <template #header>
      <div class="pui-row">
        <span class="p-title">{{ __('pruvious-dashboard', 'View configuration') }}</span>
        <PUIButton
          :size="-2"
          :title="__('pruvious-dashboard', 'Close')"
          @click="close()"
          variant="ghost"
          class="pui-ml-auto"
        >
          <Icon mode="svg" name="tabler:x" />
        </PUIButton>
      </div>
    </template>

    <PUITabs :active="activeTab" :list="tabsList" @change="onTabChange" class="p-tabs">
      <PUITab name="filters">
        <PruviousDashboardWhereFilters
          v-model="data.where"
          :collection="collection"
          :fieldChoices="whereFieldChoices"
          @commit="
            (where) => {
              data = { ...data, where, activeTab }
              if (history.size) {
                if (rewriteHistory && !filtersInitialized) {
                  const newStates = history.getAllStates().map((state) => ({ ...state, where }))
                  ;(history as any).states = newStates
                  history.setOriginalState(newStates[0]!)
                  filtersInitialized = true
                } else {
                  nextTick(() => history.pushDebounced(prepareHistory(data)))
                }
              }
            }
          "
          ref="whereFiltersComponent"
        />
      </PUITab>

      <PUITab name="columns">
        <PruviousDashboardTableColumnsConfigurator
          v-model="data.columns"
          :collection="collection"
          :fieldChoices="columnFieldChoices"
          @commit="
            (columns) => {
              data = { ...data, columns, activeTab }
              if (history.size) {
                nextTick(() => history.push(prepareHistory(data)))
              }
            }
          "
        />
      </PUITab>

      <PUITab name="sorting">
        <PruviousDashboardOrderBy
          v-model="data.orderBy"
          :collection="collection"
          :fieldChoices="orderByFieldChoices"
          @commit="
            (orderBy) => {
              data = { ...data, orderBy, activeTab }
              if (history.size) {
                nextTick(() => history.push(prepareHistory(data)))
              }
            }
          "
        />
      </PUITab>

      <PUITab name="bookmarks">
        <PruviousDashboardTableSettingsBookmarks
          v-model="data"
          :appliedSettings="appliedData"
          :collection="collection"
          :isDefault="isDefault"
          :isDefaultApplied="isDefaultApplied"
          @apply="apply()"
          @restore="
            (apply) => {
              if (apply) {
                restore()
              } else {
                data = {
                  where: [],
                  columns: deepClone(props.defaultColumns),
                  orderBy: deepClone(props.defaultOrderBy),
                  activeTab,
                }
                nextTick(() => history.push(prepareHistory(data)))
              }
            }
          "
          @update:modelValue="nextTick(() => history.push(prepareHistory(data)))"
        />
      </PUITab>
    </PUITabs>

    <template #footer>
      <div class="pui-justify-between">
        <PruviousDashboardHistoryButtons
          v-model="data"
          :history="history"
          @update:modelValue="nextTick(whereFiltersComponent?.refresh)"
        />

        <div class="pui-row">
          <PUIButton
            v-if="!isDefault"
            v-pui-tooltip="__('pruvious-dashboard', 'Restore defaults')"
            @click="restore()"
            variant="outline"
          >
            <Icon mode="svg" name="tabler:restore" />
          </PUIButton>

          <PUIButton :variant="history.isDirty.value ? 'primary' : 'outline'" @click="apply()">
            {{ __('pruvious-dashboard', 'Apply') }}
          </PUIButton>
        </div>
      </div>
    </template>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { __, hasPermission, History, maybeTranslate, resolveFieldLabel, unsavedChanges } from '#pruvious/client'
import type { Collections, SerializableCollection } from '#pruvious/server'
import type { WhereField as _WhereField, Paginated, SelectQueryBuilderParams } from '@pruvious/orm'
import type { PUITabListItem } from '@pruvious/ui/components/PUITabs.vue'
import { usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import { puiColumn, type PUIColumn, type PUIColumns } from '@pruvious/ui/pui/table'
import {
  blurActiveElement,
  castToBoolean,
  castToNumber,
  deepClone,
  isDefined,
  isEmpty,
  isObject,
  omit,
  remap,
  sortNaturallyByProp,
  titleCase,
} from '@pruvious/utils'

export interface WhereOrGroupSimplified {
  or: (_WhereField | WhereOrGroupSimplified)[][]
}

export interface TableSettings {
  where: (_WhereField | WhereOrGroupSimplified)[]
  columns: {
    [key: string]: Omit<PUIColumn, 'label' | 'TType'>
  }
  orderBy: {
    field: string
    direction?: 'asc' | 'desc'
    nulls?: 'nullsAuto' | 'nullsFirst' | 'nullsLast'
  }[]
  activeTab: Tab
}

type Tab = 'filters' | 'columns' | 'sorting' | 'bookmarks'

const props = defineProps({
  /**
   * The current `SelectQueryBuilderParams`.
   */
  params: {
    type: Object as PropType<SelectQueryBuilderParams>,
    required: true,
  },

  /**
   * The current columns configuration.
   */
  columns: {
    type: Object as PropType<PUIColumns>,
    required: true,
  },

  /**
   * The name and definition of the current translatable collection.
   */
  collection: {
    type: Object as PropType<{ name: keyof Collections; definition: SerializableCollection }>,
    required: true,
  },

  /**
   * The paginated records metadata.
   */
  paginated: {
    type: Object as PropType<Omit<Paginated<any>, 'records'>>,
    required: true,
  },

  /**
   * The default `columns` configuration.
   */
  defaultColumns: {
    type: Object as PropType<PUIColumns>,
    required: true,
  },

  /**
   * The default `params.orderBy` configuration.
   */
  defaultOrderBy: {
    type: Array as PropType<TableSettings['orderBy']>,
    required: true,
  },
})

const emit = defineEmits<{
  'update:params': [params: SelectQueryBuilderParams]
  'update:columns': [columns: PUIColumns]
  'close': [close: () => Promise<void>]
  'keydown': [event: KeyboardEvent]
}>()

provide('floatingStrategy', 'absolute')

const route = useRoute()
const popup = useTemplateRef('popup')
const activeTab = ref<Tab>('filters')
const tabsList = computed<PUITabListItem<Tab>[]>(() => {
  const list: PUITabListItem<Tab>[] = [
    { name: 'filters', label: __('pruvious-dashboard', 'Filters') },
    { name: 'columns', label: __('pruvious-dashboard', 'Columns') },
    { name: 'sorting', label: __('pruvious-dashboard', 'Sorting') },
  ]
  if (hasPermission('collection:bookmarks:read')) {
    list.push({ name: 'bookmarks', label: __('pruvious-dashboard', 'Bookmarks') })
  }
  return list
})
const data = ref<TableSettings>({ where: [], columns: {}, orderBy: [], activeTab: activeTab.value })
const appliedData = ref<TableSettings>(deepClone(data.value))
const initialized = ref(false)
const whereFieldChoices = computed(() =>
  sortNaturallyByProp(
    Object.entries(props.collection.definition.fields)
      .filter(
        ([_, definition]) =>
          !(
            isObject(definition.ui) &&
            (definition.ui.dataTable === false ||
              (isObject(definition.ui.dataTable) && definition.ui.dataTable.filterable === false))
          ),
      )
      .map(([fieldName, definition]) => ({
        value: fieldName,
        label: resolveFieldLabel(definition.ui?.label, fieldName),
      })),
    'label',
  ),
)
const columnFieldChoices = computed(() =>
  sortNaturallyByProp(
    [
      ...Object.entries(props.collection.definition.fields)
        .filter(
          ([_, definition]) =>
            !(
              isObject(definition.ui) &&
              (definition.ui.dataTable === false ||
                (isObject(definition.ui.dataTable) && definition.ui.dataTable.visible === false))
            ),
        )
        .map(([columnName, definition]) => ({
          value: columnName,
          label: resolveFieldLabel(definition.ui?.label, columnName),
        })),
      ...(props.collection.definition.ui.indexPage.table.columns ?? [])
        .filter((column) => isObject(column) && 'component' in column)
        .map((column) => ({
          value: column.key,
          label: isDefined(column.label)
            ? maybeTranslate(column.label)
            : __('pruvious-dashboard', titleCase(column.key.slice(1), false) as any),
        })),
    ],
    'label',
  ),
)
const orderByFieldChoices = computed(() =>
  sortNaturallyByProp(
    Object.entries(props.collection.definition.fields)
      .filter(
        ([_, definition]) =>
          !(
            isObject(definition.ui) &&
            (definition.ui.dataTable === false ||
              (isObject(definition.ui.dataTable) && definition.ui.dataTable.sortable === false))
          ),
      )
      .map(([fieldName, definition]) => ({
        value: fieldName,
        label: resolveFieldLabel(definition.ui?.label, fieldName),
      })),
    'label',
  ),
)
const history = new History({ omit: ['activeTab'] })
const rewriteHistory = ref(false)
const filtersInitialized = ref(false)
const whereFiltersComponent = useTemplateRef('whereFiltersComponent')
const { listen, isListening } = usePUIHotkeys({
  allowInOverlays: true,
  target: () => (popup.value?.root instanceof HTMLDivElement ? popup.value.root : popup.value?.$el),
  listen: false,
})
const isDefault = computed(
  () =>
    isEmpty(data.value.where) &&
    Object.keys(data.value.columns).length === Object.keys(props.defaultColumns).length &&
    Object.entries(data.value.columns).every(
      ([key, { width }]) => props.defaultColumns[key] && props.defaultColumns[key].width === width,
    ) &&
    data.value.orderBy.every(({ field, direction, nulls }, i) => {
      direction ??= 'asc'
      nulls = (nulls ?? 'nullsAuto') === 'nullsAuto' ? (direction === 'asc' ? 'nullsFirst' : 'nullsLast') : nulls
      const _field = props.defaultOrderBy[i]?.field
      const _direction = props.defaultOrderBy[i]?.direction ?? 'asc'
      const _nulls =
        (props.defaultOrderBy[i]?.nulls ?? 'nullsAuto') === 'nullsAuto'
          ? _direction === 'asc'
            ? 'nullsFirst'
            : 'nullsLast'
          : props.defaultOrderBy[i]?.nulls
      return field === _field && direction === _direction && nulls === _nulls
    }),
)
const isDefaultApplied = computed(
  () =>
    isEmpty(appliedData.value.where) &&
    Object.keys(appliedData.value.columns).length === Object.keys(props.defaultColumns).length &&
    Object.entries(appliedData.value.columns).every(
      ([key, { width }]) => props.defaultColumns[key] && props.defaultColumns[key].width === width,
    ) &&
    appliedData.value.orderBy.every(({ field, direction, nulls }, i) => {
      direction ??= 'asc'
      nulls = (nulls ?? 'nullsAuto') === 'nullsAuto' ? (direction === 'asc' ? 'nullsFirst' : 'nullsLast') : nulls
      const _field = props.defaultOrderBy[i]?.field
      const _direction = props.defaultOrderBy[i]?.direction ?? 'asc'
      const _nulls =
        (props.defaultOrderBy[i]?.nulls ?? 'nullsAuto') === 'nullsAuto'
          ? _direction === 'asc'
            ? 'nullsFirst'
            : 'nullsLast'
          : props.defaultOrderBy[i]?.nulls
      return field === _field && direction === _direction && nulls === _nulls
    }),
)

watch(
  () => route.query,
  () => {
    setTimeout(() => {
      history.clear().push(prepareHistory(data.value))
      filtersInitialized.value = false
      activeTab.value = 'columns'
    })
  },
)

watch(
  () => props.params,
  async () => {
    data.value.where = castWhereCondition(props.params.where ?? [])
    data.value.orderBy = props.params.orderBy ?? []
    await nextTick(whereFiltersComponent.value?.refresh)
    if (!initialized.value) {
      appliedData.value = deepClone(data.value)
    }
    initialized.value = true
  },
  { immediate: true },
)

watch(
  () => props.columns,
  () => {
    data.value.columns = remap(deepClone(props.columns), (name, column) => [name, omit(column, ['label', 'TType'])])
  },
  { immediate: true },
)

onMounted(() => {
  setTimeout(() => {
    history.push(prepareHistory(data.value))
    isListening.value = true
    listen('save', (e) => {
      e.preventDefault()
      blurActiveElement()
      setTimeout(apply)
    })
  })
})

function onTabChange(tab: Tab) {
  activeTab.value = tab
  rewriteHistory.value = true
  setTimeout(() => setTimeout(() => (rewriteHistory.value = false)))

  if (popup.value?.content instanceof HTMLElement) {
    popup.value.content.scrollTo({ top: 0, behavior: 'instant' })
  } else {
    popup.value?.content?.$el.scrollTo({ top: 0, behavior: 'instant' })
  }
}

function apply() {
  if (isEmpty(data.value.columns)) {
    const options = props.collection.definition.fields.createdAt!
    emit('update:columns', { id: puiColumn({ label: maybeTranslate(options.ui.label), sortable: 'numeric' }) })
  } else {
    emit(
      'update:columns',
      remap(data.value.columns, (name, column) => {
        const columnChoice = columnFieldChoices.value.find(({ value }) => value === name)
        return [name, { ...column, label: columnChoice?.label, TType: undefined }]
      }),
    )
  }

  emit('update:params', {
    ...props.params,
    where: isEmpty(data.value.where) ? undefined : data.value.where,
    orderBy: data.value.orderBy,
  })

  history.clear()
  emit('close', popup.value!.close)
}

function restore() {
  emit('update:columns', props.defaultColumns)
  emit('update:params', {
    ...props.params,
    where: undefined,
    orderBy: props.defaultOrderBy,
    perPage: props.collection.definition.ui.indexPage.table.perPage,
  })
  history.clear()
  emit('close', popup.value!.close)
}

async function close() {
  if (!history.isDirty.value || (await unsavedChanges.prompt?.())) {
    emit('close', popup.value!.close)
  }
}

function castWhereCondition(
  whereCondition: (_WhereField | WhereOrGroupSimplified)[],
): (_WhereField | WhereOrGroupSimplified)[] {
  const casted: (_WhereField | WhereOrGroupSimplified)[] = deepClone(whereCondition)

  for (const [i, condition] of casted.entries()) {
    if ('field' in condition) {
      const dataType = props.collection.definition.fields[condition.field]?._dataType
      condition.value = (
        dataType === 'bigint' || dataType === 'numeric'
          ? castToNumber(condition.value)
          : dataType === 'boolean'
            ? castToBoolean(condition.value)
            : condition.value
      ) as any
    } else if ('or' in condition) {
      const orGroups: (_WhereField | WhereOrGroupSimplified)[][] = []

      for (const orGroup of condition.or) {
        orGroups.push(castWhereCondition(orGroup))
      }

      casted[i] = { or: orGroups }
    }
  }

  return casted
}

function prepareHistory(data: TableSettings) {
  return {
    where: data.where,
    columns: remap(data.columns, (columnName, column) => [columnName, omit(column, ['label', 'TType'] as any)]),
    orderBy: data.orderBy.map(({ field, direction, nulls }) => {
      direction ??= 'asc'
      nulls = (nulls ?? 'nullsAuto') === 'nullsAuto' ? (direction === 'asc' ? 'nullsFirst' : 'nullsLast') : nulls
      return { field, direction, nulls }
    }),
    activeTab: data.activeTab,
  }
}
</script>

<style scoped>
.p-title {
  font-weight: 500;
}

.p-tabs::before {
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

.p-tabs :deep(.pui-tabs-list) {
  position: sticky;
  z-index: 3;
  top: 0.75rem;
}

.p-tabs :deep(.pui-tabs-content:not(:first-child)) {
  margin-top: 0.75rem;
}
</style>
