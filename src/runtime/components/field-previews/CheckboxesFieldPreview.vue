<template>
  <PruviousStringFieldPreview
    :canUpdate="canUpdate"
    :name="name"
    :options="options"
    :value="displayedValue"
    @refresh="$emit('refresh')"
  />
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Array<string>,
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

const displayedValue = ref<string>('')

const PruviousStringFieldPreview = dashboardMiscComponent.StringFieldPreview()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.value,
  () => {
    displayedValue.value =
      props.value?.map((v) => __('pruvious-dashboard', props.options.choices[v] as any)).join(', ') ?? ''
  },
  { immediate: true },
)
</script>
