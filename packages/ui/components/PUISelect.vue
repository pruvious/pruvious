<template>
  <div class="pui-select-wrapper">
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
      @keydown.escape.prevent.stop="close"
      @keydown.space="selectHighlightedOrToggle"
      @keydown.tab="focusFirst"
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
      class="pui-select"
      :class="{
        'pui-select-has-errors': error,
        'pui-select-disabled': disabled,
        'pui-select-expanded': isExpanded,
      }"
      :style="{ '--pui-size': size }"
    >
      <span v-if="selectedChoice" class="pui-select-selected-choice">
        {{ selectedChoice.label ?? selectedChoice.value }}
      </span>

      <span v-if="!selectedChoice && placeholder" class="pui-select-placeholder">{{ placeholder }}</span>

      <Icon mode="svg" name="tabler:selector" size="1.125em" class="pui-select-icon" />

      <div
        @click.stop
        class="pui-select-choices"
        :style="{
          height: choicesHeight ? `${choicesHeight}px` : undefined,
          transform: `translate3d(0, ${choicesTopOffset}px, 0)`,
        }"
      >
        <PUIScrollable @scrollStep="scrollChoices" ref="scrollable">
          <template v-for="choice of choices">
            <div v-if="'group' in choice" class="pui-select-group">
              <span
                class="pui-select-group-label"
                :class="{ 'pui-select-group-label-offset': scrollable?.isTopButtonVisible }"
              >
                {{ choice.group }}
              </span>

              <PUISelectChoice
                v-for="_choice of choice.choices"
                v-model:highlightedChoice="highlightedChoice"
                v-model:mousePaused="mousePaused"
                :choice="_choice"
                :keywordHiglight="keywordHiglight"
                :keywordTimeout="keywordTimeout"
                :selectedValue="modelValue"
                @close="close"
                @select="emitValue($event.value)"
              />
            </div>

            <PUISelectChoice
              v-else
              v-model:highlightedChoice="highlightedChoice"
              v-model:mousePaused="mousePaused"
              :choice="choice"
              :keywordHiglight="keywordHiglight"
              :keywordTimeout="keywordTimeout"
              :selectedValue="modelValue"
              @close="close"
              @select="emitValue($event.value)"
            />
          </template>
        </PUIScrollable>
      </div>
    </div>
    <input :id="id" :name="name" :value="modelValue" hidden />
  </div>
</template>

<script lang="ts" setup>
import { isDefined, isString, last, next, prev, searchByKeywords, type Primitive } from '@pruvious/utils'
import { onClickOutside, useEventListener, useScrollLock, useTimeout } from '@vueuse/core'
import type PUIScrollable from './PUIScrollable.vue'

export interface PUISelectChoiceModel {
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
  value: Primitive
}

export interface PUISelectChoiceGroupModel {
  /**
   * Text that describes a group of selectable options.
   * This label is used to organize and categorize related choices.
   */
  group: string

  /**
   * An array of choices that will be shown in the group.
   * Each choice requires a unique `value` that must be distinct across all groups and choices.
   */
  choices: PUISelectChoiceModel[]
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
   * The choices to display in the select field.
   *
   * @example
   * ```ts
   * [
   *   { label: 'UTC', value: 'utc' },
   *   {
   *     group: 'North America',
   *     choices: [
   *       { label: 'Eastern Standard Time (EST)', value: 'est' },
   *       { label: 'Central Standard Time (CST)', value: 'cst' },
   *       { label: 'Mountain Standard Time (MST)', value: 'mst' },
   *       { label: 'Pacific Standard Time (PST)', value: 'pst' },
   *       { label: 'Alaska Standard Time (AKST)', value: 'akst' },
   *       { label: 'Hawaii-Aleutian Standard Time (HST)', value: 'hst' },
   *     ],
   *   },
   *   {
   *     group: 'Europe & Africa',
   *     choices: [
   *       { label: 'Greenwich Mean Time (GMT)', value: 'gmt' },
   *       { label: 'Central European Time (CET)', value: 'cet' },
   *       { label: 'Eastern European Time (EET)', value: 'eet' },
   *       { label: 'Western European Summer Time (WEST)', value: 'west' },
   *       { label: 'Central Africa Time (CAT)', value: 'cat' },
   *       { label: 'East Africa Time (EAT)', value: 'eat' },
   *     ],
   *   },
   *   {
   *     group: 'Asia',
   *     choices: [
   *       { label: 'Moscow Time (MSK)', value: 'msk' },
   *       { label: 'India Standard Time (IST)', value: 'ist' },
   *       { label: 'China Standard Time (CST)', value: 'cst_china' },
   *       { label: 'Japan Standard Time (JST)', value: 'jst' },
   *       { label: 'Korea Standard Time (KST)', value: 'kst' },
   *       { label: 'Indonesia Central Standard Time (WITA)', value: 'ist_indonesia' },
   *     ],
   *   },
   *   {
   *     group: 'Australia & Pacific',
   *     choices: [
   *       { label: 'Australian Western Standard Time (AWST)', value: 'awst' },
   *       { label: 'Australian Central Standard Time (ACST)', value: 'acst' },
   *       { label: 'Australian Eastern Standard Time (AEST)', value: 'aest' },
   *       { label: 'New Zealand Standard Time (NZST)', value: 'nzst' },
   *       { label: 'Fiji Time (FJT)', value: 'fjt' },
   *     ],
   *   },
   *   {
   *     group: 'South America',
   *     choices: [
   *       { label: 'Argentina Time (ART)', value: 'art' },
   *       { label: 'Bolivia Time (BOT)', value: 'bot' },
   *       { label: 'Brasilia Time (BRT)', value: 'brt' },
   *       { label: 'Chile Standard Time (CLT)', value: 'clt' },
   *     ],
   *   },
   * ]
   * ```
   */
  choices: {
    type: Array as PropType<(PUISelectChoiceModel | PUISelectChoiceGroupModel)[]>,
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
   * An optional placeholder text to display when no (valid) choice is selected.
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
})

