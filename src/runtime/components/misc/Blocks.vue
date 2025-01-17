<template>
  <template v-for="({ block }, i) in blocks" :key="`${keyPrefix}.${i}`">
    <PruviousBlocks
      v-if="block.name === 'Preset' && block.fields.preset?.blocks"
      :blocks="block.fields.preset.blocks"
      :fixedKey="fixedKey || (keyPrefix && route.query.__p) ? `${keyPrefix}.${i}` : undefined"
      :isPreset="true"
      :parents="parents"
    />

    <component
      v-if="block.name !== 'Preset'"
      v-bind="block.fields"
      :__block="block"
      :__index="i"
      :__list="blocks"
      :__parents="parents"
      :data-pruvious-block-key="
        fixedKey || (keyPrefix && !isPreset && route.query.__p ? `${keyPrefix}.${i}` : undefined)
      "
      :data-pruvious-block-name="route.query.__p ? block.name : undefined"
      :fixedKey="fixedKey"
      :is="components[block.name]"
      :isPreset="isPreset"
    >
      <template
        v-for="(childBlocks, slotName) in block.slots"
        :key="`${keyPrefix}.${i}.block.slots.${slotName}`"
        #[slotName]
      >
        <PruviousBlocks
          :blocks="childBlocks"
          :fixedKey="fixedKey"
          :isPreset="isPreset"
          :keyPrefix="`${keyPrefix}.${i}.block.slots.${slotName}`"
          :parents="[...parents, block]"
        />
      </template>
    </component>
  </template>
</template>

<script lang="ts" setup>
import { useRoute, watch, type PropType } from '#imports'
import type { PopulatedBlockData, PopulatedFieldType } from '#pruvious'
import { blocks as blockImports } from '#pruvious/blocks/imports'

const props = defineProps({
  blocks: {
    type: Array as PropType<Array<PopulatedFieldType['pages']['blocks'][0]>>,
    required: true,
  },
  keyPrefix: {
    type: String,
    default: 'blocks',
  },
  isPreset: {
    type: Boolean,
    default: false,
  },
  fixedKey: {
    type: String,
  },
  parents: {
    type: Array as PropType<PopulatedBlockData[]>,
    default: () => [],
  },
})

const route = useRoute()

const components: Record<string, any> = {}

watch(
  () => props.blocks,
  (blocks) => {
    blocks.forEach(({ block }) => {
      if (block.name !== 'Preset') {
        components[block.name] = blockImports[block.name]()
      }
    })
  },
  { immediate: true, deep: !!route.query.__p },
)
</script>
