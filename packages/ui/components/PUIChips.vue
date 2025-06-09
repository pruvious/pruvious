<template>
  <div
    ref="root"
    class="pui-chips"
    :class="{
      'pui-chips-has-errors': error,
      'pui-chips-disabled': disabled,
      'pui-chips-focused': isFocused,
      'pui-chips-dropdown-visible': isDropdownVisible && choices,
      'pui-chips-empty': !modelValue.length,
      'pui-chips-dragging': draggingIndex !== null,
      'pui-chips-dragging-touch': draggingIndex !== null && isTouchDragging,
      [`pui-chips-${variant}`]: variant,
    }"
    :style="{ '--pui-size': size, '--pui-width': root ? `${root!.offsetWidth}px` : undefined }"
  >
    <ul class="pui-chips-list">
      <template v-for="(value, i) of modelValue">
        <span v-if="draggingIndex !== null" @mouseup="drop(i)" @touchstart="drop(i)" class="pui-chips-dropzone"></span>

        <li
          @mousedown="handleDrag(i, $event)"
          @touchstart.prevent="onTouchStart(i)"
          class="pui-chips-item"
          :class="{
            'pui-chips-item-dragging': draggingIndex === i,
            'pui-chips-item-destructive': erroredItemsMap[i] || removeIndex === i,
          }"
        >
          <span :title="choices && labels[value] ? labels[value] : value" class="pui-chips-label">
            {{ choices && labels[value] ? labels[value] : value }}
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
            class="pui-chips-remove pui-raw"
          >
            <Icon mode="svg" name="tabler:x" />
          </button>
        </li>

        <span
          v-if="draggingIndex !== null"
          @mouseup="drop(i + 1)"
          @touchstart="drop(i + 1)"
          class="pui-chips-dropzone"
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
        @keydown.enter="processInputValue()"
        @keydown.escape.stop="input?.blur()"
        @keydown.tab="input?.blur()"
        autocomplete="off"
        ref="input"
        spellcheck="false"
        text="text"
        class="pui-chips-input"
      />
    </ul>

    <PUIDropdown
      v-if="isDropdownVisible && choices"
      :handleControls="false"
      :offset="7"
      :reference="root!"
      :restoreFocus="false"
      @close="isDropdownVisible = false"
      ref="dropdown"
      class="pui-chips-dropdown"
      :style="{
        '--pui-background': undefined,
        '--pui-foreground': undefined,
      }"
    >
      <button
        v-for="(choice, i) of filteredChoices"
        @click.prevent
        @mousedown.prevent="
          () => {
            $emit('update:modelValue', [...modelValue, choice.value])
            $nextTick(filterChoices)
          }
        "
        @mouseenter="highlightedIndex = i"
        class="pui-chips-dropdown-item pui-raw"
        :class="{ 'pui-chips-dropdown-item-highlighted': highlightedIndex === i }"
      >
        {{ choice.label || choice.value }}
      </button>

      <span v-if="!filteredChoices.length" class="pui-chips-dropdown-no-results">
        <span>{{ noResultsLabel }}</span>
      </span>
    </PUIDropdown>

    <input :id="id" :name="name" :value="modelValue" hidden />
  </div>
</template>

<script lang="ts" setup>
import { clearArray, isDefined, isNotNull, isNull, searchByKeywords } from '@pruvious/utils'
import { onClickOutside, onKeyStroke, useEventListener, useScrollLock } from '@vueuse/core'

export interface PUIChipsChoiceModel {
  /**
   * An optional label to display for the choice in the select field.
   *
   * If not provided, the `value` will be displayed instead.
   */
  label?: string

  /**
   * The value of the choice in the select field.
   * It must be unique among the choices in the group.
   */
  value: string
}

