<template>
  <PruviousDashboardPage noMainPadding>
    <div class="p-redirects">
      <div class="p-redirects-content">
        <Icon mode="svg" name="tabler:barrier-block" />
        <p class="p-redirects-text">This page is currently under construction</p>
      </div>
    </div>
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import type { SerializableSingleton, Singletons } from '#pruvious/server'

const props = defineProps({
  /**
   * The name and definition of the current singleton.
   */
  singleton: {
    type: Object as PropType<{ name: keyof Singletons; definition: SerializableSingleton }>,
    required: true,
  },
})
</script>

<style scoped>
:deep(.p-page-main) {
  height: 100%;
}

.p-redirects {
  display: flex;
  min-height: 100%;
}

.p-redirects-content {
  margin: auto;
  padding: 0.75rem;
  text-align: center;
}

.p-redirects-content svg {
  margin: 0 auto;
  color: hsl(var(--pui-muted-foreground));
  font-size: 4rem;
}

.p-redirects-text {
  margin-bottom: 2rem;
  font-size: 0.875rem;
  color: hsl(var(--pui-muted-foreground));
}
</style>
