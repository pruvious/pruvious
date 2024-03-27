<template>
  <div class="relative flex w-full flex-col items-start gap-1">
    <div v-if="options.label || options.description" class="flex w-full items-end justify-between gap-4">
      <label
        v-if="options.label"
        :for="`${id}-${inputs[0]?.name}`"
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

    <div class="flex w-full gap-2" :class="{ 'h-9 ': !compact }">
      <div
        class="relative flex flex-1 rounded-md border bg-white transition"
        :class="{
          'focus-within:border-primary-700 focus-within:ring hover:border-primary-700': !disabled,
          'border-primary-700': labelHovered,
          'flex-wrap': compact,
          'divide-x': !compact,
        }"
      >
        <div
          v-for="input of inputs"
          class="relative flex flex-1 items-center px-2.5"
          :class="{ 'h-8.5 min-w-full border-t first:border-none': compact }"
        >
          <label :for="`${id}-${input.name}`" class="flex h-full items-center">
            <span class="pt-px text-xs font-medium">
              {{ input.label }}
            </span>
          </label>

          <input
            :data-ignore-autofocus="ignoreAutofocus ? '' : undefined"
            :disabled="disabled"
            :id="`${id}-${input.name}`"
            :max="input.max"
            :min="input.min"
            :name="`${name}.${input.name}.value`"
            :placeholder="input.placeholder"
            :value="modelValue[input.name].value?.toString()"
            @blur=";(focused = false), updateValue(input.name, +($event.target as HTMLInputElement).value)"
            @focus="focused = true"
            @input="onUpdateInputValue(input.name, $event)"
            @keydown="onKeyDown(input.name, $event)"
            type="number"
            class="h-full w-full min-w-12 truncate bg-transparent pl-2.5 text-sm outline-none transition placeholder:text-gray-300"
            :class="{ 'text-gray-400': disabled }"
          />

          <div v-if="input.units.length" class="relative h-full flex-1 pl-2.5" :class="{ 'w-full': compact }">
            <select
              v-model="modelValue[input.name].unit"
              :disabled="disabled || input.units.length === 1"
              :id="`${id}-${input.name}.unit`"
              :name="`${name}.${input.name}.unit`"
              @update:modelValue="
                emit('update:modelValue', {
                  ...modelValue,
                  [input.name]: { ...modelValue[input.name], unit: $event },
                }),
                  console.log($event)
              "
              class="focus h-full appearance-none text-sm outline-none focus-visible:text-primary-700 disabled:text-gray-400"
              :class="{ 'pr-4': input.units.length > 1 }"
            >
              <option v-for="unit of input.units" :value="unit">{{ unit }}</option>
            </select>

            <PruviousIconChevronDown
              v-if="input.units.length > 1"
              class="pointer-events-none absolute -right-1 top-1/2 h-4 w-4 -translate-y-1/2"
            />
          </div>
        </div>
      </div>

      <button
        v-if="options.syncable && !disabled"
        v-pruvious-tooltip="
          sync ? __('pruvious-dashboard', 'Desynchronize values') : __('pruvious-dashboard', 'Synchronize values')
        "
        @click="toggleSync()"
        type="button"
        class="button button-white button-square"
        :class="{ '!border-primary-700 !text-primary-700': sync }"
      >
        <PruviousIconLayersLinked />
      </button>
    </div>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import { type SizeInput, type StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { numericSanitizer } from '../../sanitizers/numeric'
import { isDefined } from '../../utils/common'
import { isRealNumber } from '../../utils/number'
import { titleCase } from '../../utils/string'

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: Record<string, { value: number; unit?: string }>

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['size']

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
   * Indicates whether the field is in compact mode.
   * By default, the field is not in compact mode.
   */
  compact?: boolean

  /**
   * When set to `true`, the field will won't autofocus in popups.
   */
  ignoreAutofocus?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [Record<string, { value: number; unit?: string }>]
}>()

const focused = ref<boolean>(false)
const id = pruviousUnique('size-field')
const inputs = ref<(Required<Omit<SizeInput, 'default'>> & { name: string })[]>([])
const labelHovered = ref<boolean>(false)
const name = props.options.name || pruviousUnique(props.fieldKey || 'size-field')
const sync = ref<boolean>(false)

const PruviousInputError = dashboardMiscComponent.InputError()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.options,
  () => {
    inputs.value = Object.entries(props.options.inputs!).map(([name, input]) => ({
      label: __('pruvious-dashboard', (input.label ?? titleCase(name)) as any),
      max: input.max ?? Number.MAX_SAFE_INTEGER,
      min: input.min ?? 0,
      name,
      placeholder: input.placeholder ?? '',
      units: input.units ?? [],
    }))
  },
  { immediate: true },
)

function onKeyDown(name: string, event: KeyboardEvent) {
  const prevValue = props.modelValue[name].value
  let newValue: number | undefined

  if (event.key === 'ArrowUp' && event.shiftKey) {
    event.preventDefault()
    newValue = Math.min(props.options.inputs![name].max ?? Number.MAX_SAFE_INTEGER, props.modelValue[name].value + 10)
  } else if (event.key === 'ArrowDown' && event.shiftKey) {
    event.preventDefault()
    newValue = Math.max(props.options.inputs![name].min ?? 0, props.modelValue[name].value - 10)
  }

  if (isDefined(newValue) && prevValue !== newValue) {
    updateValue(name, newValue)
  }
}

function toggleSync() {
  sync.value = !sync.value

  if (sync.value) {
    updateValue(inputs.value[0].name, props.modelValue[inputs.value[0].name].value)
  }
}

function onUpdateInputValue(name: string, event: Event) {
  const inputValue = (event.target as HTMLInputElement).value
  const numberValue = numericSanitizer({ value: inputValue })

  if (inputValue !== '' && isRealNumber(numberValue)) {
    updateValue(name, numberValue)
  }
}

function updateValue(name: string, value: number) {
  if (props.options.syncable && sync.value) {
    emit(
      'update:modelValue',
      Object.fromEntries(Object.entries(props.modelValue).map(([key, inputValue]) => [key, { ...inputValue, value }])),
    )
  } else {
    emit('update:modelValue', { ...props.modelValue, [name]: { ...props.modelValue[name], value } })
  }
}
</script>
