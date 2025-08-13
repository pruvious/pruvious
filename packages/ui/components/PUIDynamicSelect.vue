<template>
  <div
    :title="!selectedChoice || isExpanded ? undefined : (selectedChoice.label ?? String(selectedChoice.value))"
    class="pui-dynamic-select-wrapper"
  >
    <div
      :aria-expanded="isExpanded"
      :tabindex="disabled ? -1 : 0"
      @click="
        () => {
          if (!disabled) {
            toggle()
          }
        }
      "
      @keydown.down.prevent.stop="
        () => {
          if (isExpanded) {
            focusNext()
          } else {
            open()
          }
        }
      "
      @keydown.enter.prevent.stop="selectHighlightedOrClose"
      @keydown.escape.prevent.stop="
        () => {
          if (isExpanded) {
            close()
          } else {
            blurActiveElement()
          }
        }
      "
      @keydown.tab.prevent="focusFirst()"
      @keydown.up.prevent.stop="
        () => {
          if (isExpanded) {
            focusPrevious()
          } else {
            open()
          }
        }
      "
      @mousemove="unpauseMouseDelayed()"
      ref="root"
      role="combobox"
      type="text"
      class="pui-dynamic-select"
      :class="{
        'pui-dynamic-select-has-errors': error,
        'pui-dynamic-select-disabled': disabled,
        'pui-dynamic-select-expanded': isExpanded,
      }"
      :style="{ '--pui-size': size }"
    >
      <span v-if="selectedChoice" class="pui-dynamic-select-selected-choice">
        {{ (selectedChoice.label ?? selectedChoice.value) || '-' }}
      </span>

      <span v-else-if="placeholder" class="pui-dynamic-select-placeholder">
        {{ placeholder }}
      </span>

      <Icon mode="svg" name="tabler:selector" size="1.125em" class="pui-dynamic-select-icon" />

      <div
        @click.stop
        class="pui-dynamic-select-choices"
        :style="{
          height: choicesHeight ? `${choicesHeight}px` : undefined,
          transform: `translate3d(0, ${choicesTopOffset}px, 0)`,
        }"
      >
        <PUIScrollable @scrollStep="scrollChoices" ref="scrollable">
          <div
            class="pui-dynamic-select-keyword"
            :class="{ 'pui-dynamic-select-keyword-offset': scrollable?.isTopButtonVisible }"
          >
            <input
              v-model="keyword"
              :ariaLabel="searchLabel"
              :name="name ? `${name}--keyword` : undefined"
              :placeholder="searchLabel"
              @input="onKeywordInput()"
              autocomplete="off"
              ref="keywordInput"
              spellcheck="false"
              type="text"
              class="pui-dynamic-select-keyword-input"
            />
          </div>

          <template v-for="choice of choices">
            <PUIDynamicSelectChoice
              v-model:highlightedChoice="highlightedChoice"
              v-model:mousePaused="mousePaused"
              :choice="choice"
              :selectedValue="modelValue"
              @close="close"
              @select="emitChoice"
            />
          </template>

          <span v-if="!choices.length" class="pui-dynamic-select-no-results">
            <span>{{ noResultsLabel }}</span>
          </span>
        </PUIScrollable>
      </div>
    </div>
    <input :id="id" :name="name" :value="modelValue" hidden />
  </div>
</template>

<script lang="ts" setup>
import { blurActiveElement, deepCompare, isDefined, isNull, last, next, prev, type Primitive } from '@pruvious/utils'
import { onClickOutside, useDebounceFn, useEventListener, useScrollLock } from '@vueuse/core'
import { puiTrigger } from '../pui/trigger'
import type PUIScrollable from './PUIScrollable.vue'

export interface PUIDynamicSelectChoiceModel {
  /**
   * An optional label to display for the choice in the select field.
   *
   * If not provided, the `value` will be displayed instead.
   */
  label?: string

  /**
   * An optional detail to display for the choice in the select field.
   * It is displayed in a grayed out style below the label.
   */
  detail?: string

  /**
   * The value of the choice in the select field.
   */
  value: Primitive

  /**
   * Indicates whether the choice is disabled.
   *
   * @default false
   */
  disabled?: boolean
}

export interface PUIDynamicSelectPaginatedChoices {
  /**
   * An array of choices for the select field.
   */
  choices: PUIDynamicSelectChoiceModel[]

  /**
   * The current page number.
   */
  currentPage: number

  /**
   * The number of the last available page.
   */
  lastPage: number

  /**
   * Number of choices displayed per page.
   */
  perPage: number

