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

    <div class="relative w-full rounded-md text-sm" :class="{ 'pointer-events-none': disabled }">
      <div
        class="flex overflow-hidden rounded-md border bg-white transition"
        :class="{
          'focus-within:border-primary-700 focus-within:ring': !disabled,
          'border-primary-700': labelHovered && !disabled,
          'after:h-full after:w-2.5 hover:border-primary-700': !options.wrap,
        }"
      >
        <textarea
          v-model="input"
          :data-ignore-autofocus="ignoreAutofocus ? '' : undefined"
          :disabled="disabled"
          :id="id"
          :name="name"
          :placeholder="__('pruvious-dashboard', options.placeholder as any)"
          :spellcheck="options.spellcheck || 'false'"
          @blur="onChange()"
          @input="onChange()"
          @keydown.escape="blurActiveElement()"
          @update:modelValue="onChange()"
          ref="textarea"
          class="block w-full resize-none bg-transparent px-2.5 py-[0.4375rem] outline-none placeholder:text-gray-300"
          :class="{
            'whitespace-pre': !options.wrap,
            'text-gray-400': disabled,
          }"
        />
      </div>
    </div>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import type { StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { useTextareaAutosize } from '@vueuse/core'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { blurActiveElement } from '../../utils/dom'

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: string

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['text-area']

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

  /**
   * The number of visible suggestions in the dropdown list (must be less than 30).
   *
   * @default 6
   */
  visibleSuggestions?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [string]
}>()

const { textarea, input } = useTextareaAutosize()

const id = pruviousUnique('text-area-field')
const labelHovered = ref<boolean>(false)
const name = props.options.name || pruviousUnique(props.fieldKey || 'text-area-field')

const PruviousInputError = dashboardMiscComponent.InputError()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.modelValue,
  () => {
    input.value = props.modelValue
  },
  { immediate: true },
)

function onChange() {
  emit('update:modelValue', input.value)
}
</script>
