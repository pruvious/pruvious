<template>
  <div
    class="fixed inset-x-0 top-0 z-50 h-0.5 bg-primary-400 transition-all"
    :class="{ 'invisible opacity-0': !fetchCount }"
  >
    <span></span>
  </div>
</template>

<script lang="ts" setup>
import { useFetchCount } from '../../composables/dashboard/fetch-count'

const fetchCount = useFetchCount()
</script>
