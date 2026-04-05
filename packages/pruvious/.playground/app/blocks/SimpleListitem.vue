<template>
  <PruviousEditableText field="text" tag="li" />
</template>

<script lang="ts" setup>
import { defineBlock, richTextField } from '#pruvious/app'

defineBlock({
  ui: {
    icon: 'text-wrap-disabled',
    label: ({ __ }) => __('pruvious-dashboard', 'List item'),
  },
})

defineProps({
  text: richTextField({
    marks: {
      ...commonMarks,
      customMark: {
        tag: 'span',
        attrs: { class: 'custom-mark' },
        shortcut: 'Mod-Shift-m',
        icon: 'star-half-filled',
        label: 'Custom mark (with label)',
        dashboardStyle: { 'background-color': 'black', 'color': 'cyan' },
      },
      customMark2: {
        tag: 'span',
        attrs: { class: 'custom-mark-2' },
        shortcut: 'Mod-Shift-n',
        icon: 'star-filled',
        dashboardStyle: {
          backgroundColor: 'hsl(var(--pui-accent))',
          color: 'hsl(var(--pui-accent-foreground))',
          padding: '0.125rem 0.25rem',
          borderRadius: '0.25rem',
        },
      },
    },
    ui: {
      liveEditor: {
        deleteBlockWhenEmpty: true,
        mergeGroups: ['prose'],
        toolbar: [
          {
            icon: 'star',
            items: ['mark:customMark', 'mark:customMark2'],
            tooltip: ({ __ }) => __('pruvious-dashboard', 'My bookmarks'),
          },
          'mark:customMark',
          'mark:customMark2',
          'mark:bold',
          'clearFormatting',
        ],
      },
    },
  }),
})
</script>
