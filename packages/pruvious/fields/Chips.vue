<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <PUIChips
      :choices="choices"
      :disabled="disabled"
      :enforceUniqueItems="options.enforceUniqueItems"
      :error="!!error"
      :erroredItems="erroredItems"
      :id="id"
      :maxItems="options.maxItems"
      :minItems="options.minItems"
      :modelValue="modelValue"
      :name="name"
      :noResultsLabel="__('pruvious-dashboard', 'No results found')"
      :placeholder="placeholder"
      :removeItemLabel="__('pruvious-dashboard', 'Remove')"
      :trim="options.trim"
      :variant="options.ui.variant"
      @update:modelValue="
        (value) => {
          $emit('update:modelValue', value)
          $emit('commit', value)
        }
      "
    />

    <PruviousFieldMessage :error="fieldError" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, maybeTranslate } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUIChipsChoiceModel } from '@pruvious/ui/components/PUIChips.vue'
import { castToNumber, isInteger, isObject, isString } from '@pruvious/utils'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Array as PropType<string[]>,
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
    type: Object as PropType<SerializableFieldOptions<'chips'>>,
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
    type: [Object, String] as PropType<string | Record<string, string>>,
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
  'commit': [value: string[]]
  'update:modelValue': [value: string[]]
}>()

const id = useId()
const placeholder = maybeTranslate(props.options.ui.placeholder)
const choices: PUIChipsChoiceModel[] | false = props.options.choices
  ? props.options.choices.map((choice) => ({
      label: choice.label ? maybeTranslate(choice.label) : choice.value,
      value: choice.value,
    }))
  : false
const fieldError = computed(() => (isString(props.error) ? props.error : props.error?.[props.path]))
const erroredItems = computed<number[]>(() =>
  isObject(props.error) ? Object.keys(props.error).map(castToNumber).filter(isInteger) : [],
)
</script>
