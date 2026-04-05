<template>
  <PruviousEditableText :tag="tag" field="text" />
</template>

<script lang="ts" setup>
import { commonMarks, defineBlock, richTextField, selectField } from '#pruvious/app'

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
    label: ({ __ }) => __('pruvious-dashboard', 'Node'),
    itemLabelConfiguration: {
      fieldValue: 'text',
      showBlockLabel: false,
      stripHTML: true,
    },
  },
})

const props = defineProps({
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
  text: richTextField({
    trim: false,
    marks: commonMarks,
    ui: {
      label: ({ __ }) => __('pruvious-dashboard', 'Text'),
      placeholder: ({ __ }) => __('pruvious-dashboard', 'Enter text here...'),
      liveEditor: {
        deleteBlockWhenEmpty: true,
        formatters: [
          ({ newHTML, newText, oldText }) => {
            const tagMap = {
              '# ': 'h1',
              '## ': 'h2',
              '### ': 'h3',
              '#### ': 'h4',
              '##### ': 'h5',
              '###### ': 'h6',
              '> ': 'blockquote',
            } as const
            const escapeMap: Record<string, string> = {
              '> ': '&gt; ',
            }

            for (const [symbol, tag] of Object.entries(tagMap)) {
              if (newText.startsWith(symbol) && !oldText.startsWith(symbol)) {
                return {
                  $key: 'ProseNode',
                  tag,
                  text: newHTML.replace(new RegExp(`${escapeMap[symbol] ?? symbol}?`), ''),
                }
              }
            }
          },
          ({ newHTML, newText, oldText }) => {
            for (const symbol of ['- ', '* ', '+ ']) {
              if (newText.startsWith(symbol) && !oldText.startsWith(symbol)) {
                return {
                  $key: 'ProseList',
                  type: 'ul',
                  content: [
                    {
                      $key: 'ProseListItem',
                      content: [{ $key: 'ProseNode', tag: 'p', text: newHTML.replace(new RegExp(`${symbol}?`), '') }],
                    },
                  ],
                }
              }
            }
          },
          ({ newHTML, newText, oldText }) => {
            if (newText.startsWith('1. ') && !oldText.startsWith('1. ')) {
              return {
                $key: 'ProseList',
                type: 'ol',
                content: [
                  {
                    $key: 'ProseListItem',
                    content: [{ $key: 'ProseNode', tag: 'p', text: newHTML.replace(/1\. ?/, '') }],
                  },
                ],
              }
            }
          },
        ],
        mergeGroups: ['prose'],
        toolbar: ['mark:bold', 'mark:italic', 'mark:underline', 'mark:code', 'mark:strikethrough', 'clearFormatting'],
      },
    },
  }),
})
</script>
