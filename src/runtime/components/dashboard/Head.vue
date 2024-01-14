<template></template>

<script lang="ts" setup>
import { useHead } from '#imports'
import faviconPng from '../../assets/favicon.png'
import faviconSvg from '../../assets/favicon.svg'

useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - Pruvious` : 'Pruvious'
  },
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: faviconSvg },
    { rel: 'icon', type: 'image/png', href: faviconPng },
  ],
})
</script>
