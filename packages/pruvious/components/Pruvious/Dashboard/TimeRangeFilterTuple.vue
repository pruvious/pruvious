<template>
  <PUITimeRange
    :id="id"
    :labels="labels"
    :modelValue="sanitized"
    :name="id"
    :showSeconds="options.ui.showSeconds"
    @commit="$emit('commit', { ...modelValue, value: prepareEmitValue($event) })"
    @update:modelValue="$emit('update:modelValue', { ...modelValue, value: prepareEmitValue($event) })"
  />
</template>

<script lang="ts" setup>
import { __, type WhereField } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUITimeLabels } from '@pruvious/ui/components/PUITime.vue'
import { castToNumber, isArray, isInteger, isString } from '@pruvious/utils'

const props = defineProps({
  /**
   * The current where condition.
   */
  modelValue: {
    type: Object as PropType<WhereField>,
    required: true,
  },

  /**
   * The combined field options defined in a collection.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'timeRange'>>,
    required: true,
  },
})

const emit = defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const labels: PUITimeLabels = {
  hoursSuffix: __('pruvious-dashboard', 'timeSuffix:h'),
  minutesSuffix: __('pruvious-dashboard', 'timeSuffix:m'),
  secondsSuffix: __('pruvious-dashboard', 'timeSuffix:s'),
}
const sanitized = computed<[number, number]>(() => {
  const v = props.modelValue.value

  if (isString(v)) {
    const [from, to] = v.split(',')
    const fromCasted = castToNumber(from?.replace('[', ''))
    const toCasted = castToNumber(to?.replace(']', ''))
    return isInteger(fromCasted) && isInteger(toCasted) ? [fromCasted, toCasted] : [0, 86399000]
  } else if (isArray(v)) {
    const fromCasted = castToNumber(v[0])
    const toCasted = castToNumber(v[1])
    return isInteger(fromCasted) && isInteger(toCasted) ? [fromCasted, toCasted] : [0, 86399000]
  } else if (isInteger(v)) {
    return [v, 86399000]
  }

  return [0, 86399000]
})

emit('commit', { ...props.modelValue, value: prepareEmitValue(sanitized.value) })

function prepareEmitValue(value: [number, number]): string {
  return JSON.stringify(value)
}
</script>
