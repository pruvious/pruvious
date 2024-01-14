<template>
  <div>
    <NuxtLayout :name="(page?.layout as any)">
      <slot>
        <PruviousBlocks v-if="page?.blocks" :blocks="page.blocks" />
      </slot>

      <ClientOnly>
        <LazyPruviousPreview v-if="page && route.query.__p" />
        <LazyPruviousEditLink v-if="page && auth.isLoggedIn" />
      </ClientOnly>
    </NuxtLayout>
  </div>
</template>

<script lang="ts" setup>
import { navigateTo, ref, useHead, useNuxtApp, useRoute } from '#imports'
import { useAuth } from '../../composables/auth'
import { getPage, usePage, type PruviousPage } from '../../composables/page'
import { loadTranslatableStrings } from '../../composables/translatable-strings'

const auth = useAuth()
const nuxtApp = useNuxtApp()
const page = ref<PruviousPage | null>(null)
const pruviousPage = usePage()
const route = useRoute()

if (!nuxtApp.isHydrating) {
  await loadTranslatableStrings('default')
  const redirect = await getPage()

  if (pruviousPage.value) {
    useHead({
      title: pruviousPage.value.title,
      htmlAttrs: pruviousPage.value.htmlAttrs,
      meta: pruviousPage.value.meta,
      script: pruviousPage.value.script,
      link: pruviousPage.value.link,
    })
  } else if (redirect) {
    await navigateTo(redirect.to, {
      redirectCode: redirect.code,
      replace: true,
      external: redirect.to.startsWith('http'),
    })
  }
}

page.value = pruviousPage.value
</script>
