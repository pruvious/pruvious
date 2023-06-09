<template>
  <div v-if="preset">
    <PruviousBlocks v-if="preset.blocks" v-bind="{ blocks: preset.blocks, isPreview }" />

    <ClientOnly>
      <component v-if="pruviousGuides" v-bind="{ page: preset }" :is="pruviousGuides"></component>
    </ClientOnly>
  </div>
</template>

<script setup>
import { createError, fetchPage, useRoute } from '#imports'

const route = useRoute()
const preset = await fetchPage()
const isPreview = !!route.query.__p
let pruviousGuides

if (!preset) {
  throw createError({ statusCode: 404, statusMessage: 'Preset Not Found' })
}

if (isPreview) {
  pruviousGuides = resolveComponent('LazyPruviousGuides')
}
</script>
