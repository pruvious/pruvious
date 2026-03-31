<template>
  <div class="prose">
    <PruviousBlocks field="content" />
  </div>
</template>

<script lang="ts" setup>
import { blocksField, defineBlock } from '#pruvious/app'

defineBlock({
  ui: {
    icon: 'text-wrap',
    label: ({ __ }) => __('pruvious-dashboard', 'Prose'),
  },
})

defineProps({
  content: blocksField({
    allowRootBlocks: ['ProseList', 'ProseNode'],
    default: [{ $key: 'ProseNode', tag: 'p', text: '' }],
    ui: { label: ({ __ }) => __('pruvious-dashboard', 'Content') },
  }),
})
</script>

<style scoped>
.prose {
  font-family: Verdana, Geneva, Tahoma, sans-serif;
}
</style>
