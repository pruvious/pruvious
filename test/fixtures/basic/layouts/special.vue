<template></template>

<script lang="ts" setup>
import { defineLayout } from '#pruvious'

defineLayout({
  label: 'Special layout',
  allowedBlocks: ['ConditionalLogic', 'Container', 'Preset'],
  allowedRootBlocks: ['Container'],
})
</script>
