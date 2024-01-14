<template>
  <div class="absolute h-0 w-0 overflow-hidden">
    <div
      id="pruvious-drag-image"
      class="absolute inline-flex space-x-1 whitespace-nowrap rounded bg-primary-700 px-1.5 py-0.5 text-xs text-white drop-shadow"
    >
      <span>{{ dragImageLabel }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useDragImageLabel } from '../../composables/dashboard/move'

const dragImageLabel = useDragImageLabel()
</script>
