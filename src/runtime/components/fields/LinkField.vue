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
          v-if="linked"
          v-pruvious-tooltip="{
            content: linked.canUpdate
              ? __('pruvious-dashboard', 'Edit $item', { item: __('pruvious-dashboard', linked.collection.label.record.singular as any) })
              : __('pruvious-dashboard', 'View $item', { item: __('pruvious-dashboard', linked.collection.label.record.singular as any) }),
            offset: [0, 8],
          }"
          :to="`/${runtimeConfig.public.pruvious.dashboardPrefix}/collections/${linked.collection.name}/${linked.recordId}`"
          data-ignore-autofocus
          class="transition hocus:text-primary-700"
        >
          <PruviousIconPencil v-if="linked.canUpdate" class="h-4 w-4" />
          <PruviousIconEye v-if="!linked.canUpdate" class="h-4 w-4" />
        </NuxtLink>

        <PruviousIconHelp
          v-if="options.description"
          v-pruvious-tooltip="__('pruvious-dashboard', options.description as any)"
          class="h-4 w-4"
        />
      </div>
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
              'pr-7': spinner || inputValue,
              'pr-8': !spinner,
            }"
          >
            <input
              v-model="inputValue"
              :data-ignore-autofocus="ignoreAutofocus ? '' : undefined"
              :disabled="disabled"
              :id="id"
              :name="name"
              :placeholder="__('pruvious-dashboard', options.placeholder as any)"
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
              autocomplete="off"
              spellcheck="false"
              type="text"
              class="h-full w-full truncate bg-transparent pl-2.5 text-sm outline-none transition placeholder:text-gray-300"
              :class="{
                'pr-2.5': !spinner,
                'pr-9': spinner,
                'text-gray-400': disabled,
              }"
            />
          </div>

          <div v-if="spinner" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-primary-400">
            <PruviousIconLoader2 class="block h-4 w-4 animate-spin" />
          </div>

          <button
            v-if="inputValue && !spinner"
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
          @scroll="onScrollSuggestions()"
          ref="suggestionsEl"
          class="scrollbar-thin mt-0 transition-all"
          :class="{ 'overflow-hidden': animatingHeight, 'overflow-y-auto': !animatingHeight }"
          :style="{ height: `${suggestionsHeight}rem` }"
        >
          <template v-for="{ group, groupLabel, choices, page, isLastPage } of suggestionChoices">
            <span
              v-if="suggestionChoices.length > 1 && choices.length"
              class="flex h-9 items-center gap-2.5 px-2.5 text-xs font-medium uppercase text-gray-300"
            >
              <span class="h-px flex-1 bg-gray-200"></span>
              <span class="truncate whitespace-nowrap">{{ groupLabel }}</span>
              <span class="h-px flex-1 bg-gray-200"></span>
            </span>

            <button
              v-for="choice of choices"
              :data-highlighted="choice === highlightedSuggestion ? '' : undefined"
              :tabindex="focused ? 0 : -1"
              @mousedown="pickSuggestion(choice)"
              data-ignore-autofocus
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

            <button
              v-if="suggestionChoices.length > 1 && !isLastPage"
              @mousedown.prevent="getSuggestions(page + 1, group)"
              data-ignore-autofocus
              type="button"
              class="flex h-9 w-full items-center truncate rounded px-2.5 text-xs font-medium uppercase text-gray-300 outline-none transition hover:text-primary-700"
            >
              {{ __('pruvious-dashboard', 'Load more') }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <ul v-if="linked" class="flex w-full flex-col gap-1 pt-0.5 text-vs">
      <li class="flex gap-1 truncate">
        <strong class="text-gray-500">
          {{
            __('pruvious-dashboard', '$item link', {
              item: __('pruvious-dashboard', capitalize(linked.collection.label.record.singular, false) as any),
            })
          }}:
        </strong>

        <a
          v-pruvious-tooltip="__('pruvious-dashboard', 'Open in new tab')"
          :href="linked.url"
          :title="linked.url"
          data-ignore-autofocus
          target="_blank"
          class="truncate text-gray-400 transition hocus:text-primary-700"
        >
          {{ linked.url }}
        </a>
      </li>
    </ul>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import { nextTick, onBeforeUnmount, ref, useRuntimeConfig, watch } from '#imports'
import {
  prefixPrimaryLanguage,
  primaryLanguage,
  type CollectionName,
  type PublicPagesOptions,
  type StandardFieldOptions,
} from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { debounce } from 'perfect-debounce'
import { usePruviousDashboard, type SimpleCollection } from '../../composables/dashboard/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { useUser } from '../../composables/user'
import { clearArray, next, prev, toArray, uniqueArray } from '../../utils/array'
import { blurActiveElement } from '../../utils/dom'
import { pruviousFetch } from '../../utils/fetch'
import { capitalize, joinRouteParts, resolveCollectionPathPrefix } from '../../utils/string'
import { getCapabilities } from '../../utils/users'

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
  options: StandardFieldOptions['link']

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
  'update:modelValue': [string]
}>()

