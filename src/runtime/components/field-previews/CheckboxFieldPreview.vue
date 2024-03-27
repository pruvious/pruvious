<template>
  <PruviousBooleanFieldPreview
    :canUpdate="canUpdate"
    :name="name"
    :options="options"
    :value="value"
    @refresh="$emit('refresh')"
  />
</template>

<script lang="ts" setup>
import { type PropType } from '#imports'
import { dashboardMiscComponent } from '#pruvious/dashboard'

defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Boolean,
    required: true,
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

const PruviousBooleanFieldPreview = dashboardMiscComponent.BooleanFieldPreview()
</script>
