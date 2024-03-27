<template>
  <PruviousStringFieldPreview
    :canUpdate="canUpdate"
    :name="name"
    :options="options"
    :value="formattedValue0 || formattedValue1 ? `${formattedValue0 || '?'} - ${formattedValue1 || '?'}` : ''"
    @refresh="$emit('refresh')"
  />
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { useUser } from '../../composables/user'
import { isNull } from '../../utils/common'
import { dayjs } from '../../utils/dashboard/dayjs'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Array as unknown as PropType<[number | null, number | null]>,
  },
  options: {
    type: Object,
    required: true,
  },
  canUpdate: {
    type: Boolean,
    default: false,
  },
  record: {
    type: Object as PropType<Record<string, any>>,
  },
  language: {
    type: String,
  },
})

defineEmits<{
  refresh: []
}>()

const user = useUser()

const format = user.value ? `${user.value.dateFormat} ${user.value.timeFormat}` : 'YYYY-MM-DD HH:mm:ss'
const formattedValue0 = ref<string | null>('')
const formattedValue1 = ref<string | null>('')

const PruviousStringFieldPreview = dashboardMiscComponent.StringFieldPreview()

watch(
  () => props.value,
  () => {
    formattedValue0.value = !props.value || isNull(props.value[0]) ? null : dayjs(props.value[0]).format(format)
    formattedValue1.value = !props.value || isNull(props.value[1]) ? null : dayjs(props.value[1]).format(format)
  },
  { immediate: true },
)
</script>
