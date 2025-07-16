<template>
  <div class="prose">
    <PruviousBlocks field="elements" />
  </div>
</template>

<script lang="ts" setup>
import { blocksField, defineBlock } from '#pruvious/client'

defineBlock({
  ui: {
    icon: 'text-wrap',
    label: ({ __ }) => __('pruvious-dashboard', 'Prose'),
  },
})

defineProps({
  elements: blocksField({
    allowRootBlocks: ['ProseElement'],
    default: [{ $key: 'ProseElement', tag: 'p', text: '' }],
    ui: { label: ({ __ }) => __('pruvious-dashboard', 'Prose elements') },
  }),
})
</script>
