<template>
  <PruviousStringFieldPreview
    :canUpdate="canUpdate"
    :name="name"
    :options="options"
    :value="isString(value) ? DOMPurify.sanitize(value, { ALLOWED_TAGS: ['#text'] }) : value"
    @refresh="$emit('refresh')"
  />
</template>

<script lang="ts" setup>
import { type PropType } from '#imports'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import DOMPurify from 'dompurify'
import { isString } from '../../utils/string'

defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: String,
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

const PruviousStringFieldPreview = dashboardMiscComponent.StringFieldPreview()
</script>
