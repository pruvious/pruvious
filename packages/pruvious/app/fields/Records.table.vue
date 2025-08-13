<template>
  <div>
    <PruviousDashboardEditableFieldCell :cell="cell" :editable="editable" :name="name" editButtonPosition="auto">
      <template v-if="choices?.length">
        <PUIBadge
          v-for="{ label, value } of choices"
          :title="label ? `${label} (${value})` : String(value)"
          @dblclick.stop="open(+value!)"
          color="secondary"
        >
          {{ label || value }}
        </PUIBadge>
      </template>
      <span v-else>-</span>
    </PruviousDashboardEditableFieldCell>

    <PruviousDashboardEditTableFieldPopup
      v-if="isEditPopupVisible"
      :cell="cell"
      :collection="collection"
      :disabled="!editable"
      :modelValue="modelValue"
      :name="name"
      :onInit="
        () => {
          provide('openLinksInNewTab', true)
          provide('hideViewConfiguration', true)
          provide('hideEditableFieldCellActions', true)
        }
      "
      :options="options"
      @close="$event().then(() => (isEditPopupVisible = false))"
      @updated="refresh?.(true)"
    />
  </div>
</template>

<script lang="ts" setup>
import { __, dashboardBasePath, selectFrom, usePruviousDashboard } from '#pruvious/client'
import type { Collections, SerializableCollection, SerializableFieldOptions } from '#pruvious/server'
import type { PUIDynamicChipsChoiceModel } from '@pruvious/ui/components/PUIDynamicChips.vue'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
import { castToNumber, isArray, isDefined, isString, slugify, toArray } from '@pruvious/utils'
import { computedAsync } from '@vueuse/core'

const props = defineProps({
  /**
   * The table cell props containing the row data, column definition, and other cell-related information.
   */
  cell: {
    type: Object as PropType<PUICell<PUIColumns>>,
    required: true,
  },

  /**
   * The casted field value.
   */
  modelValue: {
    type: Array as PropType<number[]>,
  },

  /**
   * The field name defined in a collection.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'records'>>,
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
   * Triggers a data refresh operation by executing the callback function with the current URL query parameters.
   *
   * The operation is skipped if the URL query parameters have not changed since the last refresh.
   * The `force` parameter can be used to force a refresh operation even if the URL query parameters have not changed.
   * By default, the operation is not forced.
   *
   * Returns a `Promise` that resolves when the refresh operation is complete.
   */
  refresh: {
    type: Function as PropType<(force?: boolean) => Promise<void>>,
  },

  /**
   * Specifies whether the field is editable.
   *
   * @default false
   */
  editable: {
    type: Boolean,
    default: false,
  },
})

const route = useRoute()
const dashboard = usePruviousDashboard()
const relatedCollection = {
  name: props.options.collection,
  slug: slugify(props.options.collection),
  definition: dashboard.value!.collections[props.options.collection]!,
}
const choices = computedAsync(selectedChoicesResolver)
const isEditPopupVisible = ref(false)

watch(
  () => route.query,
  () => {
    if (isString(route.query.edit)) {
      const [fieldName, id] = route.query.edit.split(':')
      if (fieldName === props.name && castToNumber(id) === props.cell.row.id) {
        isEditPopupVisible.value = true
      }
    }
  },
  { immediate: true },
)

async function selectedChoicesResolver(): Promise<PUIDynamicChipsChoiceModel[]> {
  const ids = props.modelValue ? [...props.modelValue] : []

  if (props.modelValue?.length) {
    const displayFields = toArray(props.options.ui.displayFields!)
    const select = displayFields.flatMap((x) =>
      isArray(x) ? x.filter((y) => relatedCollection.definition.fields[y]) : x,
    )
    const query = await selectFrom(relatedCollection.name)
      .select(['id', ...select] as any)
      .where('id', 'in', ids)
      .all()

    if (query.success && query.data) {
      const choices = query.data.map((record) => ({
        value: record.id,
        label: toArray(displayFields[0])!
          .flatMap((x) => (isArray(x) ? x.map((y: any) => record[y] ?? y) : (record[x] ?? x)))
          .join('')
          .trim(),
        detail: isDefined(displayFields[1])
          ? toArray(displayFields[1])!
              .flatMap((x) => (isArray(x) ? x.map((y: any) => record[y] ?? y) : (record[x] ?? x)))
              .join('')
              .trim()
          : undefined,
      }))

      return ids.map(
        (id) =>
          choices.find((choice) => choice.value === id) ?? {
            value: id,
            label: __('pruvious-dashboard', 'Deleted record') + ` (#${id})`,
            detail: isDefined(displayFields[1]) ? '' : undefined,
          },
      ) as PUIDynamicChipsChoiceModel[]
    }
  }

  return []
}

function open(id: number) {
  window.open(`${dashboardBasePath}collections/${relatedCollection.slug}/${id}`, '_blank')
}
</script>

<style scoped>
.pui-badge {
  align-items: center;
  height: 1.5rem;
  cursor: default;
  font-size: 0.75rem;
}
</style>
