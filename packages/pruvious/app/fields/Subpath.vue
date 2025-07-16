<template>
  <PruviousDashboardPathField
    :disabled="disabled"
    :error="error"
    :modelValue="modelValue"
    :name="name"
    :options="options"
    :path="path"
    :prefix="prefix"
    :synced="synced"
    :translatable="translatable"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts" setup>
import { primaryLanguage, usePruviousDashboard } from '#pruvious/client'
import type { Collections, SerializableFieldOptions, Singletons } from '#pruvious/server'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: [String, null],
    required: true,
  },

  /**
   * The field name defined in a collection, singleton, or block.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'nullableText'>>,
    required: true,
  },

  /**
   * Defines whether this data container is a `collection` (manages multiple items) or a `singleton` (manages a single item).
   */
  dataContainerType: {
    type: String as PropType<'collection' | 'singleton'>,
    required: true,
  },

  /**
   * The name of the data container in PascalCase format.
   */
  dataContainerName: {
    type: String as PropType<keyof Collections | keyof Singletons>,
    required: true,
  },

  /**
   * The current record data from a collection or singleton.
   * Contains key-value pairs representing the record's fields and their values.
   */
  data: {
    type: Object as PropType<Record<string, any>>,
  },

  /**
   * The field path, expressed in dot notation, represents the exact location of the field within the current data structure.
   */
  path: {
    type: String,
    required: true,
  },

  /**
   * Represents an error message that can be displayed to the user.
   */
  error: {
    type: String,
  },

  /**
   * Controls whether the field is disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
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
  'commit': [value: string | null]
  'update:modelValue': [value: string | null]
}>()

const dashboard = usePruviousDashboard()
const { prefixPrimaryLanguage } = useRuntimeConfig().public.pruvious
const prefix =
  props.dataContainerType === 'collection' &&
  dashboard.value?.collections[props.dataContainerName]?.translatable &&
  props.data?.language &&
  (props.data?.language !== primaryLanguage || prefixPrimaryLanguage)
    ? `/${props.data.language}/.../`
    : '/.../'
</script>