const dashboard = usePruviousDashboard()
const runtimeConfig = useRuntimeConfig()
const user = useUser()

const animatingHeight = ref<boolean>(false)
const focused = ref<boolean>(false)
const highlightedSuggestion = ref<Suggestion>()
const id = pruviousUnique('link-field')
const inputValue = ref('')
const labelHovered = ref<boolean>(false)
const linked = ref<{
  collection: SimpleCollection
  canUpdate: boolean
  recordId: number
  url: string
} | null>(null)
const name = props.options.name || pruviousUnique(props.fieldKey || 'link-field')
const publicCollections = Object.values(dashboard.value.collections).filter((c) => c.publicPages)
const spinner = ref<boolean>(false)
const suggestionChoices = ref<
  { group: string; groupLabel: string; choices: Suggestion[]; page: number; isLastPage: boolean }[]
>([])
const suggestionsEl = ref<HTMLDivElement>()
const suggestionsHeight = ref<number>(0)
const userCapabilities = getCapabilities(user.value)

const PruviousInputError = dashboardMiscComponent.InputError()

let heightAnimationTimeout: NodeJS.Timeout | undefined
let prevValue: string = ''
let spinnerTimeout: NodeJS.Timeout | undefined
let suggestionsCounter = 0
let linkedCounter = 0

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.modelValue,
  async (value) => {
    if (inputValue.value !== value) {
      inputValue.value = value
    }

    const match = value.match(/^([a-z0-9-]+):([1-9][0-9]*?)([#\?].*)?$/)
    const c = match ? publicCollections.find((c) => c.name === match[1]) : null

    if (match && c) {
      const counter = ++linkedCounter
      const pathField = (c.publicPages as PublicPagesOptions).pathField ?? 'path'
      const response = await pruviousFetch<Record<string, any>>(`collections/${match[1]}/${match[2]}`, {
        query: { select: uniqueArray(['id', 'language', pathField]).filter(Boolean).join(',') },
        dispatchEvents: false,
      })

      if (response.success && counter === linkedCounter) {
        const path = joinRouteParts(
          response.data.language === primaryLanguage && !prefixPrimaryLanguage ? '' : response.data.language,
          resolveCollectionPathPrefix(c, response.data.language, primaryLanguage),
          response.data[pathField],
        )

        linked.value = {
          collection: c,
          canUpdate: user.value?.isAdmin || !!userCapabilities[`collection-${c.name as CollectionName}-update`],
          recordId: response.data.id,
          url: window.location.origin + (path === '/' ? '' : path) + (match[3] ?? ''),
        }
      } else {
        linked.value = null
      }
    } else {
      linked.value = null
    }
  },
  { immediate: true },
)

watch(suggestionsHeight, () => {
  animatingHeight.value = true
  clearTimeout(heightAnimationTimeout)
  heightAnimationTimeout = setTimeout(() => (animatingHeight.value = false), 150)
})

function onFocus(event: Event) {
  focused.value = true
  clearArray(suggestionChoices.value)
  prevValue = (event.target as HTMLInputElement).value
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
  emit('update:modelValue', inputValue.value)
}

function highlightNext() {
  highlightedSuggestion.value = next(
    { value: highlightedSuggestion.value?.value ?? '' },
    suggestionChoices.value.flatMap(({ choices }) => choices) ?? [],
    'value',
  )

  scrollToHighlightedSuggestion()
}

function highlightPrev() {
  highlightedSuggestion.value = prev(
    { value: highlightedSuggestion.value?.value ?? '' },
    suggestionChoices.value.flatMap(({ choices }) => choices) ?? [],
    'value',
  )

  scrollToHighlightedSuggestion()
}

function onEnterKey(event: Event) {
  if (highlightedSuggestion.value) {
    event.preventDefault()
    event.stopPropagation()
    pickSuggestion(highlightedSuggestion.value)
    blurActiveElement()
  }
}

async function getSuggestions(page: number, groups?: string | string[]) {
  if (focused.value) {
    spinnerTimeout = setTimeout(() => (spinner.value = true), 50)

    const counter = ++suggestionsCounter
    const collections = publicCollections.filter((c) => !groups || toArray(groups).includes(c.name))

    const responses = await Promise.all(
      collections.map((c) =>
        pruviousFetch<{ records: Record<string, any>[]; lastPage: number }>(`collections/${c.name}`, {
          query: {
            search: inputValue.value,
            select: uniqueArray([
              'id',
              c.dashboard.overviewTable.searchLabel[0],
              (c.publicPages as PublicPagesOptions).pathField ?? 'path',
            ])
              .filter(Boolean)
              .join(','),
            where: `language[=][${props.record?.language ?? primaryLanguage}]`,
            page,
            perPage: 30,
            order: ':default',
          },
        }),
      ),
    )

    clearTimeout(spinnerTimeout)

    if (counter === suggestionsCounter) {
      if (page === 1) {
        clearArray(suggestionChoices.value)
      }

      const newItems = responses
        .filter((r) => r.success)
        .map((r, i) => {
          const c = collections[i]
          const a = c.dashboard.overviewTable.searchLabel[0]
          const pp = c.publicPages as PublicPagesOptions
          const pathPrefix = resolveCollectionPathPrefix(c, props.record?.language ?? primaryLanguage, primaryLanguage)

          return {
            group: c.name,
            groupLabel: __('pruvious-dashboard', c.label.record.plural as any),
            choices: (r as any).data.records.map((record: Record<string, any>) => ({
              value: `${c.name}:${record.id}`,
              label:
                record[a] === '' || record[a] === null
                  ? __('pruvious-dashboard', c.fields[a].additional.emptyLabel as any)
                  : record[a],
              detail: joinRouteParts(
                props.record?.language === primaryLanguage && !prefixPrimaryLanguage
                  ? ''
                  : props.record?.language ?? primaryLanguage,
                pathPrefix,
                record[pp.pathField ?? 'path'],
              ),
              dimmed: record[a] === '',
            })),
            page,
            isLastPage: (r as any).data.lastPage === page,
          }
        })
        .flat()

      if (groups) {
        for (const _group of toArray(groups)) {
          const itemsGroup = suggestionChoices.value.find(({ group }) => group === _group)!
          const newGroupItems = newItems.find(({ group }) => group === _group)!

          itemsGroup.choices.push(...newGroupItems.choices)
          itemsGroup.page = newGroupItems.page
          itemsGroup.isLastPage = newGroupItems.isLastPage
        }
      } else {
        suggestionChoices.value.push(...newItems)
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
    suggestionChoices.value.length === 1 &&
    suggestionChoices.value[0].choices.length >= (props.options.visibleChoices ?? 6) &&
    suggestionsEl.value &&
    suggestionsEl.value.scrollTop + suggestionsEl.value.offsetHeight === suggestionsEl.value.scrollHeight
  ) {
    getSuggestions(suggestionChoices.value[0].page + 1, suggestionChoices.value[0].group)
  }
}

function pickSuggestion(choice: Suggestion) {
  setTimeout(() => emit('update:modelValue', choice.value))
}

function updateSuggestionsHeight() {
  suggestionsHeight.value =
    (Math.min(
      props.options.visibleChoices ?? 6,
      suggestionChoices.value.reduce((sum, { choices, isLastPage }) => {
        let r = sum + choices.length

        if (suggestionChoices.value.length > 1 && choices.length) {
          r++

          if (!isLastPage) {
            r++
          }
        }

        return r
      }, 0),
    ) *
      9) /
    4
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
