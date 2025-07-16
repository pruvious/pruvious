<template>
  <pre>{{ page || 'empty' }}</pre>
</template>

<script lang="ts" setup>
import { blocksField, defineBlock, recordField } from '#pruvious/client'

defineBlock({
  group: 'test',
})

defineProps({
  slot: blocksField({}),
  page: recordField({ collection: 'Pages', fields: ['id', 'subpath', 'seo'] }),
})
</script>
