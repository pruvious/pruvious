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
      @keydown.enter="pickHighlightedSuggestion"
      @keydown.up="highlightPrev()"
      ref="containerEl"
      class="relative min-h-9 w-full overflow-hidden rounded-md border bg-white text-sm transition"
      :class="{
        'z-30': focused,
        'z-20': !focused && animatingHeight,
        'border-primary-700': (labelHovered || focused) && !disabled,
        'ring': focused,
        'hover:border-primary-700': !disabled,
      }"
    >
      <div ref="sortableEl" class="m-[0.3125rem] flex flex-wrap items-center gap-1.5">
        <div
          v-for="value of modelValue"
          :key="`${sortableKey}-${value}`"
          class="flex min-w-0 items-center rounded-full bg-primary-100 text-vs"
          :class="{ 'cursor-move': options.sortable }"
        >
          <span class="flex truncate whitespace-nowrap px-2.5" :class="{ 'pr-1.5': !disabled }">
            <span
              v-pruvious-tooltip="options.tooltips ? value : ''"
              :title="options.tooltips ? undefined : value"
              class="truncate py-0.5"
            >
              {{ choicesLabels[value] ?? value }}
            </span>
          </span>

          <button
            v-if="!disabled"
            v-pruvious-tooltip="__('pruvious-dashboard', 'Remove')"
            @click="removeChoice(value)"
            class="mr-1 flex h-4 w-4 shrink-0 cursor-pointer rounded-full bg-white transition hocus:bg-red-500 hocus:text-white"
          >
            <PruviousIconX class="m-auto h-3 w-3" />
          </button>
        </div>

        <input
          v-if="!disabled"
          v-model="inputValue"
          :data-ignore-autofocus="ignoreAutofocus ? '' : undefined"
          :disabled="disabled"
          :id="id"
          :name="name"
          :placeholder="__('pruvious-dashboard', options.placeholder as any)"
          @blur="onBlur()"
          @focus="onFocus()"
          @input="onInput()"
          @keydown.backspace="onBackspaceKey()"
          @keydown.down.prevent
          @keydown.enter="onEnterKey()"
          @keydown.escape="onEscapeKey"
          @keydown.tab="blurActiveElement"
          @keydown.up.prevent
          autocomplete="off"
          ref="inputEl"
          spellcheck="false"
          type="text"
          class="m-[-0.3125rem] h-8.5 min-w-32 flex-1 truncate bg-transparent px-2.5 text-sm outline-none transition placeholder:text-gray-300 sorting:hidden"
        />
      </div>

      <div
        v-if="!disabled"
        ref="suggestionsEl"
        class="scrollbar-thin transition-all"
        :class="{ 'overflow-hidden': animatingHeight, 'overflow-y-auto': !animatingHeight }"
        :style="{ height: `${suggestionsHeight}rem` }"
      >
        <button
          v-for="choice of suggestionChoices"
          :data-highlighted="choice === highlightedSuggestion ? '' : undefined"
          :tabindex="focused ? 0 : -1"
          @mousedown="onClickSuggestion(choice)"
          type="button"
          class="flex h-9 w-full items-center justify-between gap-4 rounded px-2.5 outline-none transition hover:text-primary-700"
          :class="{
            'bg-primary-50': choice === highlightedSuggestion,
          }"
        >
          <span :title="choice.label" class="min-w-1/4 truncate text-left">
            {{ choice.label }}
          </span>

          <span :title="choice.value" class="min-w-1/4 truncate text-right text-xs text-gray-400">
            {{ choice.value }}
          </span>
        </button>
      </div>
    </div>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import { nextTick, ref, watch } from '#imports'
import { type StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import type { UseSortableReturn } from '@vueuse/integrations/useSortable'
import { useSortable } from '@vueuse/integrations/useSortable'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { clearArray, next, prev, searchByKeywords } from '../../utils/array'
import { defaultSortableOptions } from '../../utils/dashboard/defaults'
import { blurActiveElement } from '../../utils/dom'
import { isString } from '../../utils/string'

interface Choice {
  value: string
  label: string
  selected: boolean
}

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: string[]

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['chips']

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
  'update:modelValue': [string[]]
}>()

const animatingHeight = ref<boolean>(false)
const choicesLabels = ref<Record<string, string>>({})
const choices = ref<Choice[]>([])
const containerEl = ref<HTMLElement>()
const focused = ref<boolean>(false)
const highlightedSuggestion = ref<Choice>()
const id = pruviousUnique('chips-field')
const labelHovered = ref<boolean>(false)
const inputEl = ref<HTMLInputElement>()
const inputValue = ref('')
const name = props.options.name || pruviousUnique(props.fieldKey || 'chips-field')
const sortableEl = ref<HTMLElement>()
const sortableKey = ref(0)
const suggestionChoices = ref<Choice[]>([])
const suggestionsEl = ref<HTMLDivElement>()
const suggestionsHeight = ref<number>(0)

const PruviousInputError = dashboardMiscComponent.InputError()

let heightAnimationTimeout: NodeJS.Timeout | undefined
let sortableReturn: UseSortableReturn | undefined

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

watch(suggestionsHeight, () => {
  animatingHeight.value = true
  clearTimeout(heightAnimationTimeout)
  heightAnimationTimeout = setTimeout(() => (animatingHeight.value = false), 150)
})

