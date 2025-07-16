<template>
  <ul>
    <PruviousBlocks field="items" />
  </ul>
</template>

<script lang="ts" setup>
import { blocksField, defineBlock } from '#pruvious/client'

defineBlock({
  ui: {
    icon: 'list',
    label: ({ __ }) => __('pruvious-dashboard', 'Unordered list'),
  },
})

defineProps({
  items: blocksField({
    allowRootBlocks: ['BoxedText'],
    default: [{ $key: 'BoxedText', text: '' }],
    ui: { label: ({ __ }) => __('pruvious-dashboard', 'Items') },
  }),
})
</script>
