<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel
      :id="`${id}--1`"
      :name="name"
      :options="options"
      :synced="synced"
      :translatable="translatable"
    />

    <div>@todo</div>

    <PruviousFieldMessage :error="resolvedError" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import type { SerializableFieldOptions } from '#pruvious/server'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Array as PropType<Record<string, any>[]>,
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
    type: Object as PropType<SerializableFieldOptions<'repeater'>>,
    required: true,
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
    type: [String, Object] as PropType<string | Record<string, string>>,
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
  'commit': [value: Record<string, any>[]]
  'update:modelValue': [value: Record<string, any>[]]
}>()

const id = useId()
const resolvedError = computed(() => '@todo')
</script>
