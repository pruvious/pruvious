<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="operatorChoices"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <PUISelect
      v-if="isDefined(modelValue.value)"
      :choices="choices"
      :id="id"
      :modelValue="isNull(modelValue.value) ? null : String(modelValue.value)"
      :name="id"
      @commit="$emit('commit', { ...modelValue, value: isNull($event) ? null : String($event) })"
      @update:modelValue="$emit('update:modelValue', { ...modelValue, value: isNull($event) ? null : String($event) })"
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { getValidFilterOperators, maybeTranslate, type WhereField } from '#pruvious/dashboard'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUISelectChoiceGroupModel, PUISelectChoiceModel } from '@pruvious/ui/components/PUISelect.vue'
import { isDefined, isNull, isString } from '@pruvious/utils'

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
    type: Object as PropType<SerializableFieldOptions<'nullableColor'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const operatorChoices = getValidFilterOperators(props.options).filter(({ value }) => ['eq', 'ne'].includes(value))

const choices: (PUISelectChoiceModel | PUISelectChoiceGroupModel)[] = [
  { label: __('pruvious-dashboard', 'None'), value: null, muted: true },
  ...props.options.colors.map((entry) => {
    if (isString(entry)) {
      return { label: entry, value: entry }
    }
    if ('colors' in entry) {
      return {
        group: maybeTranslate(entry.group) ?? '',
        choices: entry.colors.map((c) =>
          isString(c)
            ? { label: c, value: c }
            : { label: c.label ? maybeTranslate(c.label) || c.value : c.value, value: c.value },
        ),
      }
    }
    return { label: entry.label ? maybeTranslate(entry.label) || entry.value : entry.value, value: entry.value }
  }),
]
</script>
