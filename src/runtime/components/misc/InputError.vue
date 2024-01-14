<template>
  <div v-if="errors && fieldKey && errors[fieldKey]" class="flex gap-1.5 pt-0.5 text-vs text-red-500">
    <PruviousIconAlertTriangle class="h-5 w-4 shrink-0 py-0.5" />
    <span>{{ errors[fieldKey] }}</span>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  fieldKey?: string
  errors?: Record<string, string>
}>()
</script>
