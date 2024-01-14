<template>
  <ul v-if="dashboard.legalLinks.length" class="flex flex-wrap justify-center gap-4 text-vs">
    <li v-for="{ label, url } of dashboard.legalLinks">
      <NuxtLink
        :to="url"
        rel="noopener noreferrer nofollow"
        target="_blank"
        class="whitespace-nowrap text-gray-400 transition hocus:text-primary-700"
      >
        {{ label }}
      </NuxtLink>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
const dashboard = usePruviousDashboard()
</script>
