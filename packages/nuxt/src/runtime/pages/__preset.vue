<template>
  <div v-if="pruvious.page">
    <PruviousBlocks
      v-if="pruvious.page.blocks"
      v-bind="{ blocks: pruvious.page.blocks, isPreview }"
    />

    <ClientOnly>
      <component v-if="pruviousGuides" :is="pruviousGuides"></component>
    </ClientOnly>
  </div>
</template>

<script setup>
import { createError, fetchPage, useRoute } from '#imports'

const route = useRoute()
const isPreview = !!route.query.__p
const pruvious = usePruvious()
let pruviousGuides

pruvious.value.page = await fetchPage()

if (!pruvious.value.page) {
  throw createError({ statusCode: 404, statusMessage: 'Preset Not Found' })
}

if (isPreview) {
  pruviousGuides = resolveComponent('LazyPruviousGuides')
}
</script>
