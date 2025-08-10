<template>
  <div
    ref="root"
    class="pui-dynamic-chips"
    :class="{
      'pui-dynamic-chips-has-errors': error,
      'pui-dynamic-chips-disabled': disabled,
      'pui-dynamic-chips-focused': isFocused,
      'pui-dynamic-chips-dropdown-visible': isDropdownVisible,
      'pui-dynamic-chips-empty': !modelValue.length,
      'pui-dynamic-chips-dragging': draggingIndex !== null,
      'pui-dynamic-chips-dragging-touch': draggingIndex !== null && isTouchDragging,
      [`pui-dynamic-chips-${variant}`]: variant,
    }"
    :style="{ '--pui-size': size, '--pui-width': root ? `${root!.offsetWidth}px` : undefined }"
  >
    <ul class="pui-dynamic-chips-list">
      <template v-for="(choice, i) of selectedChoices">
        <span
          v-if="draggingIndex !== null"
          @mouseup="drop(i)"
          @touchstart="drop(i)"
          class="pui-dynamic-chips-dropzone"
        ></span>

        <li
          @dblclick="$emit('dblclick', choice.value)"
          @mousedown="handleDrag(i, $event)"
          @touchstart.prevent="onTouchStart(i)"
          class="pui-dynamic-chips-item"
          :class="{
            'pui-dynamic-chips-item-dragging': draggingIndex === i,
            'pui-dynamic-chips-item-destructive': erroredItemsMap[i] || removeIndex === i,
          }"
        >
          <span :title="choice.label ?? String(choice.value)" class="pui-dynamic-chips-label">
            {{ (choice.label ?? choice.value) || '-' }}
          </span>
          <button
            v-if="!disabled"
            :disabled="draggingIndex !== null"
            :title="removeItemLabel"
            @blur="removeIndex = null"
            @click="
              () => {
                $emit(
                  'update:modelValue',
                  modelValue.filter((_, j) => i !== j),
                )
                $nextTick(filterChoices)
                removeIndex = null
              }
            "
            @focus="removeIndex = i"
            @mouseenter="removeIndex = i"
            @mouseleave="removeIndex = null"
            @touchstart.stop
            type="button"
            class="pui-dynamic-chips-remove pui-raw"
          >
            <Icon mode="svg" name="tabler:x" />
          </button>
        </li>

        <span
          v-if="draggingIndex !== null"
          @mouseup="drop(i + 1)"
          @touchstart="drop(i + 1)"
          class="pui-dynamic-chips-dropzone"
        ></span>
      </template>

      <input
        v-model="inputValue"
        :disabled="disabled || (maxItems !== false && modelValue.length >= maxItems)"
        :name="`${name}--input`"
        :placeholder="placeholder"
        @blur="
          () => {
            isFocused = false
            isDropdownVisible = false
            backspaceIndex = null
            removeIndex = null
          }
        "
        @focus="
          () => {
            isFocused = true
            isDropdownVisible = true
            highlightedIndex = 0
            dataInitialized = false
          }
        "
        @keydown="
          (event) => {
            if (backspaceIndex !== null && event.code !== 'Backspace') {
              removeIndex = null
              backspaceIndex = null
            }
          }
        "
        @keydown.arrow-down.prevent="focusNextChoice()"
        @keydown.arrow-up.prevent="focusPreviousChoice()"
        @keydown.backspace="
          () => {
            if (!inputValue) {
              if (backspaceIndex !== null && modelValue[backspaceIndex] && backspaceIndex === removeIndex) {
                $emit(
                  'update:modelValue',
                  modelValue.filter((_, i) => i !== backspaceIndex),
                )
                removeIndex = null
                backspaceIndex = null
                $nextTick(filterChoices)
              } else {
                backspaceIndex = modelValue.length ? modelValue.length - 1 : null
                removeIndex = backspaceIndex
              }
            }
          }
        "
        @keydown.enter="selectHighlightedChoice()"
        @keydown.escape.stop="input?.blur()"
        @keydown.tab="input?.blur()"
        autocomplete="off"
        ref="input"
        spellcheck="false"
        text="text"
        class="pui-dynamic-chips-input"
      />
    </ul>

    <PUIDropdown
      v-if="isDropdownVisible && dataInitialized"
      :handleControls="false"
      :offset="7"
      :reference="root!"
      :restoreFocus="false"
      @close="isDropdownVisible = false"
      ref="dropdown"
      class="pui-dynamic-chips-dropdown"
      :style="{
        '--pui-background': undefined,
        '--pui-foreground': undefined,
      }"
    >
      <button
        v-for="(choice, i) of filteredChoices"
        :title="choice.label ?? String(choice.value)"
        @click.prevent
        @mousedown.prevent="
          () => {
            $emit('update:modelValue', [...modelValue, choice.value])
            $nextTick(filterChoices)
          }
        "
        @mouseenter="
          () => {
            if (pointerEvents) {
              highlightedIndex = i
            }
          }
        "
        @mousemove="
          () => {
            if (pointerEvents) {
              highlightedIndex = i
            }
          }
        "
        class="pui-dynamic-chips-dropdown-item pui-raw"
        :class="{
          'pui-dynamic-chips-dropdown-item-highlighted': highlightedIndex === i,
          'pui-dynamic-chips-dropdown-item-detailed': hasDetails,
        }"
      >
        <span class="pui-dynamic-chips-dropdown-item-label">{{ (choice.label ?? choice.value) || '-' }}</span>
        <span v-if="choice.detail !== undefined" class="pui-dynamic-chips-dropdown-item-detail">
          {{ choice.detail || '-' }}
        </span>
      </button>

      <span v-if="!filteredChoices.length" class="pui-dynamic-chips-dropdown-no-results">
        <span>{{ noResultsLabel }}</span>
      </span>
    </PUIDropdown>

    <input :id="id" :name="name" :value="modelValue" hidden />
  </div>
