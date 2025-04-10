<template>
  <div class="showcase">
    <div class="showcase-inner">
      <hr />
      <div class="showcase-slot">
        <slot />
      </div>
      <hr />
    </div>

    <PUIButton v-if="$slots.config" @click="visible = !visible" title="Toggle sidebar" class="showcase-config-toggle">
      <Icon mode="svg" name="tabler:menu" />
    </PUIButton>

    <div v-if="$slots.config && visible" ref="configWrapper" class="showcase-config-wrapper">
      <slot name="config" />
    </div>
  </div>
</template>

<script lang="ts" setup>
const configWrapper = useTemplateRef('configWrapper')
const visible = ref(true)

provide('root', configWrapper)
</script>

<style scoped>
.showcase {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
}

.showcase::before,
.showcase::after {
  content: '';
  display: block;
  width: 1px;
  background-color: hsl(var(--pui-border));
}

.showcase-inner {
  max-width: 100%;
  margin: auto -1rem;
  padding: 1.5rem;
}

.showcase-inner hr {
  position: absolute;
  left: 0;
}

.showcase-inner hr:first-child {
  margin-top: -0.5rem;
}

.showcase-inner hr:last-child {
  margin-top: 0.5rem;
}

.showcase-slot {
  position: relative;
  z-index: 1;
}

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

.showcase-config-toggle {
  --pui-size: -4;
  position: fixed;
  z-index: 10;
  top: 0.375rem;
  right: 0.375rem;
}
</style>
