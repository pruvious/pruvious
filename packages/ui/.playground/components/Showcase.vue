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

    <ShowcaseConfigWrapper v-if="$slots.config && visible">
      <slot name="config" />
    </ShowcaseConfigWrapper>
  </div>
</template>

<script lang="ts" setup>
const visible = ref(true)
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

.showcase-config-toggle {
  --pui-size: -4;
  position: fixed;
  z-index: 10;
  top: 0.375rem;
  right: 0.375rem;
}
</style>
