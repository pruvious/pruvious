<template>
  <div class="pui-truncate">
    <code :title="formatted">
      {{ formatted }}
    </code>
  </div>
</template>

<script lang="ts" setup>
import type { SerializableFieldOptions } from '#pruvious/server'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Array as unknown as PropType<Record<string, any>[]>,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'repeater'>>,
    required: true,
  },
})

const formatted = computed(() => JSON.stringify(props.modelValue))
</script>

<style scoped>
code {
  font-family: var(--pui-font-mono);
  font-size: calc(1em - 0.0625rem);
}
</style>
