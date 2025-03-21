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

    <PUITabs
      :active="activeTab"
      :list="[
        { name: 'general', label: __('pruvious-dashboard', 'General') },
        { name: 'columns', label: __('pruvious-dashboard', 'Columns') },
        { name: 'filters', label: __('pruvious-dashboard', 'Filters') },
        { name: 'sorting', label: __('pruvious-dashboard', 'Sorting') },
      ]"
      @change="onTabChange"
      class="p-tabs"
    >
      <PUITab name="general">
        <PruviousDashboardGeneralTableSettings
          v-model="data"
          :collection="collection"
          :columnChoices="columnChoices"
          @commit="
            (newData) => {
              data = newData
              if (history.size) {
                nextTick(() => history.push(data))
              }
            }
          "
        />
      </PUITab>

      <PUITab name="columns">
        <PruviousDashboardTableColumnsConfigurator
          v-model="data.columns"
          :collection="collection"
          :columnChoices="columnChoices"
          @commit="
            (columns) => {
              data = { ...data, columns, activeTab }
              if (history.size) {
                nextTick(() => history.push(data))
              }
            }
          "
        />
      </PUITab>

      <PUITab name="filters">
        <PruviousDashboardWhereFilters
          v-model="data.where"
          :collection="collection"
          :fieldChoices="fieldChoices"
          @commit="
            (where) => {
              data = { ...data, where, activeTab }
              if (history.size) {
                nextTick(() => history.push(data))
              }
            }
          "
          ref="whereFiltersComponent"
        />
      </PUITab>

      <PUITab name="sorting">
        <PruviousDashboardOrderBy
          v-model="data.orderBy"
          :collection="collection"
          :columnChoices="columnChoices"
          @commit="
            (orderBy) => {
              data = { ...data, orderBy, activeTab }
              if (history.size) {
                nextTick(() => history.push(data))
              }
            }
          "
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
          <PUIButton :variant="history.isDirty.value ? 'primary' : 'outline'" @click="apply()">
            {{ __('pruvious-dashboard', 'Apply') }}
          </PUIButton>
        </div>
      </div>
    </template>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { __, History, maybeTranslate, resolveFieldLabel, unsavedChanges } from '#pruvious/client'
import type { Collections, SerializableCollection } from '#pruvious/server'
import type { WhereField as _WhereField, Paginated, SelectQueryBuilderParams } from '@pruvious/orm'
import {
  blurActiveElement,
  castToBoolean,
  castToNumber,
  deepClone,
  isDefined,
  isEmpty,
  isObject,
  isUndefined,
  remap,
  sortNaturallyByProp,
  titleCase,
} from '@pruvious/utils'

export interface WhereOrGroupSimplified {
  or: (_WhereField | WhereOrGroupSimplified)[][]
}

export interface TableSettings {
  where: (_WhereField | WhereOrGroupSimplified)[]
  columns: PUIColumns
  orderBy: {
    field: string
    direction?: 'asc' | 'desc'
    nulls?: 'nullsAuto' | 'nullsFirst' | 'nullsLast'
  }[]
  perPage: number
  activeTab: Tab
}

type Tab = 'general' | 'columns' | 'filters' | 'sorting'

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
})

const emit = defineEmits<{
  'update:params': [params: SelectQueryBuilderParams]
  'update:columns': [columns: PUIColumns]
  'close': [close: () => Promise<void>]
  'keydown': [event: KeyboardEvent]
}>()

const route = useRoute()
const popup = useTemplateRef('popup')
const activeTab = ref<Tab>('general')
const data = ref<TableSettings>({ where: [], columns: {}, orderBy: [], perPage: 0, activeTab: activeTab.value })
const fieldChoices = computed(() =>
  sortNaturallyByProp(
    Object.entries(props.collection.definition.fields).map(([fieldName, definition]) => ({
      value: fieldName,
      label: resolveFieldLabel(definition.ui?.label, fieldName),
    })),
    'label',
  ),
)
const columnChoices = computed(() =>
  sortNaturallyByProp(
    [
      ...Object.entries(props.collection.definition.fields).map(([columnName, definition]) => ({
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
const history = new History({ omit: ['activeTab'] })
const whereFiltersComponent = useTemplateRef('whereFiltersComponent')
const { listen, isListening } = usePUIHotkeys({
  allowInOverlays: true,
  target: () => (popup.value?.root instanceof HTMLDivElement ? popup.value.root : popup.value?.$el),
  listen: false,
})

watch(
  () => route.query,
  () => {
    setTimeout(() => history.clear().push(data.value))
  },
  { immediate: true },
)

watch(
  () => props.params,
  () => {
    data.value.where = castWhereCondition(props.params.where ?? [])
    data.value.orderBy = props.params.orderBy ?? []
    data.value.perPage = props.params.limit ?? 0
    nextTick(whereFiltersComponent.value?.refresh)
  },
  { immediate: true },
)

watch(
  () => props.columns,
  () => {
    data.value.columns = deepClone(props.columns)
  },
  { immediate: true },
)

onMounted(() => {
  setTimeout(() => {
    history.push(data.value)
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
    const remapped = remap(data.value.columns, (key, value) => [
      String(key),
      { ...value, minWidth: isUndefined(value.width) && value.minWidth === '16rem' ? undefined : value.minWidth },
    ])
    emit('update:columns', remapped)
  }

  emit('update:params', {
    ...props.params,
    where: isEmpty(data.value.where) ? undefined : data.value.where,
    orderBy: data.value.orderBy,
    limit: data.value.perPage,
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
      const dataType = props.collection.definition.fields[condition.field]?.__dataType
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
