<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="[
      { value: 'contains', label: __('pruvious-dashboard', 'Contains') },
      { value: 'notContains', label: __('pruvious-dashboard', 'Does not contain') },
    ]"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <PUISelect
      v-if="choices"
      :choices="choices"
      :id="id"
      :modelValue="data[0] || ''"
      :name="id"
      :placeholder="placeholder"
      @commit="
        (value) => {
          const preparedValue = prepareEmitValue([String(value)])
          $emit('update:modelValue', { ...modelValue, value: preparedValue })
          $emit('commit', { ...modelValue, value: preparedValue })
        }
      "
      @update:modelValue="
        (value) => {
          const preparedValue = prepareEmitValue([String(value)])
          $emit('update:modelValue', { ...modelValue, value: preparedValue })
          $emit('commit', { ...modelValue, value: preparedValue })
        }
      "
    />

    <PUIInput
      v-else
      :id="id"
      :modelValue="data[0] || ''"
      :name="id"
      :placeholder="placeholder"
      @blur="
        (_, value) => {
          const preparedValue = prepareEmitValue([value])
          $emit('update:modelValue', { ...modelValue, value: preparedValue })
          $emit('commit', { ...modelValue, value: preparedValue })
        }
      "
      @update:modelValue="
        (value) => {
          const preparedValue = prepareEmitValue([value])
          $emit('update:modelValue', { ...modelValue, value: preparedValue })
          $emit('commit', { ...modelValue, value: preparedValue })
        }
      "
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { maybeTranslate, type WhereField } from '#pruvious/dashboard'
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
const choices: PUIChipsChoiceModel[] | false = props.options.choices
  ? props.options.choices.map((choice) => ({
      label: choice.label ? maybeTranslate(choice.label) : choice.value,
      value: choice.value,
    }))
  : false

emit('commit', {
  ...props.modelValue,
  operator: ['contains', 'notContains'].includes(props.modelValue.operator) ? props.modelValue.operator : 'contains',
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
  return JSON.stringify(value).slice(1, -1)
}
</script>
