<template>
  <NuxtLayout v-if="pruvious.page" :name="pruvious.page.layout" :key="key">
    <PruviousBlocks
      v-if="pruvious.page.blocks"
      v-bind="{ blocks: pruvious.page.blocks, isPreview }"
    />

    <ClientOnly>
      <component v-if="pruviousGuides" :is="pruviousGuides" @soft-reload="softReload()"></component>
    </ClientOnly>

    <LazyPruviousSEO v-if="config.public.pruvious.seo !== false"></LazyPruviousSEO>
  </NuxtLayout>
</template>

<script setup>
import { fetchLanguages, fetchPage, ref, usePruvious, useRoute, useRuntimeConfig } from '#imports'

const config = useRuntimeConfig()
const route = useRoute()
const isPreview = !!route.query.__p
const { defaultLanguage, languages } = await fetchLanguages()
const language = languages.find((language) => {
  return language.code !== defaultLanguage && route.fullPath.startsWith(`/${language.code}/`)
})
const pruvious = usePruvious()
const key = ref(0)

let page = await fetchPage(language ? `/${language.code}/404` : '/404')
let pruviousGuides

pruvious.value.page = page

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
