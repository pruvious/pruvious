<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <PUIButtonGroup
      :choices="choices"
      :id="id"
      :modelValue="String(modelValue.value)"
      :name="id"
      @update:modelValue="
        (value) => {
          $emit('update:modelValue', { ...modelValue, value: value as any })
          $emit('commit', { ...modelValue, value: value as any })
        }
      "
      variant="accent"
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { maybeTranslate, type WhereField } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUIButtonGroupChoiceModel } from '@pruvious/ui/components/PUIButtonGroup.vue'

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
    type: Object as PropType<SerializableFieldOptions<'buttonGroup'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const choices: PUIButtonGroupChoiceModel[] = props.options.choices.map((choice) => ({
  label: choice.label ? maybeTranslate(choice.label) : choice.value,
  value: choice.value,
}))
</script>
