<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <PUINumber
      :ariaDragLabel="__('pruvious-dashboard', 'Drag to adjust value')"
      :autoWidth="options.ui.autoWidth"
      :decimalPlaces="options.decimalPlaces"
      :disabled="disabled"
      :dragDirection="options.ui.dragDirection"
      :error="!!error"
      :id="id"
      :max="options.max"
      :min="options.min"
      :modelValue="modelValue"
      :name="path"
      :padZeros="options.ui.padZeros"
      :placeholder="placeholder"
      :showDragButton="options.ui.showDragButton"
      :showSteppers="options.ui.showSteppers"
      :suffix="options.ui.suffix"
      @commit="$emit('commit', $event)"
      @update:modelValue="$emit('update:modelValue', $event)"
      :class="{ 'p-number-autowidth': options.ui.autoWidth }"
    />

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, maybeTranslate } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Number,
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
    type: Object as PropType<SerializableFieldOptions<'number'>>,
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
  'commit': [value: number]
  'update:modelValue': [value: number]
}>()

const id = useId()
const placeholder = maybeTranslate(props.options.ui.placeholder)
</script>

<style scoped>
.p-number-autowidth {
  display: inline-flex;
  width: auto;
}
</style>
