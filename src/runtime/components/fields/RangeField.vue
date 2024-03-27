<template>
  <div class="relative flex w-full flex-col items-start gap-1">
    <div v-if="options.label || options.description" class="flex w-full items-end justify-between gap-4">
      <label
        v-if="options.label"
        :for="`${id}-0`"
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
      class="relative flex h-9 w-full rounded-md border bg-white text-sm transition hover:border-primary-700"
      :class="{
        'border-primary-700': (labelHovered || focused) && !disabled,
        'ring': focused,
        'pointer-events-none': disabled,
      }"
    >
      <div class="flex flex-1 divide-x">
        <div
          v-for="i in 2"
          class="flex flex-1 items-center"
          :class="{
            'pr-2': i === 1,
            'pl-2': i === 2,
          }"
        >
          <span
            v-if="options.prefix && (typeof options.prefix === 'string' || typeof options.prefix[i - 1] === 'string')"
            class="whitespace-nowrap pl-2.5 pt-px text-xs font-medium"
            :class="{ 'text-gray-400': disabled }"
          >
            {{ typeof options.prefix === 'string' ? options.prefix : options.prefix[i - 1] }}
          </span>

          <input
            :data-ignore-autofocus="ignoreAutofocus ? '' : undefined"
            :disabled="disabled"
            :id="`${id}-${i - 1}`"
            :max="options.max ?? Number.MAX_SAFE_INTEGER"
            :min="options.min ?? Number.MIN_SAFE_INTEGER"
            :name="name[i - 1]"
            :placeholder="__('pruvious-dashboard', (typeof options.placeholder === 'object' ? options.placeholder[i - 1] : options.placeholder) as any)"
            :step="options.step ?? 1"
            :value="values[i - 1]"
            @blur="
              ;(focused = false),
                $emit(
                  'update:modelValue',
                  i === 2
                    ? [props.modelValue[0], +($event.target as HTMLInputElement).value]
                    : [+($event.target as HTMLInputElement).value, props.modelValue[1]],
                )
            "
            @focus="focused = true"
            @input="emitIfNumeric((i - 1) as any, $event)"
            @keydown="onKeyDown((i - 1) as any, $event)"
            type="number"
            class="h-full w-full truncate bg-transparent px-2.5 text-sm outline-none transition placeholder:text-gray-300"
            :class="{ 'text-gray-400': disabled }"
          />

          <span
            v-if="options.suffix && (typeof options.suffix === 'string' || typeof options.suffix[i - 1] === 'string')"
            class="whitespace-nowrap pr-2.5 pt-px text-xs font-medium"
            :class="{ 'text-gray-400': disabled }"
          >
            {{ options.suffix === 'string' ? options.suffix : options.suffix[i - 1] }}
          </span>
        </div>
      </div>

      <div
        class="absolute left-1/2 top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white"
      >
        <PruviousIconArrowsHorizontal class="m-auto h-3 w-3" />
      </div>
    </div>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import { type StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import 'vue-slider-component/theme/antd.css'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { numericSanitizer } from '../../sanitizers/numeric'
import { isArray } from '../../utils/array'
import { isDefined } from '../../utils/common'
import { isRealNumber } from '../../utils/number'

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: [number, number]

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['range']

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
  'update:modelValue': [[number, number]]
}>()

const focused = ref<boolean>(false)
const id = pruviousUnique('range-field')
const labelHovered = ref<boolean>(false)
const name = [
  pruviousUnique(
    (isArray(props.options.name) ? props.options.name[0] : props.options.name) || props.fieldKey || 'range-field',
  ),
  pruviousUnique(
    (isArray(props.options.name) ? props.options.name[1] : props.options.name) || props.fieldKey || 'range-field',
  ),
]
const values = ref<[string, string]>(['', ''])

const PruviousInputError = dashboardMiscComponent.InputError()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.modelValue,
  () => {
    values.value = [props.modelValue[0]?.toString() ?? '', props.modelValue[1]?.toString() ?? '']
  },
  { immediate: true },
)

function onKeyDown(pos: 0 | 1, event: KeyboardEvent) {
  const prevValue = props.modelValue[pos]
  let newValue: number | undefined

  if (event.key === 'ArrowUp' && event.shiftKey) {
    event.preventDefault()
    newValue = Math.min(props.options.max ?? Number.MAX_SAFE_INTEGER, props.modelValue[pos] + 10)
  } else if (event.key === 'ArrowDown' && event.shiftKey) {
    event.preventDefault()
    newValue = Math.max(props.options.min ?? Number.MIN_SAFE_INTEGER, props.modelValue[pos] - 10)
  }

  if (isDefined(newValue) && prevValue !== newValue) {
    emit('update:modelValue', pos === 0 ? [newValue, props.modelValue[1]] : [props.modelValue[0], newValue])
  }
}

function emitIfNumeric(pos: 0 | 1, event: Event) {
  const inputValue = (event.target as HTMLInputElement).value
  values.value[pos] = inputValue
  const numberValue = numericSanitizer({ value: inputValue })

  if (inputValue !== '' && isRealNumber(numberValue)) {
    emit('update:modelValue', pos === 0 ? [numberValue, props.modelValue[1]] : [props.modelValue[0], numberValue])
  }
}
</script>
