<template>
  <ClientOnly>
    <LazyPruviousPreviewRect v-if="preview" />
    <!-- @todo <LazyPruviousDashboardWidget v-if="isLoggedIn && canAccessDashboard" /> -->
    <slot v-if="preview" name="preview" />
  </ClientOnly>
</template>

<script lang="ts" setup>
import { isPreview } from '#pruvious/client'

const preview = isPreview()
</script>
