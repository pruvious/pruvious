<template>
  <slot v-if="active === name" />
</template>

<script lang="ts" setup>
defineProps({
  /**
   * Unique identifier for the tab item.
   */
  name: {
    type: [Number, String],
    required: true,
  },
})

const active = inject<Ref<number | string | undefined>>('active')
</script>
