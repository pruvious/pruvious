<template>
  <div class="pui-truncate">
    <span :title="String(modelValue)">{{ formattedValue }}</span>
  </div>
</template>

<script lang="ts" setup>
import type { SerializableFieldOptions } from '#pruvious/server'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Number,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'number'>>,
    required: true,
  },
})

const formattedValue = computed(() => {
  let value = String(props.modelValue)

  if (props.options.decimalPlaces) {
    value = Number(value).toFixed(props.options.decimalPlaces)
  }

  if (props.options.ui?.suffix) {
    value += ' ' + props.options.ui.suffix
  }

  return value
})
</script>