  /**
   * Total count of all choices.
   */
  total: number
}

const props = defineProps({
  /**
   * The value of the selected choice in the select field.
   */
  modelValue: {
    type: null as unknown as PropType<Primitive>,
    required: true,
  },

  /**
   * A function that resolves the choices for the select field.
   * It receives the current `page` number and the search `keyword` as arguments.
   */
  choicesResolver: {
    type: Function as PropType<(page: number, keyword: string) => Promise<PUIDynamicSelectPaginatedChoices>>,
    required: true,
  },

  /**
   * A function that resolves the selected choice based on its value.
   */
  selectedChoiceResolver: {
    type: Function as PropType<(value: Primitive) => Promise<PUIDynamicSelectChoiceModel | null>>,
    required: true,
  },

  /**
   * Adjusts the size of the component.
   *
   * Examples:
   *
   * - -2 (very small)
   * - -1 (small)
   * - 0 (default size)
   * - 1 (large)
   * - 2 (very large)
   *
   * By default, the value is inherited as the CSS variable `--pui-size` from the parent element.
   */
  size: {
    type: Number,
  },

  /**
   * An optional placeholder text to show when no other label or value is displayed in the select field.
   */
  placeholder: {
    type: String,
  },

  /**
   * Indicates whether the select has errors.
   *
   * @default false
   */
  error: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates whether the select field is disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },

  /**
   * Defines a unique identifier (ID) which must be unique in the whole document.
   * Its purpose is to identify the element when linking (using a fragment identifier), scripting, or styling (with CSS).
   */
  id: {
    type: String,
  },

  /**
   * The `name` attribute of the hidden input element that holds the selected value.
   */
  name: {
    type: String,
  },

  /**
   * The placeholder for the search input field.
   *
   * @default 'Search...'
   */
  searchLabel: {
    type: String,
    default: 'Search...',
  },

  /**
   * Text label for the no results found message in the `choices` dropdown.
   *
   * @default 'No results found'
   */
  noResultsLabel: {
    type: String,
    default: 'No results found',
  },
})

const emit = defineEmits<{
  'commit': [value: Primitive]
  'update:modelValue': [value: Primitive]
}>()

const { listen } = puiTrigger()
const root = useTemplateRef('root')
const keywordInput = useTemplateRef('keywordInput')
const isExpanded = ref(false)
const choices = ref<PUIDynamicSelectChoiceModel[]>([])
const currentPage = ref(1)
const lastPage = ref(1)
const perPage = ref(10)
const total = ref(0)
const hasDetails = ref(false)
const selectedChoice = ref<PUIDynamicSelectChoiceModel | null>(await props.selectedChoiceResolver(props.modelValue))
const highlightedChoice = ref<PUIDynamicSelectChoiceModel>()
const choicesHeight = ref<number>()
const choicesTopOffset = ref(0)
const isLoadingMore = ref(false)
const scrollable = ref<InstanceType<typeof PUIScrollable>>()
const keyword = ref('')
const mousePaused = ref(false)
const container = inject<Ref<HTMLDivElement> | null>('root', null)
const fetchCounter = ref(0)

/**
 * Duration of the transition animations.
 */
let transitionDuration = 300

/**
 * Timeout to unpause mouse events after a delay following mouse movement.
 */
let unpauseMouseTimeout: ReturnType<typeof setInterval> | undefined

/**
 * Stops listening for focus events.
 */
let stopFocusListener: (() => void) | undefined

/**
 * Stops listening for click events outside the select field.
 */
let stopOutsideClickListener: (() => void) | undefined

/**
 * Stops listening for resize events.
 */
let stopResizeListener: (() => void) | undefined

/**
 * Locks the scroll when the choices list is expanded.
 */
const scrollLockWindow = isDefined(window) ? useScrollLock(window) : undefined
const scrollLockContainer = useScrollLock(container)

/**
 * Update selected choice when the model value changes.
 */
watch(
  () => props.modelValue,
  async (value) => {
    if (isNull(value)) {
      selectedChoice.value = null
    } else if (value !== selectedChoice.value?.value) {
      selectedChoice.value = await props.selectedChoiceResolver(value)
    }
  },
)

/**
 * Listens for click events on the associated label element.
 */
watch(
  () => props.id,
  (id) => {
    if (id) {
      stopFocusListener = listen(`focus:${id}`, () => {
        if (!props.disabled) {
          root.value?.focus()
        }
      })
    } else {
      stopFocusListener?.()
    }
  },
  { immediate: true },
)

