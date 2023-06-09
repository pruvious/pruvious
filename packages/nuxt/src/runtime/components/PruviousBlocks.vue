<template>
  <template v-for="(block, index) in blocks" :key="index">
    <PruviousBlocks
      v-if="block.name === 'Preset'"
      v-bind="{ blocks: block.props.preset?.blocks ?? [], blockId: block.id, isPreview }"
    />

    <component
      v-if="block.name !== 'Preset'"
      v-bind="{ blockId: blockId ?? block.id, isPreview, ...block.props }"
      :is="components[block.name]"
      :data--pruvious-block-id="isPreview ? blockId ?? block.id : null"
      :data-block-name="block.name"
    >
      <template v-for="(childBlocks, slotName) in block.children" #[slotName]>
        <PruviousBlocks v-bind="{ blocks: childBlocks, blockId, isPreview }" />
      </template>
    </component>
  </template>
</template>

<script setup>
import { resolveComponent } from '#imports'

const props = defineProps({
  blocks: { type: Array, default: [] },
  blockId: { type: String, default: undefined },
  isPreview: { type: Boolean, default: false },
})
const components = {}

for (const block of props.blocks) {
  if (block.name !== 'Preset') {
    components[block.name] = resolveComponent(`Lazy${block.name}`)
  }
}
</script>
