<template>
  <PUIField>
    <PUIFieldLabel>
      <span class="label">{{ label }}</span>
    </PUIFieldLabel>
    <code class="value">
      <slot>{{ value }}</slot>
    </code>
  </PUIField>
</template>

<script lang="ts" setup>
defineProps({
  value: {
    type: null,
  },
  label: {
    type: String,
    default: 'Value',
  },
})
</script>

<style scoped>
.label {
  font-weight: 500;
}

.value {
  display: block;
  font-size: 0.8125rem;
}
</style>
