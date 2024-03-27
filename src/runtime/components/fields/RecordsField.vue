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
          v-for="(value, i) of modelValue"
          :key="`${sortableKey}-${value}`"
          class="flex min-w-0 items-center rounded-full text-vs"
          :class="{
            'cursor-move': options.sortable,
            'hidden': chipLabels[value] === undefined,
            'bg-primary-100': !chipErrors[`${fieldKey}.${i}`] && !chipErrors2[value],
            'bg-red-500 text-white': chipErrors[`${fieldKey}.${i}`] || chipErrors2[value],
          }"
        >
          <span class="flex truncate whitespace-nowrap px-2.5" :class="{ 'pr-1.5': !disabled }">
            <span
              v-pruvious-tooltip="
                chipErrors[`${fieldKey}.${i}`] ?? chipErrors2[value] ?? (options.details ? chipDetails[value] : '')
              "
              class="h-6 truncate py-0.5"
            >
              {{ chipLabels[value] }}
            </span>
          </span>

          <NuxtLink
            v-if="!chipErrors2[value]"
            v-pruvious-tooltip="
              canUpdateCollection
                ? __('pruvious-dashboard', 'Edit $item', { item: collection.label.record.singular })
                : __('pruvious-dashboard', 'View $item', { item: collection.label.record.singular })
            "
            :to="`/${runtimeConfig.public.pruvious.dashboardPrefix}/collections/${collection.name}/${value}`"
            class="mr-1 flex h-4 w-4 shrink-0 rounded-full bg-white transition hocus:bg-primary-500 hocus:text-white"
          >
            <PruviousIconPencil class="m-auto h-3 w-3" />
          </NuxtLink>

          <button
            v-if="!disabled"
            v-pruvious-tooltip="
              canUpdateCollection
                ? __('pruvious-dashboard', 'Edit $item', { item: collection.label.record.singular })
                : __('pruvious-dashboard', 'View $item', { item: collection.label.record.singular })
            "
            @click="removeChip(value)"
            class="mr-1 flex h-4 w-4 shrink-0 cursor-pointer rounded-full bg-white transition"
            :class="{
              'cursor-move': options.sortable,
              'hidden': chipLabels[value] === undefined,
              'hocus:bg-red-500 hocus:text-white': !chipErrors[`${fieldKey}.${i}`] && !chipErrors2[value],
              'text-red-700 hocus:bg-red-200': chipErrors[`${fieldKey}.${i}`] || chipErrors2[value],
            }"
          >
            <PruviousIconX class="m-auto h-3 w-3" />
          </button>
        </div>

        <div class="relative flex min-w-32 flex-1 sorting:hidden">
          <input
            v-if="!disabled"
            v-model="inputText"
            :data-ignore-autofocus="ignoreAutofocus ? '' : undefined"
            :disabled="disabled"
            :id="id"
            :name="name"
            :placeholder="__('pruvious-dashboard', options.placeholder as any)"
            :readonly="!collection.search"
            @blur="onBlur()"
            @focus="onFocus()"
            @input=";(inputText = ($event.target as HTMLInputElement).value), onInputTextChangeDebounced()"
            @keydown.backspace="onBackspaceKey()"
            @keydown.down.prevent
            @keydown.escape.prevent.stop="inputEl?.blur()"
            @keydown.tab="onTab"
            @keydown.up.prevent
            autocomplete="off"
            ref="inputEl"
            spellcheck="false"
            type="text"
            class="m-[-0.3125rem] h-8.5 flex-1 truncate bg-transparent px-2.5 text-sm outline-none transition placeholder:text-gray-300 read-only:cursor-default"
          />

          <div v-if="spinner" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-primary-400">
            <PruviousIconLoader2 class="block h-4 w-4 animate-spin" />
          </div>
        </div>
      </div>

      <div
        v-if="!disabled"
        @scroll="onScroll"
        ref="choicesEl"
        class="scrollbar-thin transition-all"
        :class="{ 'overflow-hidden': animatingHeight, 'overflow-y-auto': !animatingHeight }"
        :style="{ height: `${height}rem` }"
      >
        <button
          v-for="choice of choices"
          :data-highlighted="choice === highlightedChoice ? '' : undefined"
          :tabindex="focused ? 0 : -1"
          @mousedown.prevent="pick(choice)"
          type="button"
          class="flex h-9 w-full items-center justify-between gap-4 rounded px-2.5 outline-none transition hover:text-primary-700"
          :class="{
            'bg-primary-50': choice === highlightedChoice,
          }"
        >
          <span :title="choice.label" class="min-w-1/4 truncate text-left">{{ choice.label }}</span>

          <span v-if="choice.detail" :title="choice.detail" class="min-w-1/4 truncate text-right text-xs text-gray-400">
            {{ choice.detail }}
          </span>
        </button>
      </div>
    </div>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
    <PruviousInputError v-if="!errors || !fieldKey || !errors[fieldKey]" :errors="generalErrors" fieldKey="general" />
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, useRuntimeConfig, watch } from '#imports'
import { primaryLanguage, type CollectionName, type StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import type { UseSortableReturn } from '@vueuse/integrations/useSortable'
import { useSortable } from '@vueuse/integrations/useSortable'
import { debounce } from 'perfect-debounce'
import { usePruviousDashboard, type SimpleCollection } from '../../composables/dashboard/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { useUser } from '../../composables/user'
import { clearArray, next, prev, toArray, uniqueArray } from '../../utils/array'
import { isUndefined } from '../../utils/common'
import { defaultSortableOptions } from '../../utils/dashboard/defaults'
import { pruviousFetch } from '../../utils/fetch'
import { extractKeywords, isString, stringify } from '../../utils/string'
import { getCapabilities } from '../../utils/users'

interface Choice {
  label: string
  primary?: string
  detail?: string
  value: number
  record: Record<string, any>
  dimmed: boolean
  error?: string
}

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: number[]

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['records']

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
  'update:modelValue': [number[]]
}>()

