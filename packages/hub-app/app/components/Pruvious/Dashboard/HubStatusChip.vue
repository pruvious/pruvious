<template>
  <span v-if="modelValue" :class="['p-status-chip', `is-${modelValue}`]">
    <Icon :name="statusIcon(modelValue)" mode="svg" />
    <span class="pui-truncate">{{ statusLabel(modelValue) }}</span>
  </span>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'

defineProps({
  modelValue: {
    type: [String, null] as PropType<string | null | undefined>,
  },
})

function statusIcon(s: string | null | undefined): string {
  switch (s) {
    case 'success':
      return 'tabler:check'
    case 'failed':
      return 'tabler:x'
    case 'running':
      return 'tabler:loader-2'
    default:
      return 'tabler:clock'
  }
}

function statusLabel(s: string | null | undefined): string {
  switch (s) {
    case 'success':
      return __('pruvious-dashboard', 'Success')
    case 'failed':
      return __('pruvious-dashboard', 'Failed')
    case 'running':
      return __('pruvious-dashboard', 'Running')
    case 'queued':
      return __('pruvious-dashboard', 'Queued')
    default:
      return s ?? ''
  }
}
</script>

<style scoped>
.p-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  padding: 0.25rem 0.5rem 0.25rem 0.375rem;
  border-radius: 9999px;
  background-color: hsl(var(--pui-muted) / 0.6);
  color: hsl(var(--pui-foreground));
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
  text-transform: capitalize;
  max-width: 100%;
}

.p-status-chip :deep(svg) {
  flex-shrink: 0;
  font-size: 0.95em;
}

.p-status-chip.is-success {
  background-color: hsl(var(--p-green) / 0.1);
  color: hsl(var(--p-green));
}

.p-status-chip.is-failed {
  background-color: hsl(var(--pui-destructive) / 0.1);
  color: hsl(var(--pui-destructive));
}

.p-status-chip.is-running {
  background-color: hsl(var(--p-orange) / 0.1);
  color: hsl(var(--p-orange));
}

.p-status-chip.is-running :deep(svg) {
  animation: p-status-spin 1s linear infinite;
}

.p-status-chip.is-queued {
  background-color: hsl(var(--pui-secondary) / 0.6);
  color: hsl(var(--pui-secondary-foreground));
}

@keyframes p-status-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
