<template>
  <div class="pui-truncate">
    <span :title="modelValue">{{ modelValue === '' || modelValue === null ? '-' : modelValue }}</span>
  </div>
</template>

<script lang="ts" setup>
defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: null as unknown as PropType<any>,
  },
})
</script>