const dashboard = usePruviousDashboard()
const runtimeConfig = useRuntimeConfig()
const user = useUser()

const collection = computed<SimpleCollection>(() => dashboard.value.collections[props.options.collection])
const animatingHeight = ref<boolean>(false)
const canUpdateCollection = computed(
  () =>
    user.value?.isAdmin ||
    (collection.value && getCapabilities(user.value)[`collection-${collection.value.name as CollectionName}-update`]),
)
const chipDetails = ref<Record<string, string>>({})
const chipErrors = ref<Record<string, string>>({})
const chipErrors2 = ref<Record<number, string>>({})
const chipLabels = ref<Record<string, string>>({})
const choices = ref<Choice[]>([])
const choicesEl = ref<HTMLDivElement>()
const containerEl = ref<HTMLElement>()
const focused = ref<boolean>(false)
const generalErrors = ref<Record<'general', string>>({ general: '' })
const height = ref<number>(0)
const highlightedChoice = ref<Choice>()
const id = pruviousUnique('records-field')
const labelHovered = ref<boolean>(false)
const inputEl = ref<HTMLInputElement>()
const inputText = ref('')
const name = props.options.name || pruviousUnique(props.fieldKey || 'records-field')
const recordLabels = computed<[string, string | null]>(() => [
  toArray(props.options.recordLabel)?.[0] ??
    collection.value?.dashboard.overviewTable.searchLabel[0] ??
    collection.value?.dashboard.primaryField,
  toArray(props.options.recordLabel)?.[1] ?? collection.value?.dashboard.overviewTable.searchLabel[1],
])
const spinner = ref<boolean>(false)
const sortableEl = ref<HTMLElement>()
const sortableKey = ref(0)

const PruviousInputError = dashboardMiscComponent.InputError()

