<template>
  <div class="pui-truncate">
    <span :title="formatted">
      {{ formatted ?? '-' }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { dayjsConfig } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import { isNumber } from '@pruvious/utils'

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
    type: Object as PropType<SerializableFieldOptions<'date'>>,
    required: true,
  },
})

const formatted = computed(() => (isNumber(props.modelValue) ? formatter(props.modelValue) : undefined))

function formatter(timestamp: number): string {
  const { dayjs, language, dateFormat } = dayjsConfig()
  return dayjs.utc(timestamp).locale(language).format(dateFormat)
}
</script>