</template>

<script lang="ts" setup>
import { clearArray, deepCompare, isDefined, isEmpty, isNotNull, isNull, type Primitive } from '@pruvious/utils'
import { onClickOutside, onKeyStroke, useDebounceFn, useEventListener, useScrollLock } from '@vueuse/core'

export interface PUIDynamicChipsChoiceModel {
  /**
   * An optional label to display for the choice in the chips field.
   *
   * If not provided, the `value` will be displayed instead.
   */
  label?: string

  /**
   * An optional detail to display for the choice in the chips field.
   * It is displayed in a grayed out style below the label.
   */
  detail?: string

  /**
   * The value of the choice in the chips field.
   */
  value: Primitive
}

export interface PUIDynamicChipsPaginatedChoices {
  /**
   * An array of choices for the chips field.
   */
  choices: PUIDynamicChipsChoiceModel[]

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
   * The value of the selected choice in the chips field.
   */
  modelValue: {
    type: Array as PropType<Primitive[]>,
    required: true,
  },

  /**
   * A function that resolves the choices for the chips field.
   * It receives the current `page` number and the search `keyword` as arguments.
   */
  choicesResolver: {
    type: Function as PropType<(page: number, keyword: string) => Promise<PUIDynamicChipsPaginatedChoices>>,
    required: true,
  },

  /**
   * A function that resolves the selected choices based on their values.
   */
  selectedChoicesResolver: {
    type: Function as PropType<(values: Primitive[]) => Promise<PUIDynamicChipsChoiceModel[]>>,
    required: true,
  },

  /**
   * Ensures all items in the array are unique.
   *
   * @default true
   */
  enforceUniqueItems: {
    type: Boolean,
    default: true,
  },

  /**
   * The maximum number of items allowed in the array.
   * Set to `false` to disable this limit.
   *
   * @default false
   */
  maxItems: {
    type: [Number, Boolean] as PropType<number | false>,
    default: false,
  },

  /**
   * The minimum number of items allowed in the array.
   * Set to `false` to disable this limit.
   *
   * @default false
   */
  minItems: {
    type: [Number, Boolean] as PropType<number | false>,
    default: false,
  },

