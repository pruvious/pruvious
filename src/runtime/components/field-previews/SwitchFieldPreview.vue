<template>
  <PruviousStringFieldPreview
    :canUpdate="canUpdate"
    :name="name"
    :options="options"
    :value="displayed"
    @refresh="$emit('refresh')"
  />
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import type { FieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Boolean,
  },
  options: {
    type: Object as PropType<FieldOptions['switch']>,
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

const displayed = ref('')

const PruviousStringFieldPreview = dashboardMiscComponent.StringFieldPreview()

watch(
  () => props.value,
  () => {
    displayed.value = props.value
      ? __('pruvious-dashboard', props.options.trueLabel as any)
      : __('pruvious-dashboard', props.options.falseLabel as any)
  },
  { immediate: true },
)

await loadTranslatableStrings('pruvious-dashboard')
</script>