/**
 * Handle loading more choices when scrolling to the bottom.
 */
watch(
  () => scrollable.value?.scroll.arrivedState.bottom,
  async (hasArrived) => {
    if (
      isExpanded.value &&
      hasArrived &&
      !scrollable.value?.scroll.arrivedState.top &&
      currentPage.value < lastPage.value &&
      !isLoadingMore.value
    ) {
      isLoadingMore.value = true
      const fc = ++fetchCounter.value
      const paginatedChoices = await props.choicesResolver(currentPage.value + 1, keyword.value)

      if (fc === fetchCounter.value) {
        choices.value.push(...paginatedChoices.choices)
        currentPage.value = paginatedChoices.currentPage
        updateSizes()
      }

      isLoadingMore.value = false
    }
  },
)

/**
 * Calculates the duration of the transition animations.
 */
onMounted(() => {
  const potd = getComputedStyle(document.body).getPropertyValue('--pui-overlay-transition-duration')
  transitionDuration = potd.endsWith('ms') ? parseInt(potd) : potd.endsWith('s') ? parseFloat(potd) * 1000 : 300
})

/**
 * Opens the choices list.
 */
async function open(event?: Event) {
  if (!isExpanded.value) {
    // Fetch choices
    const paginatedChoices = await props.choicesResolver(1, keyword.value)
    choices.value = paginatedChoices.choices
    currentPage.value = paginatedChoices.currentPage
    lastPage.value = paginatedChoices.lastPage
    perPage.value = paginatedChoices.perPage
    total.value = paginatedChoices.total
    hasDetails.value = isDefined(paginatedChoices.choices[0]?.detail)

    // Expand
    isExpanded.value = true

    // Close the choices list when the user clicks outside the select field
    stopOutsideClickListener = onClickOutside(root, () => close())

    // Close the choices list when the window is resized
    stopResizeListener = useEventListener('resize', () => close())

    // Lock parent scroll
    scrollLockWindow!.value = true
    scrollLockContainer.value = true

    // Calculate height and offsets
    updateSizes()

    // Pause mouse events
    mousePaused.value = true

    // Focus the keyword input
    setTimeout(() => keywordInput.value?.focus(), transitionDuration)

    // Prevent the default behavior of keydown events
    event?.preventDefault()
  }
}

/**
 * Closes the choices list.
 */
function close(event?: Event) {
  if (isExpanded.value) {
    // Collapse
    isExpanded.value = false

    // Reset the highlighted choice
    highlightedChoice.value = undefined

    // Stop listening for click events outside the select field
    stopOutsideClickListener?.()

    // Stop listening for resize events
    stopResizeListener?.()

    // Unlock window scroll
    scrollLockWindow!.value = false
    scrollLockContainer.value = false

    // Reset the choices list height and top offset
    choicesHeight.value = undefined
    choicesTopOffset.value = 0

    // Reset choices and pagination
    choices.value = []
    currentPage.value = 1
    lastPage.value = 1
    perPage.value = 0
    total.value = 0

    // Clear the keyword input
    keyword.value = ''

    // Prevent the default behavior of keydown events
    event?.preventDefault()
  }
}

/**
 * Toggles the visibility of the choices.
 */
function toggle(event?: Event) {
  if (isExpanded.value) {
    close(event)
  } else {
    open(event)
  }
}

/**
 * Focuses the previous choice in the list.
 */
function focusPrevious() {
  if (isExpanded.value) {
    const filteredChoices = choices.value.filter(({ disabled }) => !disabled)
    highlightedChoice.value = highlightedChoice.value
      ? prev(highlightedChoice.value, filteredChoices, { prop: 'value' })
      : last(filteredChoices)
    mousePaused.value = true
    scrollToHighlighted()
  }
}

/**
 * Focuses the next choice in the list.
 */
function focusNext() {
  if (isExpanded.value) {
    const filteredChoices = choices.value.filter(({ disabled }) => !disabled)
    highlightedChoice.value = highlightedChoice.value
      ? next(highlightedChoice.value, filteredChoices, { prop: 'value' })
      : filteredChoices[0]
    mousePaused.value = true
    scrollToHighlighted()
  }
}

/**
 * Focuses the first choice in the list.
 */
function focusFirst() {
  if (isExpanded.value) {
    highlightedChoice.value = choices.value.filter(({ disabled }) => !disabled)[0]
    mousePaused.value = true
    scrollToHighlighted()
  }
}

/**
 * Selects the highlighted choice and closes the choices list.
 */
