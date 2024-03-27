<template>
  <div class="flex w-full flex-col items-start gap-1">
    <div v-if="options.label || options.description" class="flex w-full items-end justify-between gap-4">
      <div
        v-if="options.label"
        @click="onClickLabel()"
        @mouseenter="labelHovered = true"
        @mouseleave="labelHovered = false"
        class="flex cursor-default gap-1 whitespace-nowrap text-vs font-medium text-gray-900"
      >
        <span v-if="options.required" :title="__('pruvious-dashboard', 'Required')" class="text-red-500">*</span>
        <span>
          {{ __('pruvious-dashboard', options.label as any) }}
        </span>
      </div>

      <PruviousIconHelp
        v-if="options.description"
        v-pruvious-tooltip="__('pruvious-dashboard', options.description as any)"
        class="mb-0.5 h-4 w-4 shrink-0 text-gray-400"
      />
    </div>

    <div
      @keydown.left="selectPrev()"
      @keydown.right="selectNext()"
      ref="containerEl"
      class="flex h-9 max-w-full overflow-hidden rounded-md border bg-white p-1 transition focus-within:border-primary-700 focus-within:ring"
      :class="{
        'border-primary-700': labelHovered && !disabled,
        'hover:border-primary-700': !disabled,
      }"
    >
      <button
        v-for="choice of choices"
        :data-ignore-autofocus="ignoreAutofocus ? '' : undefined"
        :disabled="disabled"
        :tabindex="choice.value === modelValue ? -1 : 0"
        :title="choice.label"
        @click="$emit('update:modelValue', choice.value)"
        type="button"
        class="truncate rounded px-2 text-sm outline-none"
        :class="{
          'active bg-primary-700 text-white disabled:bg-primary-400': choice.value === modelValue,
          'focus-visible:bg-primary-50 disabled:text-gray-400': choice.value !== modelValue,
        }"
      >
        <span>{{ choice.label }}</span>
      </button>
    </div>

    <input :id="id" :name="name" :value="modelValue" hidden type="hidden" />

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import type { StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { next, prev } from '../../utils/array'
import type { Choice } from './SelectField.vue'

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: string | null

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['button-group']

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
  'update:modelValue': [string | null]
}>()

const choices = ref<Choice[]>([])
const containerEl = ref<HTMLDivElement>()
const id = pruviousUnique('button-group-field')
const labelHovered = ref<boolean>(false)
const name = props.options.name || pruviousUnique(props.fieldKey || 'button-group-field')

const PruviousInputError = dashboardMiscComponent.InputError()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.options.choices,
  () => {
    choices.value = Object.entries(props.options.choices).map(([value, label]) => ({
      value,
      label: __('pruvious-dashboard', label as any),
    }))
  },
  { immediate: true },
)

function onClickLabel() {
  if (!props.disabled) {
    const buttons = Array.from(containerEl.value!.children) as HTMLButtonElement[]
    const active = buttons.find((button) => button.classList.contains('active'))

    if (active) {
      active.focus()
    } else if (buttons.length) {
      buttons[0].focus()
    }
  }
}

function selectPrev() {
  const newChoice = prev({ value: props.modelValue, label: '' }, choices.value, 'value')!

  if (newChoice?.value !== props.modelValue) {
    emit('update:modelValue', newChoice.value)
  }
}

function selectNext() {
  const newChoice = next({ value: props.modelValue, label: '' }, choices.value, 'value')!

  if (newChoice?.value !== props.modelValue) {
    emit('update:modelValue', newChoice.value)
  }
}
</script>
