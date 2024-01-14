<template></template>

<script lang="ts" setup>
// @ts-ignore
import { defineBlock, recordField } from '#pruvious'

defineBlock({
  description: 'This block is swapped with blocks from the selected preset.',
})

defineProps({
  preset: recordField({
    collection: 'presets',
    fields: { blocks: true },
    populate: true,
    required: true,
    label: 'Preset',
    description: 'This block is swapped with blocks from the selected preset.',
    placeholder: 'Select a preset',
  }),
})
</script>