let choicesPage = 1
let fetchChoicesCounter = 0
let fetchRefreshCounter = 0
let heightAnimationTimeout: NodeJS.Timeout | undefined
let sortableReturn: UseSortableReturn | undefined
let spinnerTimeout: NodeJS.Timeout | undefined

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.modelValue,
  () => {
    chipErrors.value = {}
    generalErrors.value.general = ''
    refresh()
  },
  { immediate: true },
)

watch(
  () => props.errors,
  () => {
    const errors = Object.entries(props.errors ?? {}).filter(([key]) => key.startsWith(`${props.fieldKey}.`))

    if (errors.length) {
      chipErrors.value = Object.fromEntries(errors)
      generalErrors.value.general = __('pruvious-dashboard', '$count $errors found', { count: errors.length })
    } else {
      chipErrors.value = {}
      generalErrors.value.general = ''
    }
  },
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
            chipErrors.value = {}
            generalErrors.value.general = ''
            nextTick(() => emit('update:modelValue', props.modelValue))
          }
        },
      })
    }
  },
  { immediate: true },
)

async function onFocus() {
  focused.value = true
  highlightedChoice.value = undefined
  choicesPage = 1
  await onInputTextChange()
  scrollToHighlightedDebounced()
}

function onBlur() {
  focused.value = false
  highlightedChoice.value = undefined
  height.value = 0
  emit('update:modelValue', props.modelValue)
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
      ? `language[=][${props.record?.language ?? primaryLanguage}],id[notIn][${props.modelValue.join(',')}]`
      : `id[notIn][${props.modelValue.join(',')}]`
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

function pick(choice?: Choice) {
  const value = choice?.value ?? highlightedChoice?.value?.value

  if (value && !props.modelValue.includes(value)) {
    choices.value = choices.value.filter((c) => c.value !== value)
    sortableKey.value++
    updateHeight()
    emit('update:modelValue', [...props.modelValue, value])
  }
}

async function refresh() {
  if (!collection.value) {
    return
  }

  if (props.modelValue.length) {
    const counter = ++fetchRefreshCounter
    const response = await pruviousFetch<{ records: Record<string, any>[] }>(
      `collections/${props.options.collection}`,
      {
        query: {
          select: uniqueArray(['id', recordLabels.value[0], ...props.options.details!]).join(','),
          where: `id[in][${props.modelValue.join(',')}]`,
        },
        dispatchEvents: false,
      },
    )

    if (response.success && counter === fetchRefreshCounter) {
      for (const record of response.data.records) {
        const choice = recordToChoice(record)
        chipLabels.value[record.id] = choice.primary || choice.label
        chipDetails.value[record.id] = props.options
          .details!.map((fieldName) => ({
            label: __('pruvious-dashboard', collection.value!.fields[fieldName].options.label as any),
            value:
              stringify(record[fieldName]) ||
              __('pruvious-dashboard', collection.value!.fields[fieldName].additional.emptyLabel as any),
          }))
          .map(({ label, value }) => `**${label}:** ${value}`)
          .join('<br>')
        delete chipErrors2.value[record.id]
      }

      for (const recordId of props.modelValue) {
        if (isUndefined(chipLabels.value[recordId])) {
          chipLabels.value[recordId] = recordId.toString()
          chipErrors2.value[recordId] = __('pruvious-dashboard', 'The $item does not exist', {
            item: __('pruvious-dashboard', collection.value.label.collection.singular as any),
          })
        }
      }
    }
  }

  if (!focused.value) {
    onBlur()
  }
}

function removeChip(value: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((v) => v !== value),
  )
}

function onTab(event: KeyboardEvent) {
  if (!event.shiftKey) {
    onBlur()
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

function onBackspaceKey() {
  if (inputText.value === '') {
    emit('update:modelValue', props.modelValue.slice(0, -1))
    onInputTextChangeDebounced()
  }
}

onBeforeUnmount(() => {
  clearTimeout(heightAnimationTimeout)
  clearTimeout(spinnerTimeout)
})
</script>
