<template>
  <component
    :is="component"
    :modelValue="modelValue"
    :name="name"
    :options="{ ...options, choices, ui: { ...options.ui, nullChoiceLabel: '-' } }"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts" setup>
import { filterFieldComponents, languages, type WhereField } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'

defineProps({
  /**
   * The current where condition.
   */
  modelValue: {
    type: Object as PropType<WhereField>,
    required: true,
  },

  /**
   * The field name defined in a collection.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'nullableText'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const component = filterFieldComponents.nullableSelect?.()
const choices = languages.map(({ code, name }) => ({ label: name, value: code }))
</script>
