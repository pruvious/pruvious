<template>
  <div class="showcase">
    <div class="showcase-inner">
      <hr />
      <div class="showcase-slot">
        <slot />
      </div>
      <hr />
    </div>

    <div v-if="$slots.config" class="showcase-config">
      <slot name="config" />
    </div>
  </div>
</template>

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

.showcase-config {
  --pui-size: -2;
  position: absolute;
  z-index: 9;
  top: 0.5rem;
  right: 0.5rem;
  max-width: calc(100% - 1rem);
  padding: 0.5rem;
  background: hsl(var(--pui-card));
  border-width: 1px;
  border-radius: var(--pui-radius);
}
</style>
