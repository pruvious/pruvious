<template>
  <NuxtLayout :name="proute?.layout">
    <PruviousBlocks field="blocks" />
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { usePruviousRoute } from '#pruvious/app'

definePageMeta({
  middleware: ['pruvious'],
})

const proute = usePruviousRoute()
</script>
