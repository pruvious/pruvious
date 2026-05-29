<template>
  <li>
    <PruviousBlocks field="content" />
  </li>
</template>

<script lang="ts" setup>
import { blockPathInjection, blocksField, defineBlock, proseListItemBlockPathInjection } from '#pruvious/app'

defineBlock({
  ui: {
    icon: 'text-wrap-disabled',
    label: ({ __ }) => __('pruvious-dashboard', 'List item'),
    description: ({ __ }) => __('pruvious-dashboard', 'A single entry within a list, holding text or nested lists.'),
  },
})

defineProps({
  content: blocksField({
    allowRootBlocks: ['ProseNode', 'ProseList'],
    default: [{ $key: 'ProseNode', tag: 'p', text: '' }],
    ui: { label: ({ __ }) => __('pruvious-dashboard', 'Content') },
  }),
})

provide(proseListItemBlockPathInjection, inject(blockPathInjection))
</script>