function selectHighlighted(event?: Event) {
  if (isExpanded.value && highlightedChoice.value && !highlightedChoice.value.disabled) {
    emitChoice(highlightedChoice.value)
    close(event)
  }
}

/**
 * Selects the highlighted choice and/or closes the choices list.
 */
function selectHighlightedOrClose(event?: Event) {
  if (isExpanded.value) {
    if (highlightedChoice.value) {
      selectHighlighted(event)
    } else {
      close(event)
    }
  }
}

/**
 * Emits the `choice` value.
 */
function emitChoice(choice: PUIDynamicSelectChoiceModel) {
  selectedChoice.value = choice
  emit('commit', choice.value)
  emit('update:modelValue', choice.value)
}

/**
 * Scrolls the choices list to the highlighted choice.
 */
function scrollToHighlighted() {
  const { em, itemHeight, detailedItemHeight } = calcItemSizes()
  const height = hasDetails.value ? detailedItemHeight : itemHeight

  let offset = 0
  let found = false

  for (const choice of choices.value) {
    if (choice.value === highlightedChoice.value?.value) {
      found = true
      break
    }
    offset++
  }

  let top = found ? height * offset : 0

  // Reduce the top offset by the height of the top button
  if (top > 0 && (!scrollable.value?.scroll.arrivedState.top || !scrollable.value?.scroll.arrivedState.bottom)) {
    top -= em
  }

  scrollable.value?.$el.scrollTo({ top, behavior: 'instant' })
}

/**
 * Scrolls the choices list in the specified `direction`.
 * The scroll increment is equal to the height of an item in the choices list.
 */
function scrollChoices(direction: 'up' | 'down') {
  if (isExpanded.value && !mousePaused.value) {
    const { itemHeight, detailedItemHeight } = calcItemSizes()
    const height = hasDetails.value ? detailedItemHeight : itemHeight
    const scrollTop = scrollable.value?.$el.scrollTop ?? 0

    scrollable.value?.$el.scrollTo({
      top: scrollTop + (direction === 'up' ? -height : height),
      behavior: 'instant',
    })
  }
}

/**
 * Calculates the base font size, em unit, and the height of an item in the choices list.
 *
 * @returns the calculated sizes in pixels.
 */
function calcItemSizes() {
  const baseFontSize = +getComputedStyle(document.documentElement).getPropertyValue('font-size').slice(0, -2)
  const sizeVar = root.value ? getComputedStyle(root.value).getPropertyValue('--pui-size') : undefined
  const size = sizeVar ? +sizeVar : 0
  const em = baseFontSize + size * 0.125 * baseFontSize
  const itemHeight = 2 * em + 0.25 * baseFontSize - 2
  const detailedItemHeight = 3 * em + 0.25 * baseFontSize - 2

  return { baseFontSize, em, itemHeight, detailedItemHeight }
}

/**
 * Resumes mouse event handling after a 150ms delay following mouse movement.
 */
function unpauseMouseDelayed() {
  if (mousePaused.value && !unpauseMouseTimeout) {
    unpauseMouseTimeout = setTimeout(() => {
      mousePaused.value = false
      unpauseMouseTimeout = undefined
    }, 150)
  }
}

const onKeywordInput = useDebounceFn(async () => {
  if (isExpanded.value) {
    highlightedChoice.value = undefined
    const fc = ++fetchCounter.value
    const paginatedChoices = await props.choicesResolver(1, keyword.value)

    if (isExpanded.value && fc === fetchCounter.value && !deepCompare(paginatedChoices.choices, choices.value)) {
      choices.value = paginatedChoices.choices
      currentPage.value = paginatedChoices.currentPage
      lastPage.value = paginatedChoices.lastPage
      perPage.value = paginatedChoices.perPage
      total.value = paginatedChoices.total
      updateSizes()
      focusFirst()
    }
  }
}, 250)

/**
 * Updates the height and offsets of the choices list.
 */
function updateSizes() {
  const { itemHeight, detailedItemHeight } = calcItemSizes()
  const rootRect = root.value!.getBoundingClientRect()
  const parentHeight = container ? container.value.offsetHeight : window.innerHeight
  const rootTop = container ? rootRect.top - container.value.getBoundingClientRect().top : rootRect.top
  const rootBottom = parentHeight - rootTop

  let height = itemHeight + 2

  if (choices.value.length) {
    for (let i = 1; i <= Math.min(choices.value.length, 11); i++) {
      height += hasDetails.value ? detailedItemHeight : itemHeight

      if (height + 4 > parentHeight) {
        height = parentHeight - 6
        break
      }
    }
  } else {
    height += itemHeight

    if (height + 4 > parentHeight) {
      height = parentHeight - 6
    }
  }

  choicesHeight.value = height

  if (rootBottom > choicesHeight.value) {
    choicesTopOffset.value = 0
  } else {
    choicesTopOffset.value = rootBottom - choicesHeight.value - 2
    choicesTopOffset.value += 4
    choicesHeight.value -= 10
  }
}
</script>

