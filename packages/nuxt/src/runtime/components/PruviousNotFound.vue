<template>
  <NuxtLayout v-if="pruvious.page" :name="pruvious.page.layout">
    <PruviousBlocks
      v-if="pruvious.page.blocks"
      v-bind="{ blocks: pruvious.page.blocks, isPreview }"
    />

    <ClientOnly>
      <component v-if="pruviousGuides" :is="pruviousGuides"></component>
    </ClientOnly>

    <LazyPruviousSEO v-if="config.public.pruvious.seo !== false"></LazyPruviousSEO>
  </NuxtLayout>
</template>

<script setup>
import { fetchLanguages, fetchPage, usePruvious, useRoute, useRuntimeConfig } from '#imports'

const config = useRuntimeConfig()
const route = useRoute()
const isPreview = !!route.query.__p
const { defaultLanguage, languages } = await fetchLanguages()
const language = languages.find((language) => {
  return language.code !== defaultLanguage && route.fullPath.startsWith(`/${language.code}/`)
})
const pruvious = usePruvious()
let pruviousGuides

pruvious.value.page = await fetchPage(language ? `/${language.code}/404` : '/404')

if (isPreview) {
  pruviousGuides = resolveComponent('LazyPruviousGuides')
}
</script>
