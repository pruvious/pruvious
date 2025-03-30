<template>
  <div class="pui-truncate">
    <span :title="formatted">
      {{ formatted }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { dayjsUTC, getUser } from '#pruvious/client'
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

const user = getUser()
const ms = (props.modelValue ?? 0) * 1000
const formatted = user ? dayjsUTC(ms).format(user.timeFormat) : dayjsUTC(ms).format('LTS')
</script>
