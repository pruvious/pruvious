<template>
  <div class="columns">
    <div class="column">
      <PruviousBlocks field="column1" />
    </div>
    <div v-if="columns > 1" class="column">
      <PruviousBlocks field="column2" />
    </div>
    <div v-if="columns > 2" class="column">
      <PruviousBlocks field="column3" />
    </div>
    <div v-if="columns > 3" class="column">
      <PruviousBlocks field="column4" />
    </div>
  </div>
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

<style scoped>
.columns {
  display: flex;
  gap: 1rem;
}

.column {
  flex: 1;
  padding: 0.5rem;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
