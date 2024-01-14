<template>
  <PruviousStringFieldPreview
    :canUpdate="canUpdate"
    :name="name"
    :options="options"
    :value="value"
    @refresh="$emit('refresh')"
  />
</template>

<script lang="ts" setup>
defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Object,
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
