<template>
  <div>
    <PruviousDashboardEditableFieldCell :cell="cell" :editable="editable" :name="name">
      <span
        :title="choice?.label ? `${choice.label} (${choice.value})` : String(choice?.value ?? '')"
        class="pui-truncate"
      >
        {{ choice?.label || choice?.value || '-' }}
      </span>
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
import { __, selectFrom, usePruviousDashboard } from '#pruvious/client'
import type { Collections, SerializableCollection, SerializableFieldOptions } from '#pruvious/server'
import type { PUIDynamicSelectChoiceModel } from '@pruvious/ui/components/PUIDynamicSelect.vue'
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
    type: [Number, null],
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
    type: Object as PropType<SerializableFieldOptions<'record'>>,
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
const choice = computedAsync(selectedChoiceResolver)
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

async function selectedChoiceResolver(): Promise<PUIDynamicSelectChoiceModel | null> {
  if (props.modelValue) {
    const displayFields = toArray(props.options.ui.displayFields!)
    const select = displayFields.flatMap((x) =>
      isArray(x) ? x.filter((y) => relatedCollection.definition.fields[y]) : x,
    )
    const query = await selectFrom(relatedCollection.name)
      .select(['id', ...select] as any)
      .where('id', '=', +props.modelValue)
      .first()

    if (query.success) {
      return query.data
        ? {
            value: query.data.id,
            label: toArray(displayFields[0])!
              .flatMap((x) => (isArray(x) ? x.map((y: any) => query.data![y] ?? y) : (query.data![x] ?? x)))
              .join('')
              .trim(),
            detail: isDefined(displayFields[1])
              ? toArray(displayFields[1])!
                  .flatMap((x) => (isArray(x) ? x.map((y: any) => query.data![y] ?? y) : (query.data![x] ?? x)))
                  .join('')
                  .trim()
              : undefined,
          }
        : {
            value: props.modelValue,
            label: __('pruvious-dashboard', 'Deleted record') + ` (#${props.modelValue})`,
            detail: isDefined(displayFields[1]) ? '' : undefined,
          }
    }
  }

  return null
}
</script>
