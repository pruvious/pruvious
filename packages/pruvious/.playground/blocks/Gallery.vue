<template>
  <div></div>
</template>

<script lang="ts" setup>
import { blocksField, defineBlock } from '#pruvious/client'

defineBlock({
  tags: ['test'],
  ui: { icon: 'library-photo' },
})

defineProps({
  blocks: blocksField({
    allowRootBlocks: ['Image'],
    ui: { addBlockLabel: 'Add image' },
  }),
})
</script>
