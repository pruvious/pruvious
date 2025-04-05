<template>
  <div class="pui-truncate">
    <span :title="formatted">
      {{ formatted }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { dayjsConfig, dayjsUTC } from '#pruvious/client/dayjs'
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
    type: Object as PropType<SerializableFieldOptions<'time'>>,
    required: true,
  },
})

const { timeFormat } = dayjsConfig()
const formatted = computed(() => dayjsUTC(props.modelValue).format(timeFormat))
</script>
