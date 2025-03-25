<template>
  <PUIBase>
    <PruviousDashboardBaseExtend>
      <PruviousDashboardWrapper>
        <slot />
      </PruviousDashboardWrapper>
    </PruviousDashboardBaseExtend>

    <PruviousTokenRenewer :fetcher="pruviousDashboardPost" />
    <PruviousDashboardUnsavedChanges />
    <PruviousDashboardLoginPopup />
  </PUIBase>
</template>

<script lang="ts" setup>
import { pruviousDashboardPost, usePruviousHMR } from '#pruvious/client'
import '@pruvious/ui/styles'
import { useEventListener } from '@vueuse/core'

const runtimeConfig = useRuntimeConfig()
const mac = puiIsMac()

useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - Pruvious` : 'Pruvious'
  },
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: `${runtimeConfig.app.baseURL}pruvious/favicon.svg` },
    { rel: 'icon', type: 'image/png', href: `${runtimeConfig.app.baseURL}pruvious/favicon.png` },
  ],
})

onMounted(() => {
  if (import.meta.hot) {
    usePruviousHMR().start()
  }
})

useEventListener('keydown', (event) => {
  if (
    (event.code === 'KeyD' || event.code === 'KeyS') &&
    ((mac && event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey) ||
      (!mac && event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey))
  ) {
    event.preventDefault()
  }
})
</script>

<style>
:root {
  --p-green: 160 100% 30%;
  --p-orange: 32 100% 51%;
  --p-purple: 275 82% 38%;
  --p-yellow: 52 100% 56%;
}

html,
body {
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
}

.p-scrollbar,
.pui-container {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--pui-foreground) / 0.25) transparent;
}

.p-scrollbar::-webkit-scrollbar,
.pui-container::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.p-scrollbar::-webkit-scrollbar-thumb,
.pui-container::-webkit-scrollbar-thumb {
  background-color: hsl(var(--pui-foreground) / 0.25);
  background-clip: padding-box;
  border-radius: 6px;
  border: 2px solid transparent;
}

.p-scrollbar::-webkit-scrollbar-track,
.pui-container::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>
