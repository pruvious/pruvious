<template>
  <div>
    <PruviousDashboardEditableFieldCell :cell="cell" :editable="editable" :name="name" editButtonPosition="auto" wrap>
      <template v-if="modelValue?.length">
        <PUIBadge
          v-for="(item, index) of modelValue"
          v-pui-tooltip="'```\n' + JSON.stringify(item, null, 2) + '\n```'"
          color="secondary"
          class="p-item"
        >
          <span
            v-if="
              options.ui.itemLabelConfiguration?.[item.$key]?.showItemType !== false ||
              options.ui.itemLabelConfiguration?.[item.$key]?.subfieldValue
            "
            class="pui-truncate"
          >
            {{ options.ui.itemLabelConfiguration?.[item.$key]?.showItemNumber !== false ? `${index + 1}.` : '' }}
            {{
              options.ui.itemLabelConfiguration?.[item.$key]?.showItemType !== false ? itemTypeLabels[item.$key] : ''
            }}
            {{
              options.ui.itemLabelConfiguration?.[item.$key]?.subfieldValue &&
              item[options.ui.itemLabelConfiguration[item.$key]!.subfieldValue as string] !== ''
                ? options.ui.itemLabelConfiguration?.[item.$key]?.showItemType !== false
                  ? `(${item[options.ui.itemLabelConfiguration[item.$key]!.subfieldValue as string]})`
                  : item[options.ui.itemLabelConfiguration[item.$key]!.subfieldValue as string]
                : ''
            }}
          </span>
          <span v-else class="pui-truncate">#{{ index + 1 }}</span>
        </PUIBadge>
      </template>
      <span v-else>-</span>
    </PruviousDashboardEditableFieldCell>

    <PruviousDashboardEditTableFieldPopup
      v-if="isEditPopupVisible"
      :cell="cell"
      :collection="collection"
      :disabled="!editable"
      :fullHeight="fullHeight"
      :modelValue="modelValue"
      :name="name"
      :options="options"
      @close="$event().then(() => (isEditPopupVisible = false))"
      @updated="refresh?.(true)"
    />
  </div>
</template>

<script lang="ts" setup>
import { __, maybeTranslate } from '#pruvious/client'
import type { Collections, SerializableCollection, SerializableFieldOptions } from '#pruvious/server'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
import { castToNumber, isDefined, isString, remap, titleCase } from '@pruvious/utils'

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
    type: Array as PropType<Record<string, any>[]>,
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
    type: Object as PropType<SerializableFieldOptions<'structure'>>,
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
const itemTypeLabels = computed(() =>
  remap(props.options.structure, ($key) => [
    $key,
    isDefined(props.options.ui.itemTypeLabels?.[$key])
      ? maybeTranslate(props.options.ui.itemTypeLabels[$key])
      : __('pruvious-dashboard', titleCase($key, false) as any),
  ]),
)
const isEditPopupVisible = ref(false)
const fullHeight = props.modelValue?.length ? 'auto' : false

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
</script>

<style scoped>
.pui-badge {
  align-items: center;
  height: 1.5rem;
  cursor: default;
  font-size: 0.75rem;
}
</style>
