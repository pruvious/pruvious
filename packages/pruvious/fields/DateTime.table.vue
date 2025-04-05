<template>
  <div class="pui-truncate">
    <span v-pui-tooltip.nomd="options.ui.relativeTime ? absolute : relative">
      {{ (options.ui.relativeTime ? relative : absolute) ?? '-' }}
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
    type: [Number, null],
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'dateTime'>>,
    required: true,
  },
})

const absolute = computed(() =>
  isNull(props.modelValue) || isUndefined(props.modelValue) ? undefined : formatter(props.modelValue, false),
)
const relative = computed(() =>
  isNull(props.modelValue) || isUndefined(props.modelValue) ? undefined : formatter(props.modelValue, true),
)

function formatter(timestamp: number, relative: boolean): string {
  const { dayjs, language, dateFormat, timeFormat } = dayjsConfig()
  const timezone = dayjsResolveTimezone(props.options.ui.timezone)
  const date = dayjs(timestamp).tz(timezone).locale(language)
  return relative ? date.tz().fromNow() : date.format(`${dateFormat} ${timeFormat}`)
}
</script>
