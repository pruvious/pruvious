<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <PUITextArea
      :id="id"
      :modelValue="String(modelValue.value)"
      :name="id"
      :placeholder="__('pruvious-dashboard', 'Empty')"
      @blur="(_, value) => $emit('commit', { ...modelValue, value })"
      @update:modelValue="$emit('update:modelValue', { ...modelValue, value: $event })"
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import type { WhereField } from '#pruvious/dashboard'
import type { SerializableFieldOptions } from '#pruvious/server'

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
    type: Object as PropType<SerializableFieldOptions<'editor'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
</script>
