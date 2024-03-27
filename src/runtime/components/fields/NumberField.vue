<template>
  <div class="relative flex w-full flex-col items-start gap-1">
    <div v-if="options.label || options.description" class="flex w-full items-end justify-between gap-4">
      <label
        v-if="options.label"
        :for="id"
        @mouseenter="labelHovered = true"
        @mouseleave="labelHovered = false"
        class="flex gap-1 whitespace-nowrap text-vs font-medium text-gray-900"
      >
        <span v-if="options.required" :title="__('pruvious-dashboard', 'Required')" class="text-red-500">*</span>
        <span>{{ __('pruvious-dashboard', options.label as any) }}</span>
      </label>

      <PruviousIconHelp
        v-if="options.description"
        v-pruvious-tooltip="__('pruvious-dashboard', options.description as any)"
        class="mb-0.5 h-4 w-4 shrink-0 text-gray-400"
      />
    </div>

    <div
      class="relative flex h-9 w-full items-center rounded-md border bg-white text-sm transition hover:border-primary-700"
      :class="{
        'border-primary-700': (labelHovered || focused) && !disabled,
        'ring': focused,
        'pointer-events-none': disabled,
      }"
    >
      <span
        v-if="options.prefix"
        class="whitespace-nowrap pl-2.5 pt-px text-xs font-medium"
        :class="{ 'text-gray-400': disabled }"
      >
        {{ options.prefix }}
      </span>

      <input
        :data-ignore-autofocus="ignoreAutofocus ? '' : undefined"
        :disabled="disabled"
        :id="id"
        :max="options.max ?? Number.MAX_SAFE_INTEGER"
        :min="options.min ?? Number.MIN_SAFE_INTEGER"
        :name="name"
        :placeholder="__('pruvious-dashboard', options.placeholder as any)"
        :step="options.step ?? 1"
        :value="value"
        @blur=";(focused = false), $emit('update:modelValue', +($event.target as HTMLInputElement).value)"
        @focus="focused = true"
        @input="emitIfNumeric"
        @keydown="onKeyDown"
        type="number"
        class="h-full w-full truncate bg-transparent px-2.5 text-sm outline-none transition placeholder:text-gray-300"
        :class="{ 'text-gray-400': disabled }"
      />

      <span
        v-if="options.suffix"
        class="whitespace-nowrap pr-2.5 pt-px text-xs font-medium"
        :class="{ 'text-gray-400': disabled }"
      >
        {{ options.suffix }}
      </span>
    </div>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import { type StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { numericSanitizer } from '../../sanitizers/numeric'
import { isDefined } from '../../utils/common'
import { isRealNumber } from '../../utils/number'

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: number

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['number']

  /**
   * Represents the unique identifier of the field within the form.
   * If not provided, a unique identifier will be automatically generated.
   */
  fieldKey?: string

  /**
   * Represents a dictionary of all errors, where the key is the complete field name and the value is the associated error message.
   * The field name is represented in dot-notation (e.g., `repeater.0.subfieldName`).
   */
  errors?: Record<string, string>

  /**
   * Indicates whether the field is disabled.
   * By default, the field is enabled.
   */
  disabled?: boolean

  /**
   * When set to `true`, the field will won't autofocus in popups.
   */
  ignoreAutofocus?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [number]
}>()

const focused = ref<boolean>(false)
const id = pruviousUnique('number-field')
const labelHovered = ref<boolean>(false)
const name = props.options.name || pruviousUnique(props.fieldKey || 'number-field')
const value = ref<string>('')

const PruviousInputError = dashboardMiscComponent.InputError()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.modelValue,
  () => {
    value.value = props.modelValue?.toString() ?? ''
  },
  { immediate: true },
)

function onKeyDown(event: KeyboardEvent) {
  const prevValue = props.modelValue
  let newValue: number | undefined

  if (event.key === 'ArrowUp' && event.shiftKey) {
    event.preventDefault()
    newValue = Math.min(props.options.max ?? Number.MAX_SAFE_INTEGER, props.modelValue + 10)
  } else if (event.key === 'ArrowDown' && event.shiftKey) {
    event.preventDefault()
    newValue = Math.max(props.options.min ?? Number.MIN_SAFE_INTEGER, props.modelValue - 10)
  }

  if (isDefined(newValue) && prevValue !== newValue) {
    emit('update:modelValue', newValue)
  }
}

function emitIfNumeric(event: Event) {
  const inputValue = (event.target as HTMLInputElement).value
  value.value = inputValue
  const numberValue = numericSanitizer({ value: inputValue })

  if (inputValue !== '' && isRealNumber(numberValue)) {
    emit('update:modelValue', numberValue)
  }
}
</script>
