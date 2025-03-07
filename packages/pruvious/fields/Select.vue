<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <PUISelect
      :choices="choices"
      :disabled="disabled"
      :error="!!error"
      :id="id"
      :modelValue="modelValue"
      :name="name"
      :placeholder="placeholder"
      @commit="$emit('commit', String($event))"
      @update:modelValue="$emit('update:modelValue', String($event))"
    />

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { maybeTranslate } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUISelectChoiceGroupModel, PUISelectChoiceModel } from '@pruvious/ui/components/PUISelect.vue'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: String,
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
    type: Object as PropType<SerializableFieldOptions<'select'>>,
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
  'commit': [value: string]
  'update:modelValue': [value: string]
}>()

const id = useId()
const placeholder = maybeTranslate(props.options.ui.placeholder)
const choices: (PUISelectChoiceModel | PUISelectChoiceGroupModel)[] = props.options.choices.map((choice) =>
  'value' in choice
    ? { label: choice.label ? maybeTranslate(choice.label) : choice.value, value: choice.value }
    : {
        group: choice.group,
        choices: choice.choices.map((subChoice) => ({
          label: subChoice.label ? maybeTranslate(subChoice.label) : subChoice.value,
          value: subChoice.value,
        })),
      },
)
</script>
