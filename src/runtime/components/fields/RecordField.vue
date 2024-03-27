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

      <div class="mb-0.5 flex shrink-0 gap-1.5 text-gray-400">
        <NuxtLink
          v-if="modelValue && collection && (collection.name !== dashboard.collection || modelValue !== record?.id)"
          v-pruvious-tooltip="{
            content: canUpdateCollection
              ? __('pruvious-dashboard', 'Edit $item', { item: __('pruvious-dashboard',collection.label.record.singular as any) })
              : __('pruvious-dashboard', 'View $item', { item: __('pruvious-dashboard',collection.label.record.singular as any) }),
            offset: [0, 8],
          }"
          :to="`/${runtimeConfig.public.pruvious.dashboardPrefix}/collections/${collection.name}/${modelValue}`"
          data-ignore-autofocus
          class="transition hocus:text-primary-700"
        >
          <PruviousIconPencil v-if="canUpdateCollection" class="h-4 w-4" />
          <PruviousIconEye v-if="!canUpdateCollection" class="h-4 w-4" />
        </NuxtLink>

        <PruviousIconHelp
          v-if="options.description"
          v-pruvious-tooltip="__('pruvious-dashboard', options.description as any)"
          class="h-4 w-4"
        />
      </div>
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
            :data-ignore-autofocus="ignoreAutofocus ? '' : undefined"
            :disabled="disabled"
            :id="id"
            :name="name"
            :placeholder="__('pruvious-dashboard', props.options.placeholder as any)"
            :readonly="!collection?.search"
            :value="inputText"
            @blur="onBlurInput()"
            @focus="onFocusInput()"
            @input=";(inputText = ($event.target as HTMLInputElement).value), onInputTextChangeDebounced()"
            @keydown.down.prevent
            @keydown.escape.prevent.stop="inputTextEl?.blur()"
            @keydown.tab="onTab"
            @keydown.up.prevent
            autocomplete="off"
            ref="inputTextEl"
            spellcheck="false"
            class="h-full w-full cursor-default truncate rounded-md pl-2.5 pr-9 outline-none placeholder:text-gray-300 read-only:!cursor-default focus:cursor-text"
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

          <div v-if="spinner" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-primary-400">
            <PruviousIconLoader2 class="block h-4 w-4 animate-spin" />
          </div>

          <PruviousIconChevronDown
            v-if="!spinner"
            class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
          />
        </div>

        <div
          @scroll="onScroll"
          ref="choicesEl"
          class="scrollbar-thin mt-0 transition-all"
          :class="{
            'overflow-hidden': animatingHeight,
            'overflow-y-auto': !animatingHeight,
          }"
          :style="{ height: `${height}rem` }"
        >
          <button
            v-for="choice of choices"
            :data-highlighted="choice.value === highlightedChoice?.value ? '' : undefined"
            :tabindex="focused ? 0 : -1"
            :title="choice.label"
            @mousedown="pick(choice)"
            data-ignore-autofocus
            type="button"
            class="flex h-9 w-full items-center justify-between gap-4 px-2.5 outline-none transition hover:text-primary-700"
            :class="{
              'bg-primary-50': choice.value === highlightedChoice?.value,
              'text-gray-400': choice.dimmed,
            }"
          >
            <span :title="choice.label" class="min-w-1/4 truncate text-left">{{ choice.label }}</span>

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

    <ul v-if="modelValue && details.length" class="flex w-full flex-col gap-1 pt-0.5 text-vs">
      <li v-for="{ label, value } of details" class="flex gap-1 truncate">
        <strong :title="label" class="text-gray-500">{{ label }}:</strong>
        <span :title="value" class="truncate text-gray-400">{{ value }}</span>
      </li>
    </ul>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, useRuntimeConfig, watch } from '#imports'
