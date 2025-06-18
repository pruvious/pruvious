<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <PUIButtonGroup
      :choices="[
        { value: false, label: noLabel },
        { value: true, label: yesLabel },
      ]"
      :id="id"
      :modelValue="Boolean(modelValue.value)"
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
import { __, maybeTranslate, type WhereField } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import { isDefined } from '@pruvious/utils'

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
    type: Object as PropType<SerializableFieldOptions<'trueFalse'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const noLabel = isDefined(props.options.ui.noLabel)
  ? maybeTranslate(props.options.ui.noLabel)
  : __('pruvious-dashboard', 'No')
const yesLabel = isDefined(props.options.ui.yesLabel)
  ? maybeTranslate(props.options.ui.yesLabel)
  : __('pruvious-dashboard', 'Yes')
</script>
