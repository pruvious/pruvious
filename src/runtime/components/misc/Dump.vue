<template>
  <div v-if="visible" class="rounded-md bg-gray-700 p-4 font-mono text-sm text-white">
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { ref } from '#imports'

const visible = ref(process.client ? !!localStorage.getItem('dump') : false)
</script>
