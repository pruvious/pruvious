<template>
  <div class="pui-truncate">
    <span :title="formatted">
      {{ formatted ?? '-' }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { dayjsConfig, dayjsResolveTimezone } from '#pruvious/client/dayjs'
import type { SerializableFieldOptions } from '#pruvious/server'
import { isNull, isUndefined } from '@pruvious/utils'

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

const formatted = computed(() =>
  isNull(props.modelValue) || isUndefined(props.modelValue)
    ? undefined
    : `${formatter(props.modelValue[0])} - ${formatter(props.modelValue[1])}`,
)

function formatter(timestamp: number): string {
  const { dayjs, language, dateFormat, timeFormat } = dayjsConfig()
  const timezone = dayjsResolveTimezone(props.options.ui.timezone)
  const date = dayjs(timestamp).tz(timezone).locale(language)
  return date.format(`${dateFormat} ${timeFormat}`)
}
</script>