import { primaryLanguage, type CollectionName, type StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { debounce } from 'perfect-debounce'
import { usePruviousDashboard, type SimpleCollection } from '../../composables/dashboard/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { useUser } from '../../composables/user'
import { clearArray, next, prev, toArray, uniqueArray } from '../../utils/array'
import { pruviousFetch } from '../../utils/fetch'
import { extractKeywords, isString, stringify } from '../../utils/string'
import { getCapabilities } from '../../utils/users'

export interface Choice {
  label: string
  primary?: string
  detail?: string
  value: number
  record: Record<string, any>
  dimmed: boolean
}

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: number | null

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['record']

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
   * The current collection record as a reactive key-value object, containing all field names and their values.
   */
  record?: Record<string, any>

  /**
   * When set to `true`, the field will won't autofocus in popups.
   */
  ignoreAutofocus?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [number | null]
}>()

const dashboard = usePruviousDashboard()
const runtimeConfig = useRuntimeConfig()
const user = useUser()

const collection = computed<SimpleCollection | undefined>(() => dashboard.value.collections[props.options.collection])
const animatingHeight = ref<boolean>(false)
const canUpdateCollection = computed(
  () =>
    user.value?.isAdmin ||
    (collection.value && getCapabilities(user.value)[`collection-${collection.value.name as CollectionName}-update`]),
)
const choices = ref<Choice[]>([])
const choicesEl = ref<HTMLDivElement>()
const containerEl = ref<HTMLDivElement>()
const recordLabels = computed<[string, string | null]>(() => [
  toArray(props.options.recordLabel)?.[0] ??
    collection.value?.dashboard.overviewTable.searchLabel[0] ??
    collection.value?.dashboard.primaryField,
  toArray(props.options.recordLabel)?.[1] ?? collection.value?.dashboard.overviewTable.searchLabel[1],
])
const details = ref<{ label: string; value: string }[]>([])
const focused = ref<boolean>(false)
const height = ref(0)
const highlightedChoice = ref<Choice>()
const id = pruviousUnique('record-field')
const inputText = ref('')
const inputTextEl = ref<HTMLInputElement>()
const labelHovered = ref<boolean>(false)
const name = props.options.name || pruviousUnique(props.fieldKey || 'record-field')
const spinner = ref<boolean>(false)

const PruviousInputError = dashboardMiscComponent.InputError()

let choicesPage = 1
let fetchChoicesCounter = 0
let fetchRefreshCounter = 0
let heightAnimationTimeout: NodeJS.Timeout | undefined
let pickedLabel = ''
let spinnerTimeout: NodeJS.Timeout | undefined

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.modelValue,
  () => refresh(),
  { immediate: true },
)

watch(height, () => {
  animatingHeight.value = true
  clearTimeout(heightAnimationTimeout)
  heightAnimationTimeout = setTimeout(() => {
    animatingHeight.value = false

    if (!height.value && !focused.value) {
      choices.value = []
    }
  }, 200)
})

async function onFocusInput() {
  focused.value = true
  inputText.value = ''
  highlightedChoice.value = undefined
  choicesPage = 1
  await onInputTextChange()
  scrollToHighlightedDebounced()
}

function onBlurInput() {
  focused.value = false
  inputText.value = pickedLabel
  highlightedChoice.value = undefined
  height.value = 0
}

const onInputTextChangeDebounced = debounce(onInputTextChange, 150)

async function onInputTextChange(page: number = 1) {
  if (focused.value && collection.value) {
    spinnerTimeout = setTimeout(() => (spinner.value = true), 50)

    const select = uniqueArray([
      ...recordLabels.value.filter(isString),
      ...(collection.value?.dashboard.primaryField ? [collection.value?.dashboard.primaryField] : []),
      ...props.options.details!,
      'id',
    ]).join(',')
    const where = collection.value.translatable
      ? `language[=][${props.record?.language ?? primaryLanguage}]`
      : undefined
    const counter = ++fetchChoicesCounter
    const keywords = extractKeywords(inputText.value)
    const perPage = 30
    const response = await pruviousFetch<{ records: Record<string, any>[] }>(
      `collections/${props.options.collection}`,
      {
        query: collection.value.search
          ? { select, where, search: keywords.join(' '), order: ':default', page, perPage }
          : { select, where, order: 'id:desc', page, perPage },
      },
    )

    clearTimeout(spinnerTimeout)
    spinner.value = false

    if (response.success && counter === fetchChoicesCounter && focused.value) {
      if (page === 1) {
        clearArray(choices.value)
        highlightedChoice.value = undefined
      }

      if (response.data.records.length) {
        choices.value.push(...response.data.records.map(recordToChoice))
        choicesPage = page
      }

      updateHeight()
    }
  }
}