  /**
   * Text label for the remove item button.
   *
   * @default 'Remove'
   */
  removeItemLabel: {
    type: String,
    default: 'Remove',
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

  /**
   * Defines the visual style variant of the chips.
   *
   * @default 'accent'
   */
  variant: {
    type: String as PropType<'primary' | 'secondary' | 'accent'>,
    default: 'accent',
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
   * An optional placeholder text to display when the text input is empty.
   */
  placeholder: {
    type: String,
  },

  /**
   * The duration in milliseconds to trigger dragging on touch devices.
   *
   * @default 500
   */
  touchDuration: {
    type: Number,
    default: 500,
  },

  /**
   * Indicates whether the input has errors.
   *
   * @default false
   */
  error: {
    type: Boolean,
    default: false,
  },

  /**
   * An array of indices of items that have errors.
   *
   * @default []
   */
  erroredItems: {
    type: Array as PropType<number[]>,
    default: () => [],
  },

  /**
   * Indicates whether the input is disabled.
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
   * The `name` attribute of the input field.
   */
  name: {
    type: String,
  },
})

const emit = defineEmits<{
  'update:modelValue': [value: Primitive[]]
  'dblclick': [value: Primitive]
}>()

const choices = ref<PUIDynamicChipsChoiceModel[]>([])
const filteredChoices = ref<PUIDynamicChipsChoiceModel[]>([])
const currentPage = ref(1)
const lastPage = ref(1)
const perPage = ref(10)
const total = ref(0)
const selectedChoices = ref<PUIDynamicChipsChoiceModel[]>(await props.selectedChoicesResolver(props.modelValue))
const root = useTemplateRef('root')
const input = useTemplateRef('input')
const dropdown = useTemplateRef('dropdown')
const isFocused = ref(false)
const isDropdownVisible = ref(false)
const inputValue = ref('')
const highlightedIndex = ref(0)
const erroredItemsMap = ref<Record<number, boolean>>({})
const backspaceIndex = ref<number | null>(null)
const removeIndex = ref<number | null>(null)
const draggingIndex = ref<number | null>(null)
const isTouchDragging = ref(false)
const dragEventListeners: (() => void)[] = []
const container = inject<Ref<HTMLDivElement> | null>('root', null)
const scrollLockWindow = isDefined(window) ? useScrollLock(window) : undefined
const scrollLockContainer = useScrollLock(container)
const fetchCounter = ref(0)
const isLoadingMore = ref(false)
const dataInitialized = ref(false)
const pointerEvents = ref(true)
const hasDetails = ref(false)

let touchTimeout: NodeJS.Timeout | undefined = undefined
let stopOutsideClickListener: (() => void) | undefined
let stopResizeListener: (() => void) | undefined

watch(
  () => props.modelValue,
  async (value) => {
    if (isEmpty(value)) {
      selectedChoices.value = []
    } else if (
      !deepCompare(
        value,
        selectedChoices.value.map((choice) => choice.value),
      )
    ) {
      selectedChoices.value = await props.selectedChoicesResolver(value)
    }
    erroredItemsMap.value = {}
    filterChoices()
  },
)

watch(
  () => props.erroredItems,
  () => {
    erroredItemsMap.value = Object.fromEntries(props.erroredItems.map((index) => [index, true]))
  },
  { immediate: true },
)

watch(draggingIndex, (index) => {
  if (isNull(index)) {
    document.body.style.removeProperty('cursor')
  } else {
    document.body.style.cursor = 'move'
  }
})

watch(inputValue, () => onInputValueChange())

watch(
  () => dropdown.value?.scrollable?.scroll.arrivedState.bottom,
  async (hasArrived) => {
    if (
      isDropdownVisible.value &&
      hasArrived &&
      !dropdown.value?.scrollable?.scroll.arrivedState.top &&
      currentPage.value < lastPage.value &&
      !isLoadingMore.value
    ) {
      isLoadingMore.value = true
      const fc = ++fetchCounter.value
      const paginatedChoices = await props.choicesResolver(currentPage.value + 1, inputValue.value)

      if (fc === fetchCounter.value) {
        choices.value.push(...paginatedChoices.choices)
        currentPage.value = paginatedChoices.currentPage
        filterChoices()
      }

      isLoadingMore.value = false
    }
  },
)

watch(isDropdownVisible, (visible) => {
  if (visible) {
    scrollLockWindow!.value = true
    scrollLockContainer.value = true
    stopOutsideClickListener = onClickOutside(root, () => input.value?.blur())
    stopResizeListener = useEventListener('resize', () => input.value?.blur())
    resolveChoices()
  } else {
    stopOutsideClickListener?.()
    stopResizeListener?.()
    scrollLockWindow!.value = false
    scrollLockContainer.value = false
  }
})

useEventListener('touchend', () => {
  clearTimeout(touchTimeout)
})

onUnmounted(() => {
  document.body.style.removeProperty('cursor')
  clearTimeout(touchTimeout)
})

async function resolveChoices() {
  if (isDropdownVisible.value) {
    const fc = ++fetchCounter.value
    const paginatedChoices = await props.choicesResolver(1, inputValue.value)

    if (isDropdownVisible.value && fc === fetchCounter.value && !deepCompare(paginatedChoices.choices, choices.value)) {
      choices.value = paginatedChoices.choices
      currentPage.value = paginatedChoices.currentPage
      lastPage.value = paginatedChoices.lastPage
      perPage.value = paginatedChoices.perPage
      total.value = paginatedChoices.total
      hasDetails.value = isDefined(paginatedChoices.choices[0]?.detail)
      filterChoices()
    }

    dataInitialized.value = true
  }
}

const onInputValueChange = useDebounceFn(resolveChoices, 250)

function selectHighlightedChoice() {
  const highlightedValue = filteredChoices.value[highlightedIndex.value]?.value

  if (isDefined(highlightedValue)) {
    if (props.maxItems === false || props.modelValue.length < props.maxItems) {
      emit('update:modelValue', [...props.modelValue, highlightedValue])
      nextTick(filterChoices)
    }
  }

  input.value!.select()
}

function filterChoices() {
  filteredChoices.value = choices.value.filter(
    (choice) => !props.enforceUniqueItems || !props.modelValue.includes(choice.value),
  )
  highlightedIndex.value = Math.min(
    filteredChoices.value.length - 1,
    highlightedIndex.value > -1 ? highlightedIndex.value : 0,
  )
  nextTick(dropdown.value?.update)
}

function focusPreviousChoice() {
  highlightedIndex.value = highlightedIndex.value - 1 < 0 ? 0 : highlightedIndex.value - 1
  scrollToHighlightedChoice()
}

function focusNextChoice() {
  highlightedIndex.value =
    highlightedIndex.value + 1 >= filteredChoices.value.length
      ? filteredChoices.value.length - 1
      : highlightedIndex.value + 1
  scrollToHighlightedChoice()
}

function scrollToHighlightedChoice() {
  if (highlightedIndex.value > -1 && dropdown.value?.scrollable?.scroll.y) {
    const { itemHeight, em } = dropdown.value.calcItemSizes()
    const realItemHeight = hasDetails.value ? itemHeight + em : itemHeight
    let top = realItemHeight * highlightedIndex.value
    if (
      top > 0 &&
      (!dropdown.value.scrollable.scroll.arrivedState.top || !dropdown.value.scrollable.scroll.arrivedState.bottom)
    ) {
      top -= em
    }
    pointerEvents.value = false
    dropdown.value.scrollable.scroll.y.value = top
    setTimeout(() => {
      pointerEvents.value = true
    })
  }
}

function handleDrag(itemIndex: number, event: MouseEvent) {
  if (event.button > 0 || props.disabled) {
    return
  }

  const [x, y] = [event.clientX, event.clientY]

  const stopMouseMove = useEventListener(document, 'mousemove', (event) => {
    if (Math.abs(event.clientX - x) > 5 || Math.abs(event.clientY - y) > 5) {
      draggingIndex.value = itemIndex
      isTouchDragging.value = false
      stopMouseMove()
    }
  })

  dragEventListeners.push(
    stopMouseMove,
    useEventListener(window, 'blur', stopDragging),
    useEventListener(document, 'mouseup', stopDragging),
    onKeyStroke('Escape', stopDragging),
  )
}

function onTouchStart(itemIndex: number) {
  if (!props.disabled) {
    touchTimeout = setTimeout(() => {
      draggingIndex.value = itemIndex
      isTouchDragging.value = true
      clearTimeout(touchTimeout)
      dragEventListeners.push(useEventListener(document, 'touchstart', stopDragging))
    }, props.touchDuration)
  }
}

function drop(index: number) {
  if (isNotNull(draggingIndex.value)) {
    const items = [...props.modelValue]
    const draggedItem = items.splice(draggingIndex.value!, 1, null as any)[0]!
    items.splice(index, 0, draggedItem)
    emit('update:modelValue', items.filter(isNotNull))
  }
}

function stopDragging() {
  draggingIndex.value = null
  dragEventListeners.forEach((stop) => stop())
  clearArray(dragEventListeners)
}
</script>

<style>
.pui-dynamic-chips {
  --pui-background: var(--pui-card);
  --pui-foreground: var(--pui-card-foreground);
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: calc(2em + 0.25rem);
  padding: 0.125rem;
  background-color: hsl(var(--pui-card));
  border: 1px solid hsl(var(--pui-input));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow;
}

.pui-dynamic-chips-focused:not(.pui-dynamic-chips-disabled):not(.pui-dynamic-chips-dropdown-visible),
.pui-dynamic-chips:not(.pui-dynamic-chips-disabled):not(.pui-dynamic-chips-dropdown-visible):focus-within {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.pui-dynamic-chips-has-errors {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.pui-dynamic-chips-disabled.pui-dynamic-chips-empty {
  --pui-foreground: var(--pui-muted-foreground);
  background-color: hsl(var(--pui-muted));
  color: hsl(var(--pui-muted-foreground));
}

.pui-dynamic-chips-list {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  height: 100%;
  gap: 0.125rem;
}

.pui-dynamic-chips-item {
  display: flex;
  align-items: center;
  height: calc(2em - 0.125rem);
  gap: 0.375em;
  padding: 0 0.5em;
  user-select: none;
  background-color: hsl(var(--pui-background));
  border-radius: calc(var(--pui-radius) - 0.25rem);
  color: hsl(var(--pui-foreground));
  transition: var(--pui-transition);
  transition-property: background-color, color, box-shadow;
}

.pui-dynamic-chips:not(.pui-dynamic-chips-disabled) .pui-dynamic-chips-item {
  cursor: move;
}

.pui-dynamic-chips-primary .pui-dynamic-chips-item {
  --pui-background: var(--pui-primary);
  --pui-foreground: var(--pui-primary-foreground);
}

.pui-dynamic-chips-secondary .pui-dynamic-chips-item {
  --pui-background: var(--pui-secondary);
  --pui-foreground: var(--pui-secondary-foreground);
}

.pui-dynamic-chips-accent .pui-dynamic-chips-item,
.pui-dynamic-chips-primary.pui-dynamic-chips-dragging .pui-dynamic-chips-item:not(.pui-dynamic-chips-item-dragging) {
  --pui-background: var(--pui-accent);
  --pui-foreground: var(--pui-accent-foreground);
}

.pui-dynamic-chips .pui-dynamic-chips-item-destructive {
  --pui-background: var(--pui-destructive);
  --pui-foreground: var(--pui-destructive-foreground);
}

.pui-dynamic-chips-disabled .pui-dynamic-chips-item,
.pui-dynamic-chips .pui-dynamic-chips-item-dragging {
  --pui-background: var(--pui-muted);
  --pui-foreground: var(--pui-muted-foreground);
}

.pui-dynamic-chips-label {
  margin-top: -0.0625em;
  overflow: hidden;
  white-space: pre;
  text-overflow: ellipsis;
  font-size: calc(1em - 0.0625rem);
  font-weight: 500;
}

.pui-dynamic-chips-remove {
  flex-shrink: 0;
  border-radius: 50%;
  color: hsl(var(--pui-foreground));
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow;
}

.pui-dynamic-chips-remove:disabled {
  pointer-events: none;
}

.pui-dynamic-chips-remove:focus-visible {
  box-shadow:
    0 0 0 0.125rem hsl(var(--pui-background)),
    0 0 0 0.25rem hsl(var(--pui-destructive-foreground)),
    0 0 #0000;
  outline: 0.125rem solid transparent;
  outline-offset: 0.125rem;
}

.pui-dynamic-chips-dropzone {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  width: 0.5rem;
  margin: 0 -0.3125rem;
  height: calc(2em - 0.125rem);
  opacity: 0;
}

.pui-dynamic-chips-dropzone::before {
  content: '';
  flex-shrink: 0;
  width: 0.125rem;
  height: 100%;
  background-color: hsl(var(--pui-foreground));
  border-radius: calc(var(--pui-radius) - 0.25rem);
}

.pui-dynamic-chips-dropzone:hover,
.pui-dynamic-chips-dragging-touch .pui-dynamic-chips-dropzone {
  opacity: 1;
}

.pui-dynamic-chips-input {
  flex: 1;
  display: flex;
  min-width: 5rem;
  height: calc(2em - 0.125rem);
  padding: 0 0.375em;
  overflow: hidden;
  background-color: transparent;
  border: none;
  outline: none;
  font-size: 1em;
  line-height: 1.25;
  color: hsl(var(--pui-foreground));
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pui-dynamic-chips-input::placeholder {
  color: hsl(var(--pui-muted-foreground));
}

.pui-dynamic-chips-dropdown {
  width: var(--pui-width);
}

.pui-dynamic-chips-dropdown-item,
.pui-dynamic-chips-dropdown-item-label,
.pui-dynamic-chips-dropdown-item-detail {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pui-dynamic-chips-dropdown-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 2em;
  padding: 0 0.5em;
  border: none;
  background-color: hsl(var(--pui-background));
  border-radius: calc(var(--pui-radius) - 0.25rem);
  outline: none;
  color: hsl(var(--pui-foreground));
  text-decoration: none;
  text-align: left;
}

.pui-dynamic-chips-dropdown-item-detailed {
  height: 3em;
}

.pui-dynamic-chips-dropdown-item-highlighted {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-dynamic-chips-dropdown-item-detail {
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.875em;
}

.pui-dynamic-chips-dropdown-no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 2em;
  color: hsl(var(--pui-muted-foreground));
}

.pui-dynamic-chips-dropdown-no-results span {
  font-size: calc(1em - 0.0625rem);
}

.pui-dynamic-chips-dropdown .pui-dropdown-scrollable {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}
</style>
