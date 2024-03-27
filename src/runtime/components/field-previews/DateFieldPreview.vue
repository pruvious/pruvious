<template>
  <PruviousStringFieldPreview
    :canUpdate="canUpdate"
    :name="name"
    :options="options"
    :value="formattedValue"
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
    type: Number as PropType<number | null>,
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

const format = user.value ? user.value.dateFormat : 'YYYY-MM-DD'
const formattedValue = ref('')

const PruviousStringFieldPreview = dashboardMiscComponent.StringFieldPreview()

watch(
  () => props.value,
  () => {
    formattedValue.value = isNull(props.value) ? '' : dayjs(props.value).format(format)
  },
  { immediate: true },
)
</script>
