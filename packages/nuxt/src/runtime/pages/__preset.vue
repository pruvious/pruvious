<template>
  <div v-if="pruvious.page" :key="key">
    <PruviousBlocks
      v-if="pruvious.page.blocks"
      v-bind="{ blocks: pruvious.page.blocks, isPreview }"
    />

    <ClientOnly>
      <component v-if="pruviousGuides" :is="pruviousGuides" @soft-reload="softReload()"></component>
    </ClientOnly>
  </div>
</template>

<script setup>
import { createError, fetchPage, ref, usePruvious, useRoute } from '#imports'

const route = useRoute()
const isPreview = !!route.query.__p
const pruvious = usePruvious()
const key = ref(0)

let page = await fetchPage()
let pruviousGuides

pruvious.value.page = page

if (!pruvious.value.page) {
  throw createError({ statusCode: 404, statusMessage: 'Preset Not Found' })
}

if (isPreview) {
  pruviousGuides = resolveComponent('LazyPruviousGuides')
}

async function softReload() {
  const top = window.scrollY
  document.body.style.height = `${document.body.offsetHeight}px`
  page = await fetchPage()
  pruvious.value.page = page
  key.value++

  setTimeout(() => {
    window.scrollTo({ top, behavior: 'instant' })
    document.body.style.height = null
    setTimeout(() => window.scrollTo({ top, behavior: 'instant' }), 250)
  })
}
</script>
