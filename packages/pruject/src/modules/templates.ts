export const pruviousBlockTemplate = `import { Block } from '@pruvious/cms'

export default async (): Promise<Block> => ({
  name: 'BlockName',
  fields: [],
})
`

export const nuxtBlockTemplate = `<template></template>

<script lang="ts" setup>
defineProps({})
</script>
`
