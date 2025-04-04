<template>
  <div class="pui-truncate">
    <span v-pui-tooltip.nomd="options.ui.relativeTime ? formattedDate : relativeTime">
      {{ options.ui.relativeTime ? relativeTime : formattedDate }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { dayjs, dayjsFormatDateTime, dayjsRelative } from '#pruvious/client'
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
    type: Object as PropType<SerializableFieldOptions<'timestamp'>>,
    required: true,
  },
})

const date = computed(() => dayjs(props.modelValue))
const formattedDate = computed(() => dayjsFormatDateTime(date.value))
const relativeTime = computed(() => dayjsRelative(date.value))
</script>
