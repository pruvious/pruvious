<template>
  <NuxtLayout>
    <div>
      <h1>{{ error?.statusCode }}</h1>
      <p v-if="error?.statusCode === 404">{{ _('Page not found') }}</p>
    </div>
  </NuxtLayout>
</template>

<script lang="ts" setup>
import type { NuxtError } from '#app'
import { _ } from '#pruvious/client'

defineProps({
  error: Object as PropType<NuxtError>,
})

useHead({
  title: '404',
})
</script>
