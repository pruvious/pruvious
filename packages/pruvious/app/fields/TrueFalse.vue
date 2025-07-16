<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <PUIButtonGroup
      :choices="[
        { value: false, label: noLabel },
        { value: true, label: yesLabel },
      ]"
      :disabled="disabled"
      :error="!!error"
      :id="id"
      :modelValue="modelValue"
      :name="name"
      :variant="options.ui.variant"
      @update:modelValue="
        (value) => {
          $emit('update:modelValue', Boolean(value))
          $emit('commit', Boolean(value))
        }
      "
    />

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, maybeTranslate } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import { isDefined } from '@pruvious/utils'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Boolean,
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
    type: Object as PropType<SerializableFieldOptions<'trueFalse'>>,
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
  'commit': [value: boolean]
  'update:modelValue': [value: boolean]
}>()

const id = useId()
const noLabel = isDefined(props.options.ui.noLabel)
  ? maybeTranslate(props.options.ui.noLabel)
  : __('pruvious-dashboard', 'No')
const yesLabel = isDefined(props.options.ui.yesLabel)
  ? maybeTranslate(props.options.ui.yesLabel)
  : __('pruvious-dashboard', 'Yes')
</script>
