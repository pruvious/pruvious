<template>
  <div ref="configWrapper" class="showcase-config-wrapper">
    <slot />
  </div>
</template>

<script lang="ts" setup>
const configWrapper = useTemplateRef('configWrapper')

provide('root', configWrapper)
</script>

<style scoped>
.showcase-config-wrapper {
  --pui-size: -2;
  position: fixed;
  z-index: 9;
  top: 0.5rem;
  right: 0.5rem;
  max-width: 16rem;
  max-height: calc(100% - 1rem);
  padding: 0.5rem;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--pui-foreground) / 0.25) transparent;
  background: hsl(var(--pui-card));
  border-width: 1px;
  border-radius: var(--pui-radius);
}
</style>
