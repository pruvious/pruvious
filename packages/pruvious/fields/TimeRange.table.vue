<template>
  <div class="pui-truncate">
    <span :title="formatted">
      {{ formatted ?? '-' }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { dayjsUTC, getUser } from '#pruvious/client'
import { type SerializableFieldOptions } from '#pruvious/server'

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

const user = getUser()
const msFrom = (props.modelValue?.[0] ?? 0) * 1000
const msTo = (props.modelValue?.[1] ?? 0) * 1000
const formattedFrom = user ? dayjsUTC(msFrom).format(user.timeFormat) : dayjsUTC(msFrom).format('LTS')
const formattedTo = user ? dayjsUTC(msTo).format(user.timeFormat) : dayjsUTC(msTo).format('LTS')
const formatted = `${formattedFrom} - ${formattedTo}`
</script>
