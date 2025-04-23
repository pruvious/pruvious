<template>
  <div></div>
</template>

<script lang="ts" setup>
import { blocksField, defineBlock, recordField } from '#pruvious/client'

defineBlock({
  group: 'test',
})

defineProps({
  slot: blocksField({}),
  page: recordField({ collection: 'Pages', fields: ['blocks'], populate: true }),
})
</script>
