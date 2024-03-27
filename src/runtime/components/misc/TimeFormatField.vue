<template>
  <PruviousDateTimeFormatField
    :compact="compact"
    :disabled="disabled"
    :errors="errors"
    :interval="1000"
    :record="record"
    @update:record="$emit('update:record', $event)"
    fieldName="timeFormat"
  />
</template>

<script lang="ts" setup>
import { dashboardMiscComponent } from '#pruvious/dashboard'

defineProps<{
  record: Record<string, any>
  errors: Record<string, string>
  compact: boolean
  disabled: boolean
}>()

defineEmits<{
  'update:record': [Record<string, any>]
}>()

const PruviousDateTimeFormatField = dashboardMiscComponent.DateTimeFormatField()
</script>
