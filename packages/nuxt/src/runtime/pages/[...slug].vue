<template>
  <NuxtLayout v-if="page" :name="page?.layout" :key="key">
    <PruviousBlocks v-if="page.blocks" v-bind="{ blocks: page.blocks, isPreview }" />

    <ClientOnly>
      <component v-if="pruviousGuides" :is="pruviousGuides" @soft-reload="softReload()"></component>
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
  ref,
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
const key = ref(0)

let page = await fetchPage()
let pruviousGuides

pruvious.value.page = page

if (
  !page ||
  (!isPreview &&
    (page.path === '/404' ||
      languages.some((language) => {
        return language.code !== defaultLanguage && page.path === `/${language.code}/404`
      })))
) {
  if (process.server) {
    throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })
  } else {
    showError({ statusCode: 404, statusMessage: 'Page Not Found' })
  }
} else if (page.redirectTo) {
  await navigateTo(page.redirectTo, {
    redirectCode: page.redirectCode,
    replace: true,
    external: page.redirectTo.startsWith('http'),
  })
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