watch(
  () => props.options.sortable,
  () => {
    sortableReturn?.stop()

    if (props.options.sortable) {
      sortableReturn = useSortable(() => sortableEl.value, props.modelValue, {
        ...defaultSortableOptions,
        onUpdate: (e: any) => {
          const from = e.oldIndex
          const to = e.newIndex

          if (to >= 0 && to < props.modelValue.length) {
            const element = props.modelValue.splice(from, 1)[0]
            props.modelValue.splice(to, 0, element)
            nextTick(() => emit('update:modelValue', props.modelValue))
          }
        },
      })
    }
  },
  { immediate: true },
)

function onFocus() {
  focused.value = true
  clearArray(suggestionChoices.value)
  onInput()

  if (suggestionsEl.value) {
    suggestionsEl.value.scrollTop = 0
  }
}

function onBlur() {
  focused.value = false
  highlightedSuggestion.value = undefined
  suggestionsHeight.value = 0
  emitModelValue()
}

function emitModelValue(pushValue?: string) {
  const choicesValues = choices.value.map(({ value }) => value)
  const selected = choices.value.filter(({ selected }) => selected).map(({ value }) => value)
  const value = [...props.modelValue].filter(
    (v) => (choicesValues.includes(v) ? selected.includes(v) : !!props.options.allowCustomValues) && v !== pushValue,
  )

  for (const v of selected) {
    if (!value.includes(v)) {
      value.push(v)
    }
  }

  if (isString(pushValue)) {
    sortableKey.value++

    if (!value.includes(pushValue)) {
      value.push(pushValue)
    }
  }

  emit('update:modelValue', value)
}

function refresh() {
  choices.value = Object.entries(props.options.choices).map(([value, label]) => ({
    value,
    label: __('pruvious-dashboard', label as any),
    selected: props.modelValue.includes(value),
  }))

  choicesLabels.value = Object.fromEntries(choices.value.map(({ value, label }) => [value, label]))

  onInput()
}

function removeChoice(value: string) {
  const choice = choices.value.find((choice) => choice.value === value)

  if (choice) {
    choice.selected = false
    emitModelValue()
  } else if (props.options.allowCustomValues && props.modelValue.includes(value)) {
    emit(
      'update:modelValue',
      props.modelValue.filter((v) => v !== value),
    )
    sortableKey.value++
  }
}

function onInput() {
  if (focused.value) {
    suggestionChoices.value = searchByKeywords(
      choices.value.filter(({ selected }) => !selected),
      inputValue.value,
      ['value', 'label'],
    )

    updateSuggestionsHeight()
  }
}

function highlightPrev() {
  highlightedSuggestion.value = prev(
    { value: highlightedSuggestion.value?.value ?? '', selected: false, label: '' },
    suggestionChoices.value,
    'value',
  )
  scrollToHighlighted()
}

function highlightNext() {
  highlightedSuggestion.value = next(
    { value: highlightedSuggestion.value?.value ?? '', selected: false, label: '' },
    suggestionChoices.value,
    'value',
  )
  scrollToHighlighted()
}

function pickHighlightedSuggestion(event: Event) {
  if (highlightedSuggestion.value && suggestionChoices.value.includes(highlightedSuggestion.value)) {
    event.preventDefault()
    event.stopPropagation()

    highlightedSuggestion.value.selected = true

    if (props.options.clearInputOnPick || suggestionChoices.value.length === 1) {
      inputValue.value = ''
    }

    onInput()
    emitModelValue(highlightedSuggestion.value.value)

    highlightedSuggestion.value = undefined
  }
}

function onClickSuggestion(choice: Choice) {
  choice.selected = true

  if (props.options.clearInputOnPick || suggestionChoices.value.length === 1) {
    inputValue.value = ''
  }

  emitModelValue(choice.value)

  setTimeout(() => {
    if (props.options.clearInputOnPick || suggestionChoices.value.length === 1) {
      inputValue.value = ''
    } else {
      inputEl.value?.focus()
    }
  })
}

function onEscapeKey(event: KeyboardEvent) {
  if (suggestionChoices.value.length) {
    event.preventDefault()
    event.stopPropagation()
  }

  blurActiveElement()
}

function onEnterKey() {
  if (!highlightedSuggestion.value) {
    const trimmedValue = inputValue.value.trim()
    const choice = choices.value.find(({ value }) => value === trimmedValue)

    if (choice) {
      choice.selected = true
      emitModelValue()
    } else if (props.options.allowCustomValues && !props.modelValue.includes(trimmedValue)) {
      emitModelValue(trimmedValue)
      inputValue.value = ''
    }
  }
}

function onBackspaceKey() {
  if (inputValue.value === '') {
    const lastChoice = props.modelValue.length
      ? choices.value.find(({ value }) => value === props.modelValue[props.modelValue.length - 1])
      : undefined

    if (lastChoice) {
      lastChoice.selected = false
      emitModelValue()
    } else if (props.modelValue.length) {
      emit('update:modelValue', props.modelValue.slice(0, -1))
      sortableKey.value++
    }
  }
}

function scrollToHighlighted() {
  nextTick(() => {
    containerEl.value?.querySelector(`button[data-highlighted]`)?.scrollIntoView({ block: 'nearest' })
  })
}

function updateSuggestionsHeight() {
  suggestionsHeight.value = (Math.min(props.options.visibleSuggestions ?? 6, suggestionChoices.value.length) * 9) / 4
}
</script>
