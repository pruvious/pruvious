<template>
  <component
    :collectionName="collectionName"
    :fields="fields"
    :is="component"
    :modelValue="modelValue"
    :name="name"
    :options="options"
    :synced="synced"
    :translatable="translatable"
    :type="type"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts" setup>
import { customComponents, filterFieldComponents, type WhereField } from '#pruvious/client'
import type { Collections, Fields, GenericFieldUIOptions, GenericSerializableFieldOptions } from '#pruvious/server'
import { isDefined } from '@pruvious/utils'

const props = defineProps({
  /**
   * The current where condition.
   */
  modelValue: {
    type: Object as PropType<WhereField>,
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
   * The name of the current collection in PascalCase format.
   */
  collectionName: {
    type: String as PropType<keyof Collections>,
    required: true,
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
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const component = computed(() => {
  const path = `collections/${props.collectionName}/${props.name}`

  if (filterFieldComponents[path]) {
    return filterFieldComponents[path]()
  }

  const customComponent = ((props.options as any).ui as GenericFieldUIOptions | undefined)?.customFilterComponent

  if (customComponent) {
    if (isDefined(customComponents[customComponent])) {
      return customComponents[customComponent]()
    } else {
      console.warn(
        `Unable to resolve custom component \`${customComponent}\` for field \`${props.name}\` in \`${props.collectionName}\` collection. Available custom components:`,
        toRaw(customComponents),
      )
    }
  }

  return filterFieldComponents[props.type]?.() ?? resolveComponent('PruviousFilterFieldFallback')
})
</script>
