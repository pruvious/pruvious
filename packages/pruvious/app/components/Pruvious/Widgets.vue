<template>
  <ClientOnly>
    <template v-if="preview">
      <LazyPruviousPreviewRect />
      <slot name="preview" />
    </template>
    <LazyPruviousDashboardWidget v-else-if="showWidget" />
  </ClientOnly>
</template>

<script lang="ts" setup>
import { hasPermission, isPreview, useAuth } from '#pruvious/app'

const preview = isPreview()
const auth = useAuth()
const showWidget = computed(() => auth.value.isLoggedIn && hasPermission('access-dashboard'))
</script>
