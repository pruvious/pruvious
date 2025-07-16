<template>
  <div>
    <PruviousEditableText field="text" tag="p" class="p" />
  </div>
</template>

<script lang="ts" setup>
import { defineBlock, textField } from '#pruvious/client'

defineBlock({
  ui: {
    icon: 'box',
    itemLabelConfiguration: {
      fieldValue: 'text',
      showBlockLabel: false,
    },
  },
})

defineProps({
  text: textField({
    ui: {
      placeholder: 'Enter text here...',
    },
  }),
})
</script>

<style scoped>
div {
  padding: 0.5rem;
  background-color: #ccc;
  font-family: Arial, Helvetica, sans-serif;
}

p {
  margin: 0;
}
</style>
