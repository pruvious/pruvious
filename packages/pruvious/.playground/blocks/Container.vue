<template>
  <div class="container" :class="`container-spacing-${spacing}`">{{ test }}</div>
</template>

<script lang="ts" setup>
import { blocksField, buttonGroupField } from '#pruvious/client'

defineProps({
  spacing: buttonGroupField({
    choices: [
      { value: 'sm', label: ({ __ }) => __('pruvious-dashboard', 'Small') },
      { value: 'md', label: ({ __ }) => __('pruvious-dashboard', 'Medium') },
      { value: 'lg', label: ({ __ }) => __('pruvious-dashboard', 'Large') },
    ],
    default: 'md',
  }),
  blocks: blocksField({
    allowRootBlocks: ['Button', 'Container', 'group:test', 'tag:test'],
    allowNestedBlocks: ['Button', 'Image'],
  }),
})

const test = ref('Hello, world!')
</script>

<style scoped>
.container-spacing-sm {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.container-spacing-md {
  padding-top: 4rem;
  padding-bottom: 4rem;
}

.container-spacing-lg {
  padding-top: 6rem;
  padding-bottom: 6rem;
}
</style>
