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
    ui: {
      liveEditor: {
        deleteBlockWhenEmpty: true,
        mergeGroups: ['prose'],
      },
    },
  }),
})
</script>
