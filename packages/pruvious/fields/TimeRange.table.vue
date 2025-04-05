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
    type: Array as unknown as PropType<[number, number]>,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'timeRange'>>,
    required: true,
  },
})

const { timeFormat } = dayjsConfig()
const msFrom = computed(() => (props.modelValue?.[0] ?? 0) * 1000)
const msTo = computed(() => (props.modelValue?.[1] ?? 0) * 1000)
const formattedFrom = computed(() => dayjsUTC(msFrom.value).format(timeFormat))
const formattedTo = computed(() => dayjsUTC(msTo.value).format(timeFormat))
const formatted = computed(() => `${formattedFrom.value} - ${formattedTo.value}`)
</script>
