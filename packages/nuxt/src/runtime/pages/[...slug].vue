<template>
  <NuxtLayout v-if="pruvious.page" :name="pruvious.page?.layout">
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
import {
  createError,
  fetchLanguages,
  fetchPage,
  navigateTo,
  resolveComponent,
  showError,
  usePruvious,
  useRoute,
  useRuntimeConfig,
} from '#imports'

const config = useRuntimeConfig()
const route = useRoute()
const { defaultLanguage, languages } = await fetchLanguages()
const isPreview = !!route.query.__p
const pruvious = usePruvious()
let pruviousGuides

pruvious.value.page = await fetchPage()

if (
  !pruvious.value.page ||
  (!isPreview &&
    (pruvious.value.page.path === '/404' ||
      languages.some((language) => {
        return (
          language.code !== defaultLanguage && pruvious.value.page.path === `/${language.code}/404`
        )
      })))
) {
  if (process.server) {
    throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })
  } else {
    showError({ statusCode: 404, statusMessage: 'Page Not Found' })
  }
} else if (pruvious.value.page.redirectTo) {
  await navigateTo(pruvious.value.page.redirectTo, {
    redirectCode: pruvious.value.page.redirectCode,
    replace: true,
    external: pruvious.value.page.redirectTo.startsWith('http'),
  })
}

if (isPreview) {
  pruviousGuides = resolveComponent('LazyPruviousGuides')
}
</script>
