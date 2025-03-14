<template>
  <NuxtLayout name="pruvious-dashboard-default-layout" noMainPadding>
    <template #header>
      <PruviousDashboardHeader />
    </template>

    <template #sidebar>
      <PruviousDashboardMenu />
    </template>

    <div class="p-page-wrapper">
      <div tabindex="-1" class="p-page-container p-scrollbar">
        <div v-if="$slots.header" class="p-page-header">
          <slot name="header" />
        </div>

        <div class="p-page-main" :class="{ 'p-page-main-no-padding': noMainPadding }">
          <slot />
        </div>
      </div>

      <div v-if="$slots.footer" class="p-page-footer">
        <slot name="footer" />
      </div>
    </div>
  </NuxtLayout>
</template>

<script lang="ts" setup>
defineProps({
  /**
   * Whether to remove the padding from the `main` slot.
   *
   * @default false
   */
  noMainPadding: {
    type: Boolean,
    default: false,
  },
})
</script>

<style scoped>
.p-page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.p-page-container {
  flex: 1;
  overflow-y: auto;
  outline: none;
}

.p-page-header {
  padding: calc(0.75rem + 1px) 0.75rem 0.75rem;
  border-bottom-width: 1px;
  font-size: 14px;
  font-weight: 500;
}

.p-page-header :deep(.pui-button) {
  margin-right: 0.25rem;
  margin-left: 0.25rem;
}

.p-page-header :deep(.pui-button:first-child) {
  margin-left: 0;
}

.p-page-header :deep(.pui-button:last-child) {
  margin-right: 0;
}

.p-page-main {
  padding: 0.75rem;
}

.p-page-main-no-padding {
  padding: 0;
}

.p-page-footer {
  position: sticky;
  bottom: 0;
  border-top-width: 1px;
  padding: 0.75rem;
}

@media (max-width: 1024px) {
  .p-page-header :deep(.pui-button) {
    --pui-size: -2;
  }
}
</style>
