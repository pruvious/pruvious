<template>
  <NuxtLayout :name="proute?.layout">
    <Header />
    <pre v-if="preview">@todo move this to breadcrumbs below iframe</pre>
    <pre v-if="preview">{{ focusedBlocks.map((block) => block.path).join(' -> ') || '-' }}</pre>
    <PruviousBlocks field="blocks" />
    <Footer />
    <PruviousWidgets />
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { isPreview, usePruviousRoute } from '#pruvious/app'
import { usePreview } from '#pruvious/dashboard'

definePageMeta({
  middleware: ['pruvious'],
})

const proute = usePruviousRoute()
const { focusedBlocks } = usePreview()
const preview = isPreview()
</script>
