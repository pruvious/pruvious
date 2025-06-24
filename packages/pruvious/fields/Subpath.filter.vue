<template>
  <PruviousDashboardPathFieldFilter
    :modelValue="modelValue"
    :name="name"
    :options="options"
    :prefix="prefix"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts" setup>
import { primaryLanguage, useDashboardContentLanguage, type WhereField } from '#pruvious/client'
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

const language = useDashboardContentLanguage()
const { prefixPrimaryLanguage } = useRuntimeConfig().public.pruvious
const prefix = language.value !== primaryLanguage || prefixPrimaryLanguage ? `/${language.value}/.../` : '/.../'
</script>
