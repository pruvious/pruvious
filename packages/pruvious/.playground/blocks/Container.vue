<template>
  <div class="container" :class="`container-spacing-${spacing}`">{{ test }}</div>
</template>

<script lang="ts" setup>
import { _, buttonGroupField } from '#pruvious/client'

defineProps({
  spacing: buttonGroupField({
    choices: [
      { value: 'sm', label: _('Small') },
      { value: 'md', label: _('Medium') },
      { value: 'lg', label: _('Large') },
    ],
    default: 'md',
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
