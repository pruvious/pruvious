<template>
  <div
    class="max-w-full flex-1"
    :class="{
      'w-full': compact,
      'p-4': !compact,
    }"
  >
    <component
      :disabled="disabled"
      :errors="errors"
      :fieldKey="fieldName"
      :is="TextField"
      :modelValue="record[fieldName]"
      :name="fieldName"
      :options="(collection.fields[fieldName].options as any)"
      @update:modelValue="updatePreview($event), $emit('update:record', { ...record, [fieldName]: $event })"
    />

    <p v-if="preview" class="flex gap-1 truncate pt-1.5 text-vs">
      <strong class="text-gray-500">{{ __('pruvious-dashboard', 'Preview') }}:</strong>
      <span class="truncate text-gray-400">{{ preview }}</span>
    </p>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import { textFieldComponent } from '#pruvious/dashboard'
import { useIntervalFn } from '@vueuse/core'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { dayjs } from '../../utils/dashboard/dayjs'

const props = defineProps<{
  record: Record<string, any>
  fieldName: string
  errors: Record<string, string>
  compact: boolean
  disabled: boolean
  interval?: number
}>()

defineEmits<{
  'update:record': [Record<string, any>]
}>()

const dashboard = usePruviousDashboard()

const collection = dashboard.value.collections[dashboard.value.collection!]
const preview = ref('')

const TextField = textFieldComponent()

await loadTranslatableStrings('pruvious-dashboard')

watch(() => props.record[props.fieldName], updatePreview, { immediate: true })

if (props.interval) {
  useIntervalFn(() => updatePreview(props.record[props.fieldName]), props.interval)
}

function updatePreview(value: string) {
  preview.value = dayjs().format(value)
}
</script>
