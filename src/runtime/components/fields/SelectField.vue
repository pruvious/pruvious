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
      @keydown.down="highlightNext()"
      @keydown.enter.prevent.stop="pick()"
      @keydown.up="highlightPrev()"
      ref="containerEl"
      class="relative h-9 w-full rounded-md text-sm"
    >
      <div
        class="absolute inset-x-0 top-0 overflow-hidden rounded-md border bg-white transition"
        :class="{
          'z-30': focused,
          'z-20': !focused && animatingHeight,
          'border-primary-700': (labelHovered || focused) && !disabled,
          'ring': focused,
          'hover:border-primary-700': !disabled,
        }"
      >
        <div class="relative h-[2.125rem] w-full">
          <input
            v-model="inputText"
            :data-ignore-autofocus="ignoreAutofocus ? '' : undefined"
            :disabled="disabled"
            :id="id"
            :name="name"
            :placeholder="__('pruvious-dashboard', props.options.placeholder as any)"
            @blur="onBlurInput()"
            @focus="onFocusInput()"
            @input="onInputTextChange()"
            @keydown.down.prevent
            @keydown.escape.prevent.stop="inputTextEl?.blur()"
            @keydown.tab="onTab"
            @keydown.up.prevent
            autocomplete="off"
            ref="inputTextEl"
            spellcheck="false"
            class="h-full w-full cursor-default truncate rounded-md pl-2.5 pr-9 outline-none placeholder:text-gray-300 focus:cursor-text"
            :class="{
              '!pr-14': options.clearable && modelValue && !disabled && !focused,
              'pointer-events-none text-gray-400': disabled,
            }"
          />

          <button
            v-if="options.clearable && modelValue && !disabled && !focused"
            v-pruvious-tooltip="{ content: __('pruvious-dashboard', 'Clear'), offset: [0, 8] }"
            @click="$emit('update:modelValue', null)"
            data-ignore-autofocus
            type="button"
            class="absolute right-8 top-1/2 -mt-2 h-4 w-4 text-gray-400 transition hocus:text-primary-700"
          >
            <PruviousIconX />
          </button>

          <PruviousIconChevronDown class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
        </div>

        <div
          class="scrollbar-thin mt-0 transition-all"
          :class="{
            'overflow-hidden': animatingHeight,
            'overflow-y-auto': !animatingHeight,
          }"
          :style="{ height: `${height}rem` }"
        >
          <button
            v-for="choice of filteredChoices"
            :data-highlighted="choice.value === highlightedChoice?.value ? '' : undefined"
            :tabindex="focused ? 0 : -1"
            :title="choice.label"
            @mousedown="pick(choice)"
            type="button"
            class="flex h-9 w-full items-center px-2.5 outline-none transition hover:text-primary-700"
            :class="{ 'bg-primary-50': choice.value === highlightedChoice?.value }"
          >
            <span class="truncate">{{ choice.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, ref, watch } from '#imports'
import type { StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { debounce } from 'perfect-debounce'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { next, prev } from '../../utils/array'
import { extractKeywords } from '../../utils/string'

export interface Choice {
  label: string
  value: string
}

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: string | null

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['select']

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

const animatingHeight = ref<boolean>(false)
const choices = ref<Choice[]>([])
const containerEl = ref<HTMLDivElement>()
const filteredChoices = ref<Choice[]>([])
const focused = ref<boolean>(false)
const height = ref(0)
const highlightedChoice = ref<Choice>()
const id = pruviousUnique('select-field')
const inputText = ref('')
const inputTextEl = ref<HTMLInputElement>()
const labelHovered = ref<boolean>(false)
const name = props.options.name || pruviousUnique(props.fieldKey || 'select-field')

const PruviousInputError = dashboardMiscComponent.InputError()

let heightAnimationTimeout: NodeJS.Timeout | undefined
let pickedLabel = ''

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.modelValue,
  () => refresh(),
  { immediate: true },
)

watch(
  () => props.options.choices,
  () => refresh(),
)

watch(height, () => {
  animatingHeight.value = true
  clearTimeout(heightAnimationTimeout)
  heightAnimationTimeout = setTimeout(() => {
    animatingHeight.value = false

    if (!height.value && !focused.value) {
      filteredChoices.value = []
    }
  }, 200)
})

function onFocusInput() {
  focused.value = true
  inputText.value = ''
  highlightedChoice.value = getChoiceByValue(props.modelValue)
  onInputTextChange()
  scrollToHighlightedDebounced()
}

function onBlurInput() {
  focused.value = false
  inputText.value = pickedLabel
  highlightedChoice.value = undefined
  height.value = 0
}

function onInputTextChange() {
  const keywords = extractKeywords(inputText.value)

  filteredChoices.value = choices.value.filter(({ value, label }) => {
    if (keywords.length) {
      return keywords.every((keyword) => {
        return (
          (typeof value === 'string' && value.toLowerCase().includes(keyword)) || label.toLowerCase().includes(keyword)
        )
      })
    }

    return true
  })

  filteredChoices.value.sort((a, b) => {
    const aIndex = keywords
      .map((keyword) => {
        const labelIndex = a.label.toLowerCase().indexOf(keyword.toLowerCase())

        if (labelIndex > -1) {
          return labelIndex
        } else if (typeof a.value === 'string') {
          return a.value.toLowerCase().indexOf(keyword.toLowerCase())
        }

        return Infinity
      })
      .sort()[0]

    const bIndex = keywords
      .map((keyword) => {
        const labelIndex = b.label.toLowerCase().indexOf(keyword.toLowerCase())

        if (labelIndex > -1) {
          return labelIndex
        } else if (typeof b.value === 'string') {
          return b.value.toLowerCase().indexOf(keyword.toLowerCase())
        }

        return Infinity
      })
      .sort()[0]

    return aIndex - bIndex
  })

  const filteredIncludesHighlighted =
    highlightedChoice.value && filteredChoices.value.some(({ value }) => value === highlightedChoice.value!.value)

  if (!filteredIncludesHighlighted) {
    highlightedChoice.value = filteredChoices.value[0]
  }

  updateHeight()
  scrollToHighlightedDebounced()
}

function updateHeight() {
  height.value = (Math.min(props.options.visibleChoices ?? 6, filteredChoices.value.length) * 9) / 4
}

function highlightPrev() {
  highlightedChoice.value = highlightedChoice?.value
    ? prev({ value: highlightedChoice.value.value, label: '' }, filteredChoices.value, 'value')
    : undefined
  scrollToHighlightedDebounced()
}

function highlightNext() {
  highlightedChoice.value = highlightedChoice?.value
    ? next({ value: highlightedChoice.value.value, label: '' }, filteredChoices.value, 'value')
    : undefined
  scrollToHighlightedDebounced()
}

const scrollToHighlightedDebounced = debounce(() => scrollToHighlighted(), 50)

function scrollToHighlighted() {
  containerEl.value?.querySelector(`button[data-highlighted]`)?.scrollIntoView({ block: 'nearest' })
}

function pick(choice?: Choice, blur = true) {
  const value = choice?.value ?? highlightedChoice?.value?.value ?? props.modelValue

  if (value !== props.modelValue) {
    emit('update:modelValue', value)
    setTimeout(() => refresh())
  }

  if (blur) {
    inputTextEl.value?.blur()
  }
}

function refresh() {
  choices.value = Object.entries(props.options.choices).map(([value, label]) => ({
    value,
    label: __('pruvious-dashboard', label as any),
  }))

  const picked = getChoiceByValue(props.modelValue)

  pickedLabel = picked?.label ?? ''

  if (focused.value) {
    onInputTextChange()
  } else {
    onBlurInput()
  }
}

function onTab(event: KeyboardEvent) {
  if (!event.shiftKey) {
    onBlurInput()
  }
}

function getChoiceByValue(value: string | null): Choice | undefined {
  return choices.value.find((choice) => choice.value === value)
}

onBeforeUnmount(() => {
  clearTimeout(heightAnimationTimeout)
})
</script>
