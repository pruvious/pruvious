<template>
  <div class="pui-truncate">
    <span :title="formatted">
      {{ formatted ?? '-' }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { dayjs, dayjsFormatDate, dayjsFormatDateTime } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import { isNull } from '@pruvious/utils'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: [Array, null] as unknown as PropType<[number, number] | null>,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'dateTimeRange'>>,
    required: true,
  },
})

const dateFrom = dayjs(props.modelValue?.[0])
const dateTo = dayjs(props.modelValue?.[1])
const formatted = isNull(props.modelValue)
  ? undefined
  : props.options.ui.withTime
    ? dayjsFormatDateTime(dateFrom) + ' - ' + dayjsFormatDateTime(dateTo)
    : dayjsFormatDate(dateFrom) + ' - ' + dayjsFormatDate(dateTo)
</script>
