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
      @keydown.down="highlightNext"
      @keydown.enter="onEnterKey"
      @keydown.up="highlightPrev"
      class="relative h-9 w-full rounded-md text-sm"
      :class="{ 'pointer-events-none': disabled }"
    >
      <div
        class="absolute inset-x-0 top-0 overflow-hidden rounded-md border bg-white transition hover:border-primary-700"
        :class="{
          'z-30': focused,
          'z-20': !focused && animatingHeight,
          'border-primary-700': (labelHovered || focused) && !disabled,
          'ring': focused,
        }"
      >
        <div class="relative flex h-8.5 w-full items-center">
          <div
            class="flex h-full w-full items-center gap-1.5"
            :class="{
              'pr-7': options.suffix && (spinner || (options.clearable && modelValue)),
              'pr-8': options.suffix && options.type === 'password' && !spinner,
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
              :autocomplete="options.autocomplete || 'off'"
              :data-ignore-autofocus="ignoreAutofocus ? '' : undefined"
              :disabled="disabled"
              :id="id"
              :name="name"
              :placeholder="__('pruvious-dashboard', options.placeholder as any)"
              :spellcheck="options.spellcheck || 'false'"
              :type="options.type === 'password' && !passwordVisible ? 'password' : 'text'"
              :value="modelValue"
              @blur="onBlur()"
              @focus="onFocus"
              @input="
                $emit('update:modelValue', ($event.target as HTMLInputElement).value),
                  onScrollSuggestions(),
                  onInput($event)
              "
              @keydown.down.prevent
              @keydown.escape="onEscapeKey"
              @keydown.tab="blurActiveElement"
              @keydown.up.prevent
              class="h-full w-full truncate bg-transparent text-sm outline-none transition placeholder:text-gray-300"
              :class="{
                'pl-2.5': !options.prefix,
                'pr-2.5':
                  !options.suffix && !spinner && options.type !== 'password' && (!options.clearable || !modelValue),
                'pr-9': !options.suffix && (spinner || (options.clearable && modelValue)),
                'pr-10': !options.suffix && options.type === 'password' && !spinner,
                'text-gray-400': disabled,
              }"
            />

            <span
              v-if="options.suffix"
              class="whitespace-nowrap pr-2.5 pt-px text-xs font-medium"
              :class="{ 'text-gray-400': disabled }"
            >
              {{ options.suffix }}
            </span>
          </div>

          <div v-if="spinner" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-primary-400">
            <PruviousIconLoader2 class="block h-4 w-4 animate-spin" />
          </div>

          <button
            v-if="options.type === 'password' && !spinner"
            v-pruvious-tooltip.show-on-update="
              passwordVisible ? __('pruvious-dashboard', 'Hide password') : __('pruvious-dashboard', 'Show password')
            "
            @click="passwordVisible = !passwordVisible"
            data-ignore-autofocus
            type="button"
            class="absolute right-2.5 top-1/2 -mt-2.5 h-5 w-5 text-gray-400 transition hocus:text-primary-700"
          >
            <PruviousIconEyeOff v-if="passwordVisible" />
            <PruviousIconEye v-if="!passwordVisible" />
          </button>

          <button
            v-if="options.clearable && modelValue && options.type !== 'password' && !spinner"
            v-pruvious-tooltip="{ content: __('pruvious-dashboard', 'Clear'), offset: [0, 8] }"
            @click="$emit('update:modelValue', '')"
            data-ignore-autofocus
            type="button"
            class="absolute right-2.5 top-1/2 -mt-2 h-4 w-4 text-gray-400 transition hocus:text-primary-700"
          >
            <PruviousIconX />
          </button>
        </div>

        <div
          @scroll="onScrollSuggestions"
          ref="suggestionsEl"
          class="scrollbar-thin mt-0 transition-all"
          :class="{ 'overflow-hidden': animatingHeight, 'overflow-y-auto': !animatingHeight }"
          :style="{ height: `${suggestionsHeight}rem` }"
        >
          <button
            v-for="choice of suggestionChoices"
            :data-highlighted="choice === highlightedSuggestion ? '' : undefined"
            :tabindex="focused ? 0 : -1"
            @mousedown="pickSuggestion(choice)"
            type="button"
            class="flex h-9 w-full items-center justify-between gap-4 rounded px-2.5 outline-none transition hover:text-primary-700"
            :class="{
              'bg-primary-50': choice === highlightedSuggestion,
              'text-gray-400': choice.dimmed,
            }"
          >
            <span :title="choice.label ?? choice.value" class="min-w-1/4 truncate text-left">
              {{ choice.label ?? choice.value }}
            </span>

            <span
              v-if="choice.detail"
              :title="choice.detail"
              class="min-w-1/4 truncate text-right text-xs text-gray-400"
            >
              {{ choice.detail }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import { nextTick, onBeforeUnmount, ref, watch } from '#imports'
import type { StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { debounce } from 'perfect-debounce'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { clearArray, next, prev } from '../../utils/array'
import { blurActiveElement } from '../../utils/dom'

interface Suggestion {
  value: string
  label?: string
  detail?: string
  dimmed?: boolean
}

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: string

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['text']

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
   * A callback function that provides suggestions for the given `keywords` (current input value) and handles pagination if necessary,
   * based on the specified `page` parameter.
   *
   * The function is triggered whenever there is an input change while the field is focused.
   */
  suggestions?: (
    keywords: string,
    page: number,
  ) =>
    | Promise<{ value: string; label?: string; detail?: string }[]>
    | { value: string; label?: string; detail?: string }[]

  /**
   * The number of visible suggestions in the dropdown list (must be less than 30).
   *
   * @default 6
   */
  visibleSuggestions?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [string]
  'pickSuggestion': [string]
}>()

const animatingHeight = ref<boolean>(false)
const focused = ref<boolean>(false)
const highlightedSuggestion = ref<Suggestion>()
const id = pruviousUnique('text-field')
const labelHovered = ref<boolean>(false)
const name = props.options.name || pruviousUnique(props.fieldKey || 'text-field')
const passwordVisible = ref<boolean>(false)
const spinner = ref<boolean>(false)
const suggestionChoices = ref<Suggestion[]>([])
const suggestionsEl = ref<HTMLDivElement>()
const suggestionsHeight = ref<number>(0)

const PruviousInputError = dashboardMiscComponent.InputError()

let heightAnimationTimeout: NodeJS.Timeout | undefined
let prevValue: string = ''
let spinnerTimeout: NodeJS.Timeout | undefined
let suggestionsCounter = 0
let suggestionsPage = 1

await loadTranslatableStrings('pruvious-dashboard')

watch(suggestionsHeight, () => {
  animatingHeight.value = true
  clearTimeout(heightAnimationTimeout)
  heightAnimationTimeout = setTimeout(() => (animatingHeight.value = false), 150)
})

function onFocus(event: Event) {
  focused.value = true
  clearArray(suggestionChoices.value)
  prevValue = (event.target as HTMLInputElement).value
  suggestionsPage = 1
  getSuggestions(1)

  if (suggestionsEl.value) {
    suggestionsEl.value.scrollTop = 0
  }
}

function onBlur() {
  focused.value = false
  highlightedSuggestion.value = undefined
  suggestionsHeight.value = 0
  clearTimeout(spinnerTimeout)
  spinner.value = false
  emit('update:modelValue', props.modelValue)
}

function highlightNext() {
  highlightedSuggestion.value = next(
    { value: highlightedSuggestion.value?.value ?? '' },
    suggestionChoices.value,
    'value',
  )
  scrollToHighlightedSuggestion()
}

function highlightPrev() {
  highlightedSuggestion.value = prev(
    { value: highlightedSuggestion.value?.value ?? '' },
    suggestionChoices.value,
    'value',
  )
  scrollToHighlightedSuggestion()
}

function onEnterKey(event: Event) {
  if (highlightedSuggestion.value) {
    event.preventDefault()
    event.stopPropagation()
    pickSuggestion(highlightedSuggestion.value)
  }

  setTimeout(blurActiveElement)
}

async function getSuggestions(page: number) {
  if (focused.value && props.suggestions) {
    spinnerTimeout = setTimeout(() => (spinner.value = true), 50)

    const counter = ++suggestionsCounter
    const results = await props.suggestions.call(null, props.modelValue, page)

    clearTimeout(spinnerTimeout)

    if (counter === suggestionsCounter) {
      if (page === 1) {
        clearArray(suggestionChoices.value)
      }

      if (results.length) {
        suggestionChoices.value.push(...results)
        suggestionsPage = page
      }

      spinner.value = false

      if (focused.value) {
        updateSuggestionsHeight()
      }
    }
  }
}

const getSuggestionsDebounced = debounce(getSuggestions, 150)

function onInput(event: Event) {
  setTimeout(() => {
    if (prevValue !== (event.target as HTMLInputElement).value) {
      prevValue = (event.target as HTMLInputElement).value
      getSuggestionsDebounced(1)
    }
  })
}

function onScrollSuggestions() {
  if (
    suggestionChoices.value.length >= (props.visibleSuggestions ?? 6) &&
    suggestionsEl.value &&
    suggestionsEl.value.scrollTop + suggestionsEl.value.offsetHeight === suggestionsEl.value.scrollHeight
  ) {
    getSuggestions(suggestionsPage + 1)
  }
}

function pickSuggestion(choice: Suggestion) {
  emit('update:modelValue', choice.label ?? choice.value)
  emit('pickSuggestion', choice.value)
  setTimeout(blurActiveElement)
}

function updateSuggestionsHeight() {
  suggestionsHeight.value = (Math.min(props.visibleSuggestions ?? 6, suggestionChoices.value.length) * 9) / 4
}

function scrollToHighlightedSuggestion() {
  nextTick(() => {
    suggestionsEl.value?.querySelector(`button[data-highlighted]`)?.scrollIntoView({ block: 'nearest' })
  })
}

function onEscapeKey(event: KeyboardEvent) {
  if (suggestionChoices.value.length) {
    event.preventDefault()
    event.stopPropagation()
  }

  blurActiveElement()
}

onBeforeUnmount(() => {
  clearTimeout(heightAnimationTimeout)
  clearTimeout(spinnerTimeout)
})
</script>
