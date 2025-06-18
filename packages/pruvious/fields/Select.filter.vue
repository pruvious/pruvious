<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="operatorChoices"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <PUISelect
      v-if="modelValue.value !== undefined"
      :choices="choices"
      :id="id"
      :modelValue="String(modelValue.value)"
      :name="id"
      :placeholder="placeholder"
      @commit="$emit('commit', { ...modelValue, value: String($event) })"
      @update:modelValue="$emit('update:modelValue', { ...modelValue, value: String($event) })"
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { getValidFilterOperators, maybeTranslate, type WhereField } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUISelectChoiceGroupModel, PUISelectChoiceModel } from '@pruvious/ui/components/PUISelect.vue'

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
    type: Object as PropType<SerializableFieldOptions<'select'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const operatorChoices = getValidFilterOperators(props.options).filter(({ value }) => ['eq', 'ne'].includes(value))
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
