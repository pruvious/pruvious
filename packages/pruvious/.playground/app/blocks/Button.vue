<template>
  <button>{{ label }}</button>
</template>

<script lang="ts" setup>
import { defineBlock, textField } from '#pruvious/client'

defineBlock({
  ui: {
    itemLabelConfiguration: {
      fieldValue: 'label',
    },
  },
})

defineProps({
  label: textField({ required: true }),
})
</script>
