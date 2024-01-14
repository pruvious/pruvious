<template>
  <PruviousStringFieldPreview
    :canUpdate="canUpdate"
    :name="name"
    :options="options"
    :value="value ? `${value[0]} - ${value[1]}` : ''"
    @refresh="$emit('refresh')"
  />
</template>

<script lang="ts" setup>
import { type PropType } from '#imports'

defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Array as unknown as PropType<[number, number]>,
  },
  options: {
    type: Object,
    required: true,
  },
  canUpdate: {
    type: Boolean,
    default: false,
  },
  record: {
    type: Object as PropType<Record<string, any>>,
  },
  language: {
    type: String,
  },
})

defineEmits<{
  refresh: []
}>()
</script>
