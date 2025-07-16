<template>
  <NuxtLayout :name="proute?.layout">
    <Header />
    <PruviousBlocks field="blocks" />
    <Footer />
    <PruviousWidgets />
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { usePruviousRoute } from '#pruvious/client'

definePageMeta({
  middleware: ['pruvious'],
})

const proute = usePruviousRoute()
</script>
