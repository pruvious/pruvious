<template>
  <div class="pui-truncate">
    <span v-pui-tooltip.nomd="options.ui.relativeTime ? formattedDate : relativeTime">
      {{ (options.ui.relativeTime ? relativeTime : formattedDate) ?? '-' }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { dayjs, dayjsFormatDate, dayjsFormatDateTime, dayjsRelative } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import { isNull } from '@pruvious/utils'

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
    type: Object as PropType<SerializableFieldOptions<'dateTime'>>,
    required: true,
  },
})

const date = dayjs(props.modelValue)
const formattedDate = isNull(props.modelValue)
  ? undefined
  : props.options.withTime
    ? dayjsFormatDateTime(date)
    : dayjsFormatDate(date)
const relativeTime = isNull(props.modelValue) ? undefined : dayjsRelative(date)
</script>