const emit = defineEmits<{
  'commit': [value: Primitive]
  'update:modelValue': [value: Primitive]
}>()

const { listen } = puiTrigger()
const root = useTemplateRef('root')
const isExpanded = ref(false)
const selectedChoice = ref<PUISelectChoiceModel>()
const highlightedChoice = ref<PUISelectChoiceModel>()
const choicesHeight = ref<number>()
const choicesTopOffset = ref(0)
const scrollable = ref<InstanceType<typeof PUIScrollable>>()
const mousePaused = ref(false)
const keywordHiglight = ref<[number, number]>([-1, -1])
const keywordTimeout = useTimeout(750, { controls: true })

/**
 * Timeout to unpause mouse events after a delay following mouse movement.
 */
let unpauseMouseTimeout: ReturnType<typeof setInterval> | undefined

/**
 * Buffer of the entered keyword used to search for a choice.
 */
let keyword = ''

/**
 * Stops listening for focus events
 */
let stopFocusListener: (() => void) | undefined

/**
 * Stops the listener for keydown events that triggers searches in the choices list.
 */
let stopSearchListener: (() => void) | undefined

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
const scrollLock = isDefined(window) ? useScrollLock(window) : undefined

/**
 * Updates the `selectedChoice`.
 */
watch(
  () => [props.modelValue, props.choices],
  () => {
    selectedChoice.value = flatChoices().find((choice) => choice.value === props.modelValue)
  },
  { immediate: true },
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
 * Returns the flat list of choices.
 */
function flatChoices() {
  return props.choices.flatMap((choice) => ('group' in choice ? choice.choices : choice))
}

/**
 * Opens the choices list.
 */
function open(event?: Event) {
  if (!isExpanded.value) {
    // Expand
    isExpanded.value = true

    // Listen for keydown events for search
    stopSearchListener = useEventListener(root, 'keydown', search)

    // Close the choices list when the user clicks outside the select field
    stopOutsideClickListener = onClickOutside(root, () => close())

    // Close the choices list when the window is resized
    stopResizeListener = useEventListener('resize', () => close())

    // Lock window scroll
    scrollLock!.value = true

    // Calculate the top offset of the choices list
    const items = props.choices.reduce((acc, choice) => acc + ('group' in choice ? choice.choices.length + 1 : 1), 0)
    const { itemHeight } = calcItemSizes()
    const rootBottom = window.innerHeight - root.value!.getBoundingClientRect().top

    let height = 0

    for (let i = 1; i <= Math.min(items, 12); i++) {
      height += itemHeight

      if (height + 4 > window.innerHeight) {
        height = window.innerHeight - 6
        break
      }
    }

    choicesHeight.value = height + 2

    if (rootBottom > choicesHeight.value) {
      choicesTopOffset.value = 0
    } else {
      choicesTopOffset.value = rootBottom - choicesHeight.value - 2
      choicesTopOffset.value += 4
      choicesHeight.value -= 8
    }

    // Set highlighted choice and scroll to it
    highlightedChoice.value = selectedChoice.value
    scrollToHighlighted()

    // Pause mouse events
    mousePaused.value = true

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

    // Stop listening for keydown events for search
    stopSearchListener?.()

    // Stop listening for click events outside the select field
    stopOutsideClickListener?.()

    // Stop listening for resize events
    stopResizeListener?.()

    // Unlock window scroll
    scrollLock!.value = false

    // Reset the choices list height and top offset
    choicesHeight.value = undefined
    choicesTopOffset.value = 0

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
 *
 * If the choices list is not expanded, it opens it
 */
function focusPrevious(event?: Event) {
  open(event)
  highlightedChoice.value = highlightedChoice.value
    ? prev(highlightedChoice.value, flatChoices(), { prop: 'value' })
    : last(flatChoices())
  mousePaused.value = true
  scrollToHighlighted()
}

/**
 * Focuses the next choice in the list.
 *
 * If the choices list is not expanded, it opens it.
 */
function focusNext(event?: Event) {
  open(event)
  highlightedChoice.value = highlightedChoice.value
    ? next(highlightedChoice.value, flatChoices(), { prop: 'value' })
    : flatChoices()[0]
  mousePaused.value = true
  scrollToHighlighted()
}

/**
 * Focuses the first choice in the list.
 */
function focusFirst(event?: Event) {
  if (isExpanded.value) {
    highlightedChoice.value = flatChoices()[0]
    mousePaused.value = true
    scrollToHighlighted()
    event?.preventDefault()
  }
}

/**
 * Selects the highlighted choice and closes the choices list.
 */
function selectHighlighted(event?: Event) {
  if (isExpanded.value && highlightedChoice.value) {
    emitValue(highlightedChoice.value.value)
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
 * Selects the highlighted choice and/or toggles the visibility of the choices list.
 */
function selectHighlightedOrToggle(event?: Event) {
  if (isExpanded.value && highlightedChoice.value) {
    selectHighlighted(event)
  } else {
    toggle(event)
  }
}

/**
 * Emits the selected value when a choice is selected.
 */
function emitValue(value: Primitive) {
  emit('commit', value)
  emit('update:modelValue', value)
}

/**
 * Scrolls the choices list to the highlighted choice.
 */
function scrollToHighlighted() {
  const { em, itemHeight } = calcItemSizes()

  let offset = 0
  let found = false

  for (const choice of props.choices) {
    if ('group' in choice) {
      for (const { value } of choice.choices) {
        if (value === highlightedChoice.value?.value) {
          found = true
          break
        }

        offset++
      }
    } else if (choice.value === highlightedChoice.value?.value) {
      found = true
    }

    if (found) {
      break
    }

    offset++
  }

  let top = found ? itemHeight * offset : 0

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
    const { itemHeight } = calcItemSizes()
    const scrollTop = scrollable.value?.$el.scrollTop ?? 0

    scrollable.value?.$el.scrollTo({
      top: scrollTop + (direction === 'up' ? -itemHeight : itemHeight),
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

  return { baseFontSize, em, itemHeight }
}

/**
 * Finds and focuses the choice that matches the entered keyword.
 */
function search(event: KeyboardEvent) {
  if (isExpanded.value) {
    // Reset keyword buffer
    if (keywordTimeout.ready.value) {
      keyword = ''
      keywordHiglight.value = [-1, -1]
    }

    // Append the entered key to the keyword buffer
    if (!event.ctrlKey && !event.metaKey && event.key.match(/^[a-z0-9]$/i)) {
      keyword += event.key

      // Find and focus the choice that matches the entered keyword
      const choice = searchByKeywords(flatChoices(), keyword, ['label', 'value'])[0]

      if (choice) {
        highlightedChoice.value = choice

        const keywordIndex = (choice.label ?? (isString(choice.value) ? choice.value : ''))
          .toLowerCase()
          .indexOf(keyword.toLowerCase())

        scrollToHighlighted()

        mousePaused.value = true
        keywordHiglight.value = keywordIndex > -1 ? [keywordIndex, keywordIndex + keyword.length - 1] : [-1, -1]
      } else {
        keywordHiglight.value = [-1, -1]
      }

      // Extend the timeout
      keywordTimeout.start()
    }
  }
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
</script>

<style>
.pui-select-wrapper {
  width: 100%;
}

.pui-select {
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

.pui-select-has-errors {
  --pui-ring: var(--pui-destructive);
  border-color: hsl(var(--pui-destructive));
}

.pui-select:not(.pui-select-disabled):focus,
.pui-select:not(.pui-select-disabled):focus-within {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

.pui-select-disabled {
  box-shadow: none;
  cursor: default;
  opacity: 0.5;
}

.pui-select-selected-choice,
.pui-select-placeholder {
  margin: auto 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pui-select-placeholder {
  color: hsl(var(--pui-muted-foreground));
}

.pui-select-icon {
  flex-shrink: 0;
  margin-left: auto;
}

.pui-select-choices {
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

.pui-select-expanded .pui-select-choices {
  height: calc(100% + 2px);
  visibility: visible;
  transition: var(--pui-transition);
  transition-property: height, visibility, transform;
}

.pui-select-choice,
.pui-select-group-label {
  display: flex;
  align-items: center;
  color: hsl(var(--pui-foreground));
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
  line-height: 1.25;
  line-height: round(calc(1.25 * 1em), 1px);
}

.pui-select-choice span,
.pui-select-group-label span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pui-select-choice {
  width: 100%;
  height: calc(2em + 0.25rem - 2px);
  padding: 0 calc(0.5em - 1px);
  border: 1px solid hsl(var(--pui-background));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  cursor: default;
}

.pui-select-choice-selected {
  display: flex;
  justify-content: space-between;
  gap: 1em;
  padding-right: calc(0.5em + 1px);
}

.pui-select-choice-highlighted {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-select-group .pui-select-choice {
  padding-left: 1em;
}

.pui-select-group-label {
  position: sticky;
  top: 0;
  width: calc(100% + 2px);
  height: calc(2em + 0.25rem);
  margin: -1px;
  padding: 0 0.5em;
  font-weight: 600;
  background-color: hsl(var(--pui-background));
  transition: var(--pui-transition);
  transition-property: top;
}

.pui-select-group-label-offset {
  top: 1em;
}
</style>
