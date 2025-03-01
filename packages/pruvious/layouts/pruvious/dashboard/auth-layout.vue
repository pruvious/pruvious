<template>
  <PruviousDashboardBase>
    <div class="p-layout">
      <div class="p-header">
        <slot name="header" />
      </div>

      <div class="p-main">
        <hr />
        <div class="p-slot">
          <slot />
        </div>
        <hr />
      </div>

      <div class="p-footer">
        <PruviousDashboardLegalLinks />
      </div>
    </div>
  </PruviousDashboardBase>
</template>

<style scoped>
.p-layout {
  width: 100%;
  max-width: 24rem;
  margin: auto -1rem;
  padding: 0.5rem 0;
}

.p-header,
.p-footer {
  min-height: 1.875rem;
  padding: 0 1.5rem;
}

.p-main {
  padding: 1rem 1.5rem;
}

.p-main hr {
  position: absolute;
  left: 0;
}

.p-main hr:first-child {
  margin-top: -0.5rem;
}

.p-main hr:last-child {
  margin-top: 0.5rem;
}

.p-slot {
  position: relative;
  z-index: 1;
}
</style>
