<template>
  <PruviousEditableText :tag="tag" field="text" />
</template>

<script lang="ts" setup>
import { defineBlock, selectField, textField } from '#pruvious/client'

defineBlock({
  ui: {
    icon: {
      fieldName: 'tag',
      iconMap: {
        p: 'pilcrow',
        h1: 'h-1',
        h2: 'h-2',
        h3: 'h-3',
        h4: 'h-4',
        h5: 'h-5',
        h6: 'h-6',
        blockquote: 'blockquote',
        pre: 'code',
        div: 'typography',
      },
      defaultIcon: 'typography',
    },
    label: ({ __ }) => __('pruvious-dashboard', 'Prose element'),
    itemLabelConfiguration: { fieldValue: 'text', showBlockLabel: false },
  },
})

defineProps({
  tag: selectField({
    choices: [
      { value: 'p', label: ({ __ }) => 'p - ' + __('pruvious-dashboard', 'Paragraph') },
      { value: 'h1', label: ({ __ }) => 'h1 - ' + __('pruvious-dashboard', 'Heading $level', { level: 1 }) },
      { value: 'h2', label: ({ __ }) => 'h2 - ' + __('pruvious-dashboard', 'Heading $level', { level: 2 }) },
      { value: 'h3', label: ({ __ }) => 'h3 - ' + __('pruvious-dashboard', 'Heading $level', { level: 3 }) },
      { value: 'h4', label: ({ __ }) => 'h4 - ' + __('pruvious-dashboard', 'Heading $level', { level: 4 }) },
      { value: 'h5', label: ({ __ }) => 'h5 - ' + __('pruvious-dashboard', 'Heading $level', { level: 5 }) },
      { value: 'h6', label: ({ __ }) => 'h6 - ' + __('pruvious-dashboard', 'Heading $level', { level: 6 }) },
      { value: 'blockquote', label: ({ __ }) => 'blockquote - ' + __('pruvious-dashboard', 'Blockquote') },
      { value: 'pre', label: ({ __ }) => 'pre - ' + __('pruvious-dashboard', 'Preformatted text') },
      { value: 'div', label: ({ __ }) => 'div - ' + __('pruvious-dashboard', 'Division') },
    ],
    default: 'p',
    ui: {
      label: ({ __ }) => __('pruvious-dashboard', 'Tag'),
      description: ({ __ }) => __('pruvious-dashboard', 'The HTML tag name to use for this element.'),
    },
  }),
  text: textField({
    ui: {
      label: ({ __ }) => __('pruvious-dashboard', 'Text'),
      placeholder: ({ __ }) => __('pruvious-dashboard', 'Enter text here...'),
    },
  }),
})
</script>