const props = defineProps({
  /**
   * The value of the chips field.
   */
  modelValue: {
    type: Array as PropType<string[]>,
    required: true,
  },

  /**
   * The available choices for the chips field.
   * When provided, the chips input will behave like a select dropdown and only allow selection from the given choices.
   *
   * By default, any text can be entered into the chips input.
   *
   * @default false
   */
  choices: {
    type: [Array, Boolean] as PropType<PUIChipsChoiceModel[] | false>,
    default: false,
  },

  /**
   * Controls whether to trim whitespace from the input value.
   *
   * @default true
   */
  trim: {
    type: Boolean,
    default: true,
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
  'update:modelValue': [value: string[]]
}>()

const root = useTemplateRef('root')
const input = useTemplateRef('input')
const dropdown = useTemplateRef('dropdown')
const isFocused = ref(false)
const isDropdownVisible = ref(false)
const inputValue = ref('')
const filteredChoices = ref<PUIChipsChoiceModel[]>(props.choices ? [...props.choices] : [])
const highlightedIndex = ref(0)
const labels = computed(() => {
  if (!props.choices) return {}
  return Object.fromEntries(props.choices.map((choice) => [choice.value, choice.label ?? choice.value]))
})
const erroredItemsMap = ref<Record<number, boolean>>({})
const backspaceIndex = ref<number | null>(null)
const removeIndex = ref<number | null>(null)
const draggingIndex = ref<number | null>(null)
const isTouchDragging = ref(false)
const dragEventListeners: (() => void)[] = []
const container = inject<Ref<HTMLDivElement> | null>('root', null)
const scrollLockWindow = isDefined(window) ? useScrollLock(window) : undefined
const scrollLockContainer = useScrollLock(container)

let touchTimeout: NodeJS.Timeout | undefined = undefined
let stopOutsideClickListener: (() => void) | undefined
let stopResizeListener: (() => void) | undefined

watch(
  () => props.modelValue,
  () => {
    erroredItemsMap.value = {}
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

watch(inputValue, filterChoices, { immediate: true })

watch(isDropdownVisible, (visible) => {
  if (visible && props.choices) {
    scrollLockWindow!.value = true
    scrollLockContainer.value = true
    stopOutsideClickListener = onClickOutside(root, () => input.value?.blur())
    stopResizeListener = useEventListener('resize', () => input.value?.blur())
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

function processInputValue() {
  const value = props.trim ? inputValue.value.trim().replace(/\s+/g, ' ') : inputValue.value

  if (props.choices) {
    const highlightedValue = filteredChoices.value[highlightedIndex.value]?.value
    if (isDefined(highlightedValue)) {
      if (props.enforceUniqueItems && props.modelValue.includes(value)) {
        inputValue.value = ''
      } else if (props.maxItems === false || props.modelValue.length < props.maxItems) {
        emit('update:modelValue', [...props.modelValue, highlightedValue])
        nextTick(filterChoices)
      }
    }
  } else {
    if (props.enforceUniqueItems && props.modelValue.includes(value)) {
      inputValue.value = ''
    } else if (props.maxItems === false || props.modelValue.length < props.maxItems) {
      emit('update:modelValue', [...props.modelValue, value])
      inputValue.value = ''
    }
  }

  input.value!.select()
}

function filterChoices() {
  if (props.choices) {
    filteredChoices.value = searchByKeywords(
      props.choices.filter(({ value }) => !props.modelValue.includes(value)),
      inputValue.value,
      ['label', 'value'],
    )
    highlightedIndex.value = Math.min(
      filteredChoices.value.length - 1,
      highlightedIndex.value > -1 ? highlightedIndex.value : 0,
    )
    dropdown.value?.update()
  }
}

function focusPreviousChoice() {
  if (props.choices) {
    highlightedIndex.value = highlightedIndex.value - 1 < 0 ? 0 : highlightedIndex.value - 1
    scrollToHighlightedChoice()
  }
}

function focusNextChoice() {
  if (props.choices) {
    highlightedIndex.value =
      highlightedIndex.value + 1 >= filteredChoices.value.length
        ? filteredChoices.value.length - 1
        : highlightedIndex.value + 1
    scrollToHighlightedChoice()
  }
}

function scrollToHighlightedChoice() {
  if (highlightedIndex.value > -1 && dropdown.value?.scrollable?.scroll.y) {
    const { itemHeight, em } = dropdown.value.calcItemSizes()
    let top = itemHeight * highlightedIndex.value
    if (
      top > 0 &&
      (!dropdown.value.scrollable.scroll.arrivedState.top || !dropdown.value.scrollable.scroll.arrivedState.bottom)
    ) {
      top -= em
    }
    dropdown.value.scrollable.scroll.y.value = top
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
.pui-chips {
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

.pui-chips-focused:not(.pui-chips-disabled):not(.pui-chips-dropdown-visible),
.pui-chips:not(.pui-chips-disabled):not(.pui-chips-dropdown-visible):focus-within {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.pui-chips-has-errors {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.pui-chips-disabled.pui-chips-empty {
  --pui-foreground: var(--pui-muted-foreground);
  background-color: hsl(var(--pui-muted));
  color: hsl(var(--pui-muted-foreground));
}

.pui-chips-list {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  height: 100%;
  gap: 0.125rem;
}

.pui-chips-item {
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

.pui-chips:not(.pui-chips-disabled) .pui-chips-item {
  cursor: move;
}

.pui-chips-primary .pui-chips-item {
  --pui-background: var(--pui-primary);
  --pui-foreground: var(--pui-primary-foreground);
}

.pui-chips-secondary .pui-chips-item {
  --pui-background: var(--pui-secondary);
  --pui-foreground: var(--pui-secondary-foreground);
}

.pui-chips-accent .pui-chips-item,
.pui-chips-primary.pui-chips-dragging .pui-chips-item:not(.pui-chips-item-dragging) {
  --pui-background: var(--pui-accent);
  --pui-foreground: var(--pui-accent-foreground);
}

.pui-chips .pui-chips-item-destructive {
  --pui-background: var(--pui-destructive);
  --pui-foreground: var(--pui-destructive-foreground);
}

.pui-chips-disabled .pui-chips-item,
.pui-chips .pui-chips-item-dragging {
  --pui-background: var(--pui-muted);
  --pui-foreground: var(--pui-muted-foreground);
}

.pui-chips-label {
  margin-top: -0.0625em;
  overflow: hidden;
  white-space: pre;
  text-overflow: ellipsis;
  font-size: calc(1em - 0.0625rem);
  font-weight: 500;
}

.pui-chips-remove {
  flex-shrink: 0;
  border-radius: 50%;
  color: hsl(var(--pui-foreground));
  transition: var(--pui-transition);
  transition-property: border-color, box-shadow;
}

.pui-chips-remove:disabled {
  pointer-events: none;
}

.pui-chips-remove:focus-visible {
  box-shadow:
    0 0 0 0.125rem hsl(var(--pui-background)),
    0 0 0 0.25rem hsl(var(--pui-destructive-foreground)),
    0 0 #0000;
  outline: 0.125rem solid transparent;
  outline-offset: 0.125rem;
}

.pui-chips-dropzone {
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

.pui-chips-dropzone::before {
  content: '';
  flex-shrink: 0;
  width: 0.125rem;
  height: 100%;
  background-color: hsl(var(--pui-foreground));
  border-radius: calc(var(--pui-radius) - 0.25rem);
}

.pui-chips-dropzone:hover,
.pui-chips-dragging-touch .pui-chips-dropzone {
  opacity: 1;
}

.pui-chips-input {
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

.pui-chips-input::placeholder {
  color: hsl(var(--pui-muted-foreground));
}

.pui-chips-dropdown {
  width: var(--pui-width);
}

.pui-chips-dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  height: 2em;
  padding: 0 0.5em;
  border: none;
  background-color: hsl(var(--pui-background));
  border-radius: calc(var(--pui-radius) - 0.25rem);
  outline: none;
  color: hsl(var(--pui-foreground));
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-decoration: none;
}

.pui-chips-dropdown-item-highlighted {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-chips-dropdown-no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 2em;
  color: hsl(var(--pui-muted-foreground));
}

.pui-chips-dropdown-no-results span {
  font-size: calc(1em - 0.0625rem);
}

.pui-chips-dropdown .pui-dropdown-scrollable {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}
</style>
