<template>
  <NuxtLayout>
    <pre>{{ proute }}</pre>
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { usePruviousRoute } from '#pruvious/client'

definePageMeta({
  middleware: ['pruvious'],
})

const proute = usePruviousRoute<'Pages'>()
</script>