<style>
.pui-dynamic-select-wrapper {
  width: 100%;
}

.pui-dynamic-select {
  --pui-background: var(--pui-card);
  --pui-foreground: var(--pui-card-foreground);
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(0.5em + 0.125rem);
  width: 100%;
  height: calc(2em + 0.25rem);
  padding: 0 0.5em;
  background-color: hsl(var(--pui-background));
  border: 1px solid hsl(var(--pui-input));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  cursor: pointer;
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  line-height: 1.25;
  color: hsl(var(--pui-foreground));
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow;
}

.pui-dynamic-select-expanded {
  cursor: default;
}

.pui-dynamic-select-has-errors {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.pui-dynamic-select:not(.pui-dynamic-select-disabled):focus,
.pui-dynamic-select:not(.pui-dynamic-select-disabled):focus-within {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.pui-dynamic-select-disabled {
  --pui-foreground: var(--pui-muted-foreground);
  cursor: default;
  background-color: hsl(var(--pui-muted));
  box-shadow: none;
  color: hsl(var(--pui-muted-foreground));
}

.pui-dynamic-select-selected-choice,
.pui-dynamic-select-placeholder {
  margin: auto 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pui-dynamic-select-placeholder {
  color: hsl(var(--pui-muted-foreground));
}

.pui-dynamic-select-icon {
  flex-shrink: 0;
  margin-left: auto;
}

.pui-dynamic-select-choices {
  position: absolute;
  z-index: 11;
  top: -1px;
  right: -1px;
  left: -1px;
  height: calc(100% + 2px);
  overflow: hidden;
  background-color: hsl(var(--pui-background));
  border: 1px solid transparent;
  border-radius: calc(var(--pui-radius) - 0.125rem);
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
  visibility: hidden;
}

.pui-dynamic-select-expanded .pui-dynamic-select-choices {
  height: calc(100% + 2px);
  visibility: visible;
  transition: var(--pui-transition);
  transition-property: height, visibility, transform;
}

.pui-dynamic-select-choice {
  display: flex;
  align-items: center;
  width: 100%;
  height: calc(2em + 0.25rem - 2px);
  padding: 0 calc(0.5em - 1px);
  border: 1px solid hsl(var(--pui-background));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  cursor: pointer;
  color: hsl(var(--pui-foreground));
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  line-height: 1.25;
  line-height: round(calc(1.25 * 1em), 1px);
}

.pui-dynamic-select-choice-detailed {
  height: calc(3em + 0.25rem - 2px);
}

.pui-dynamic-select-choice-selected {
  display: flex;
  justify-content: space-between;
  gap: 1em;
  padding-right: calc(0.5em + 1px);
}

.pui-dynamic-select-choice-highlighted {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-dynamic-select-choice-disabled {
  color: hsl(var(--pui-muted-foreground));
}

.pui-dynamic-select-choice-content,
.pui-dynamic-select-choice-label,
.pui-dynamic-select-choice-detail {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pui-dynamic-select-choice-content {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.pui-dynamic-select-choice-detail {
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.875em;
}

.pui-dynamic-select-keyword {
  position: sticky;
  top: 0;
  width: 100%;
  height: calc(2em + 0.25rem);
  margin: -1px;
  background-color: hsl(var(--pui-background));
  transition: var(--pui-transition);
  transition-property: top;
}

.pui-dynamic-select-keyword-offset {
  top: 1em;
}

.pui-dynamic-select-keyword-input {
  width: 100%;
  height: 100%;
  padding: 0 calc(0.5em + 0.0625rem);
  background-color: transparent;
  border: none;
  outline: none;
  font-size: 1em;
  line-height: 1.25;
  color: hsl(var(--pui-foreground));
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pui-dynamic-select-keyword-input::placeholder {
  color: hsl(var(--pui-muted-foreground));
}

.pui-dynamic-select-no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: calc(2em + 0.25rem - 2px);
  color: hsl(var(--pui-muted-foreground));
}

.pui-dynamic-select-no-results span {
  font-size: calc(1em - 0.0625rem);
}
</style>
