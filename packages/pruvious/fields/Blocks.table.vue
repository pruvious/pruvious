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
              dashboard!.blocks[item.$key]!.ui.itemLabelConfiguration?.showBlockLabel !== false ||
              dashboard!.blocks[item.$key]!.ui.itemLabelConfiguration?.fieldValue
            "
            class="pui-muted pui-truncate"
          >
            {{
              dashboard!.blocks[item.$key]!.ui.itemLabelConfiguration?.showBlockLabel !== false
                ? blockLabels[item.$key]
                : ''
            }}
            {{
              dashboard!.blocks[item.$key]!.ui.itemLabelConfiguration?.fieldValue &&
              item[dashboard!.blocks[item.$key]!.ui.itemLabelConfiguration!.fieldValue as string] !== ''
                ? dashboard!.blocks[item.$key]!.ui.itemLabelConfiguration?.showBlockLabel !== false
                  ? `(${item[dashboard!.blocks[item.$key]!.ui.itemLabelConfiguration!.fieldValue as string]})`
                  : item[dashboard!.blocks[item.$key]!.ui.itemLabelConfiguration!.fieldValue as string]
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
import { __, maybeTranslate, usePruviousDashboard } from '#pruvious/client'
import type { Collections, SerializableCollection, SerializableFieldOptions } from '#pruvious/server'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
import { castToNumber, isDefined, isString, sortNaturallyByProp, titleCase } from '@pruvious/utils'

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
    type: Object as PropType<SerializableFieldOptions<'blocks'>>,
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
const blockLabels = computed(() =>
  Object.fromEntries(
    sortNaturallyByProp(
      Object.entries(dashboard.value!.blocks).map(([blockName, block]) => ({
        blockName,
        label: isDefined(block.ui.label)
          ? maybeTranslate(block.ui.label)
          : __('pruvious-dashboard', titleCase(blockName, false) as any),
      })),
      'label',
    ).map(({ blockName, label }) => [blockName, label]),
  ),
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
