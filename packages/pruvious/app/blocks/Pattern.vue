<template>
  <PruviousBlocks v-if="pattern && pattern.length" field="pattern" />
</template>

<script lang="ts" setup>
import {
  blockPathInjection,
  defineBlock,
  inLinkedBlocksInjection,
  linkedBlocksField,
  linkedBlocksRootInjection,
} from '#pruvious/app'

defineOptions({ inheritAttrs: false })

defineBlock({
  ui: {
    icon: 'puzzle',
    label: ({ __ }) => __('pruvious-dashboard', 'Pattern'),
    description: ({ __ }) =>
      __('pruvious-dashboard', 'A reusable group of blocks selected from the Patterns collection.'),
  },
})

defineProps({
  pattern: linkedBlocksField({
    collection: 'Patterns',
    required: true,
    ui: {
      label: ({ __ }) => __('pruvious-dashboard', 'Pattern'),
      displayFields: ['title', 'description'],
      searchFields: ['title', 'description'],
    },
  }),
})

const ownPath = inject(blockPathInjection, undefined)
const rootInfo = computed(() => ({ path: ownPath?.value ?? '', name: 'Pattern' as const }))

provide(inLinkedBlocksInjection, true)
provide(linkedBlocksRootInjection, rootInfo)
</script>
