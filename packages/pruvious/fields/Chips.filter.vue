<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="[
      { value: 'eq', label: __('pruvious-dashboard', 'Equals') },
      { value: 'ne', label: __('pruvious-dashboard', 'Does not equal') },
      { value: 'startsWith', label: __('pruvious-dashboard', 'Starts with') },
      { value: 'endsWith', label: __('pruvious-dashboard', 'Ends with') },
      { value: 'contains', label: __('pruvious-dashboard', 'Contains') },
      { value: 'notContains', label: __('pruvious-dashboard', 'Does not contain') },
    ]"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <PUIChips
      :choices="choices"
      :enforceUniqueItems="options.enforceUniqueItems"
      :id="id"
      :maxItems="options.maxItems"
      :minItems="options.minItems"
      :modelValue="data"
      :name="id"
      :noResultsLabel="__('pruvious-dashboard', 'No results found')"
      :placeholder="placeholder"
      :removeItemLabel="__('pruvious-dashboard', 'Remove')"
      :trim="options.trim"
      :variant="options.ui.variant"
      @update:modelValue="
        (value) => {
          const preparedValue = prepareEmitValue(value)
          $emit('update:modelValue', { ...modelValue, value: preparedValue })
          $emit('commit', { ...modelValue, value: preparedValue })
        }
      "
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __, maybeTranslate, type WhereField } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUIChipsChoiceModel } from '@pruvious/ui/components/PUIChips.vue'
import { isArray, isString } from '@pruvious/utils'

const props = defineProps({
  /**
   * The current where condition.
   */
  modelValue: {
    type: Object as PropType<WhereField>,
    required: true,
  },

  /**
   * The combined field options defined in a collection.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'chips'>>,
    required: true,
  },
})

const emit = defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const data = computed<string[]>(() => {
  let v = props.modelValue.value
  if (isString(v)) {
    try {
      if (!v.startsWith('[')) v = `[${v}`
      if (!v.endsWith(']')) v = `${v}]`
      v = JSON.parse(v)
    } catch {
      v = []
    }
  }
  return isArray(v) && v.every(isString) ? (v as string[]) : []
})
const placeholder = maybeTranslate(props.options.ui.placeholder)
const choices: PUIChipsChoiceModel[] = props.options.choices
  ? props.options.choices.map((choice) => ({
      label: choice.label ? maybeTranslate(choice.label) : choice.value,
      value: choice.value,
    }))
  : []

emit('commit', {
  ...props.modelValue,
  operator: ['eq', 'ne', 'startsWith', 'endsWith', 'contains', 'notContains'].includes(props.modelValue.operator)
    ? props.modelValue.operator
    : 'eq',
  value: prepareEmitValue(data.value),
})

watch(
  () => props.modelValue.operator,
  () => {
    emit('commit', { ...props.modelValue, value: prepareEmitValue(data.value) })
  },
  { immediate: true },
)

function prepareEmitValue(value: string[]): string {
  let str = JSON.stringify(value)

  if (['startsWith', 'contains', 'notContains'].includes(props.modelValue.operator)) {
    str = str.slice(0, -1)
  }

  if (['endsWith', 'contains', 'notContains'].includes(props.modelValue.operator)) {
    str = str.slice(1)
  }

  return str
}
</script>
