<template>
  <component :is="type">
    <PruviousBlocks field="content" />
  </component>
</template>

<script lang="ts" setup>
import { blocksField, buttonGroupField, defineBlock } from '#pruvious/app'

defineBlock({
  ui: {
    icon: {
      fieldName: 'type',
      iconMap: {
        ul: 'list',
        ol: 'list-numbers',
      },
      defaultIcon: 'list',
    },
    label: ({ __ }) => __('pruvious-dashboard', 'List'),
    itemLabelConfiguration: { fieldValue: 'type' },
  },
})

defineProps({
  type: buttonGroupField({
    choices: [
      { value: 'ul', label: ({ __ }) => __('pruvious-dashboard', 'Unordered') },
      { value: 'ol', label: ({ __ }) => __('pruvious-dashboard', 'Ordered') },
    ],
    default: 'ul',
    ui: {
      label: ({ __ }) => __('pruvious-dashboard', 'Type'),
      description: ({ __ }) => __('pruvious-dashboard', 'Determines the HTML tag to use for the list.'),
    },
  }),
  content: blocksField({
    allowRootBlocks: ['ProseListItem'],
    default: [{ $key: 'ProseListItem', content: [{ $key: 'ProseNode', tag: 'p', text: '' }] }],
    ui: { label: ({ __ }) => __('pruvious-dashboard', 'Content') },
  }),
})
</script>
