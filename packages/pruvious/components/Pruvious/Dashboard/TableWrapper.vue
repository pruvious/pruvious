<template>
  <div class="p-table-wrapper">
    <div ref="scroller" tabindex="-1" class="p-table-scroller p-scrollbar">
      <slot />
    </div>

    <div v-if="$slots.footer" class="p-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script lang="ts" setup>
/**
 * The scrollable container of the table.
 */
const scroller = useTemplateRef('scroller')

defineExpose({ scroller })
</script>

<style scoped>
.p-table-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.p-table-scroller {
  overflow: auto;
}

.p-footer {
  position: sticky;
  margin-top: auto;
  padding: 0.75rem;
  background-color: hsl(var(--pui-background));
}

.p-footer::before {
  content: '';
  position: absolute;
  right: 0;
  bottom: 100%;
  left: 0;
  height: 1px;
  background-color: hsl(var(--pui-border));
}

.p-footer > :where(div):first-child {
  margin-right: auto;
}

.p-footer > :where(:not(div)):first-child {
  margin-left: auto;
}

.p-footer :deep(.pui-pagination-buttons) {
  margin: -0.75rem -0.25rem;
  padding: 0.75rem 0.25rem;
}
</style>
