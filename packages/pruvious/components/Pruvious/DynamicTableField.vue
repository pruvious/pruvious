<template>
  <component
    :cell="cell"
    :collection="collection"
    :data="data"
    :fields="fields"
    :is="component"
    :modelValue="modelValue"
    :name="name"
    :options="options"
    :permissionsResolver="permissionsResolver"
    :synced="synced"
    :translatable="translatable"
    :type="type"
  />
</template>

<script lang="ts" setup>
import { customComponents, tableFieldComponents, type CollectionRecordPermissionsResolver } from '#pruvious/client'
import type {
  Collections,
  Fields,
  GenericFieldUIOptions,
  GenericSerializableFieldOptions,
  SerializableCollection,
} from '#pruvious/server'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
import { isDefined } from '@pruvious/utils'

const props = defineProps({
  /**
   * The table cell props containing the row data, column definition, and other cell-related information.
   */
  cell: {
    type: Object as PropType<PUICell<PUIColumns>>,
    required: true,
  },

  /**
   * The field value.
   */
  modelValue: {
    type: null as unknown as PropType<any>,
    required: true,
  },

  /**
   * The field name defined in a collection.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The field type (e.g. `text`, `image`, `repeater`, etc.).
   */
  type: {
    type: String as PropType<keyof Fields>,
    required: true,
  },

  /**
   * The combined field options defined in a collection.
   */
  options: {
    type: Object as PropType<GenericSerializableFieldOptions>,
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
   * The current record data from a collection.
   * Contains key-value pairs representing the record's fields and their values.
   */
  data: {
    type: Object as PropType<Record<string, any>>,
  },

  /**
   * A key-value pair of field names and their combined options defined in a collection.
   */
  fields: {
    type: Object as PropType<Record<string, GenericSerializableFieldOptions>>,
  },

  /**
   * Specifies whether the current data record is translatable.
   *
   * @default false
   */
  translatable: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates if the field value remains synchronized between all translations of the current data record.
   *
   * @default false
   */
  synced: {
    type: Boolean,
    default: false,
  },

  /**
   * A function that accepts a record `id` and optional field values, returning a `Promise` resolving to the permission details for that record.
   */
  permissionsResolver: {
    type: Function as PropType<CollectionRecordPermissionsResolver>,
  },
})

const component = computed(() => {
  const path = `collections/${props.collection.name}/${props.name}`

  if (tableFieldComponents[path]) {
    return tableFieldComponents[path]()
  }

  const customComponent = ((props.options as any).ui as GenericFieldUIOptions | undefined)?.customTableComponent

  if (customComponent) {
    if (isDefined(customComponents[customComponent])) {
      return customComponents[customComponent]()
    } else {
      console.warn(
        `Unable to resolve custom component \`${customComponent}\` for field \`${props.name}\` in \`${props.collection.name}\` collection. Available custom components:`,
        toRaw(customComponents),
      )
    }
  }

  return tableFieldComponents[props.type]?.() ?? resolveComponent('PruviousTableFieldFallback')
})
</script>
