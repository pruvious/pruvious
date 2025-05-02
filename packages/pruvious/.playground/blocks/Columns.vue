<template>
  <div></div>
</template>

<script lang="ts" setup>
import { blocksField, defineBlock, numberField } from '#pruvious/client'

defineBlock({
  group: 'test',
})

defineProps({
  columns: numberField({ min: 1, max: 4, default: 2, ui: { showSteppers: true } }),
  column1: blocksField({
    allowRootBlocks: ['Button', 'Image'],
    ui: { label: ({ __ }) => __('pruvious-dashboard', 'Column 1') },
  }),
  column2: blocksField({
    allowNestedBlocks: ['Button', 'Image'],
    conditionalLogic: { orGroup: [{ columns: { '=': 2 } }, { columns: { '=': 3 } }, { columns: { '=': 4 } }] },
  }),
  column3: blocksField({
    denyRootBlocks: ['Button', 'Image'],
    conditionalLogic: { orGroup: [{ columns: { '=': 3 } }, { columns: { '=': 4 } }] },
  }),
  column4: blocksField({
    denyNestedBlocks: ['Button', 'Image'],
    conditionalLogic: { columns: { '=': 4 } },
  }),
})
</script>
