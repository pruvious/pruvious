<template>
  <div id="pruvious-drag-image">
    <span>{{ dragImageLabel }}</span>
  </div>
</template>

<script lang="ts" setup>
import { usePruviousDashboardDragImageLabel } from '#pruvious/client'

const dragImageLabel = usePruviousDashboardDragImageLabel()
</script>

<style scoped>
#pruvious-drag-image {
  position: absolute;
  top: -100vh;
  left: -100vw;
  display: inline-flex;
  padding: 0.125rem 0.375rem;
  background-color: hsl(var(--pui-primary));
  border-radius: var(--pui-radius);
  color: hsl(var(--pui-primary-foreground));
  font-size: 0.75rem;
  white-space: nowrap;
}
</style>
