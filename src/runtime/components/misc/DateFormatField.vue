<template>
  <PruviousDateTimeFormatField
    :compact="compact"
    :disabled="disabled"
    :errors="errors"
    :record="record"
    @update:record="$emit('update:record', $event)"
    fieldName="dateFormat"
  />
</template>

<script lang="ts" setup>
defineProps<{
  record: Record<string, any>
  errors: Record<string, string>
  compact: boolean
  disabled: boolean
}>()

defineEmits<{
  'update:record': [Record<string, any>]
}>()
</script>