function onScroll() {
  if (
    choices.value.length >= (props.options.visibleChoices ?? 6) &&
    choicesEl.value &&
    choicesEl.value.scrollTop + choicesEl.value.offsetHeight === choicesEl.value.scrollHeight
  ) {
    onInputTextChangeDebounced(choicesPage + 1)
  }
}

function updateHeight() {
  height.value = (Math.min(props.options.visibleChoices ?? 6, choices.value.length) * 9) / 4
}

function highlightPrev() {
  highlightedChoice.value = prev({ value: highlightedChoice.value?.value ?? 0 } as any, choices.value, 'value')
  scrollToHighlightedDebounced()
}

function highlightNext() {
  highlightedChoice.value = next({ value: highlightedChoice.value?.value ?? 0 } as any, choices.value, 'value')
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

async function refresh() {
  if (!collection.value) {
    return
  }

  if (props.modelValue && focused.value) {
    await onInputTextChange()
  }

  if (props.modelValue) {
    const choice = choices.value.find(({ value }) => props.modelValue === value)

    if (choice) {
      pickedLabel = choice.primary || choice.label
      details.value = props.options.details!.map((fieldName) => ({
        label: __('pruvious-dashboard', collection.value!.fields[fieldName].options.label as any),
        value:
          stringify(choice.record[fieldName]) ||
          __('pruvious-dashboard', collection.value!.fields[fieldName].additional.emptyLabel as any),
      }))
    } else {
      const counter = ++fetchRefreshCounter
      const response = await pruviousFetch<Record<string, any>>(
        `collections/${props.options.collection}/${props.modelValue}`,
        {
          query: { select: uniqueArray(['id', recordLabels.value[0], ...props.options.details!]).join(',') },
          dispatchEvents: false,
        },
      )

      if (response.success && counter === fetchRefreshCounter) {
        const recordChoice = recordToChoice(response.data)
        pickedLabel = recordChoice.primary || recordChoice.label
        details.value = props.options.details!.map((fieldName) => ({
          label: __('pruvious-dashboard', collection.value!.fields[fieldName].options.label as any),
          value:
            stringify(response.data[fieldName]) ||
            __('pruvious-dashboard', collection.value!.fields[fieldName].additional.emptyLabel as any),
        }))
      } else {
        pickedLabel = ''
        details.value = []
      }
    }
  } else {
    pickedLabel = ''
    details.value = []
  }

  if (!focused.value) {
    onBlurInput()
  }
}

function onTab(event: KeyboardEvent) {
  if (!event.shiftKey) {
    onBlurInput()
  }
}

function recordToChoice(record: Record<string, any>): Choice {
  const stringifiedLabel = stringify(record[recordLabels.value[0]])

  return {
    label: stringifiedLabel || (collection.value?.fields[recordLabels.value[0]].additional.emptyLabel as any),
    primary: collection.value?.dashboard.primaryField ? record[collection.value.dashboard.primaryField] : undefined,
    detail: recordLabels.value[1] ? record[recordLabels.value[1]] : undefined,
    value: record.id,
    record,
    dimmed: !stringifiedLabel,
  }
}

onBeforeUnmount(() => {
  clearTimeout(heightAnimationTimeout)
  clearTimeout(spinnerTimeout)
})
</script>
