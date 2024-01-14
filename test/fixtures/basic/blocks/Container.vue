<template>
  <slot />
</template>

<script lang="ts" setup>
import { defineBlock } from '#pruvious'

defineBlock({
  slots: { default: { allowedChildBlocks: ['Button', 'Preset'] } },
})

defineProps({})
</script>
