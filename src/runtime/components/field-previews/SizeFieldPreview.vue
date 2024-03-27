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
import type { FieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { titleCase } from '../../utils/string'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: Object as PropType<Record<string, { value: number; unit?: string }>>,
  },
  options: {
    type: Object as PropType<FieldOptions['size']>,
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
    displayedValue.value = Object.entries(props.value ?? {})
      .map(
        ([key, input]) =>
          __('pruvious-dashboard', (props.options.inputs![key].label ?? titleCase(key)) as any) +
          `: ${input.value}` +
          (input.unit ?? ''),
      )
      .join(', ')
  },
  { immediate: true },
)
</script>
