<template>
  <PUIFloater
    :disabled="disabled"
    :error="error"
    :handleTitle="displayedValue"
    :onEscapeKey="
      (event) => {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (isMonthSelectorVisible || isYearSelectorVisible) {
          isMonthSelectorVisible = false
          isYearSelectorVisible = false
        } else {
          root?.close(event)
          root?.handle?.focus()
        }
      }
    "
    :size="size"
    :strategy="strategy"
    @close="$emit('commit', toModelValue($modelValue))"
    @keydown="onKeyDown"
    @keydown.down="prevYear"
    @keydown.left="prevMonth"
    @keydown.right="nextMonth"
    @keydown.up="nextYear"
    ref="root"
    class="pui-calendar"
  >
    <template #handle>
      <Icon
        v-if="typeof icon === 'string'"
        :name="`tabler:${icon}`"
        mode="svg"
        size="calc(1em + 0.125rem)"
        class="pui-calendar-icon"
        :class="{ 'pui-calendar-icon-offset': icon.startsWith('calendar') }"
      />
      <component v-else-if="icon" :is="icon" size="calc(1em + 0.125rem)" class="pui-calendar-icon" />
      <span v-if="displayedValue" class="pui-calendar-displayed-value">{{ displayedValue }}</span>
      <span v-else class="pui-calendar-placeholder">{{ placeholder }}</span>
      <span v-if="clearable && modelValue !== null && !disabled" class="pui-calendar-clear">
        <PUIButton
          :size="typeof size === 'number' ? size - 2 : -3"
          :title="resolvedLabels.clear"
          @click.stop="
            (event) => {
              $emit('update:modelValue', null)
              $nextTick(() => root?.close(event))
            }
          "
          is="span"
          tabindex="0"
          variant="ghost"
        >
          <Icon height="1.125em" mode="svg" name="tabler:x" width="1.125em" />
        </PUIButton>
      </span>
    </template>

    <div class="pui-calendar-main" :class="{ 'pui-calendar-main-blurred': !!keyword }">
      <div v-if="!isMonthSelectorVisible && !isYearSelectorVisible" class="pui-calendar-header">
        <PUIButton
          :size="typeof size === 'number' ? size - 1 : -2"
          @click="
            async () => {
              selectorWidth = root!.container!.offsetWidth
              selectorHeight = root!.container!.offsetHeight
              isMonthSelectorVisible = true
              await sleep(0)
              root?.container
                ?.querySelector(`[data-month='${$currentMonth}']`)
                ?.scrollIntoView({ block: 'center', behavior: 'instant' })
            }
          "
          variant="secondary"
        >
          {{ $currentMonthLabel }}
        </PUIButton>

        <PUIButton
          :size="typeof size === 'number' ? size - 1 : -2"
          @click="
            async () => {
              selectorWidth = root!.container!.offsetWidth
              selectorHeight = root!.container!.offsetHeight
              isYearSelectorVisible = true
              await sleep(0)
              root?.container
                ?.querySelector(`[data-year='${$currentYear}']`)
                ?.scrollIntoView({ block: 'center', behavior: 'instant' })
            }
          "
          variant="secondary"
        >
          {{ $currentYear }}
        </PUIButton>

        <div class="pui-calendar-header-nav">
          <PUIButton
            :disabled="$currentYear === $minYear && $currentMonth === $minMonth"
            :size="typeof size === 'number' ? size - 1 : -2"
            :title="resolvedLabels.previousMonth"
            @click="$event.shiftKey ? prevYear() : prevMonth()"
            variant="ghost"
          >
            <Icon mode="svg" name="tabler:chevron-left" />
          </PUIButton>

          <PUIButton
            :disabled="$currentYear === $maxYear && $currentMonth === $maxMonth"
            :size="typeof size === 'number' ? size - 1 : -2"
            :title="resolvedLabels.nextMonth"
            @click="$event.shiftKey ? nextYear() : nextMonth()"
            variant="ghost"
          >
            <Icon mode="svg" name="tabler:chevron-right" />
          </PUIButton>
        </div>
      </div>

      <div
        v-if="isMonthSelectorVisible"
        class="pui-calendar-selector"
        :style="{ width: `${selectorWidth}px`, height: `${selectorHeight}px` }"
      >
        <template v-for="(month, i) of resolvedLabels.months">
          <PUIButton
            :data-month="i + 1"
            :disabled="
              ($currentYear === $minYear && i + 1 < $minMonth) || ($currentYear === $maxYear && i + 1 > $maxMonth)
            "
            :variant="i + 1 === $currentMonth ? 'primary' : 'secondary'"
            @click="
              () => {
                $currentMonth = resolvedLabels.months.indexOf(month) + 1
                isMonthSelectorVisible = false
                $nextTick(() => root?.container?.scrollTo({ top: 0, behavior: 'instant' }))
              }
            "
            type="button"
          >
            {{ month }}
          </PUIButton>
        </template>
      </div>

      <div
        v-if="isYearSelectorVisible"
        class="pui-calendar-selector"
        :style="{ width: `${selectorWidth}px`, height: `${selectorHeight}px` }"
      >
        <template v-for="year in Array.from({ length: 201 }).map((_, i) => $currentYear - 100 + i)">
          <PUIButton
            v-if="year >= $minYear && year <= $maxYear"
            :data-year="year"
            :variant="year === $currentYear ? 'primary' : 'secondary'"
            @click="
              () => {
                const normalized = toModelValue(
                  new Date(
                    Date.UTC(year, $currentMonth - 1, 1, $currentHours, $currentMinutes, $currentSeconds),
                  ).getTime(),
                )!
                $currentYear = new Date(normalized).getUTCFullYear()
                $currentMonth = new Date(normalized).getUTCMonth() + 1
                isYearSelectorVisible = false
                $nextTick(() => root?.container?.scrollTo({ top: 0, behavior: 'instant' }))
              }
            "
            type="button"
          >
            {{ year }}
          </PUIButton>
        </template>
      </div>

      <PUICalendarMonth
        v-if="!isMonthSelectorVisible && !isYearSelectorVisible"
        :labels="resolvedLabels"
        :max="$maxValue"
        :min="$minValue"
        :modelValue="$modelValue"
        :month="$currentMonth"
        :startDay="startDay"
        :today="$today"
        :year="$currentYear"
        @selectDay="
          (day, event) => {
            const date = new Date(withTimezoneOffset(modelValue ?? 946684800000))
            date.setUTCFullYear($currentYear, $currentMonth - 1, day)
            date.setUTCHours($currentHours, $currentMinutes, $currentSeconds)
            $emit('update:modelValue', toModelValue(date.getTime()))
            if (!withTime) {
              $nextTick(() => root?.close(event))
            }
          }
        "
      />

      <div v-if="withTime && !isMonthSelectorVisible && !isYearSelectorVisible" class="pui-calendar-time">
        <PUITime
          :id="id ? `${id}--time` : undefined"
          :max="$maxTime"
          :min="$minTime"
          :modelValue="$currentTime"
          :name="name ? `${name}--time` : undefined"
          :showSeconds="showSeconds"
          @update:modelValue="
            (seconds) => {
              const date = new Date(withTimezoneOffset(modelValue ?? 946684800000))
              date.setUTCFullYear($currentYear, $currentMonth - 1)
              date.setUTCHours(Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60)
              $emit('update:modelValue', toModelValue(date.getTime()))
            }
          "
        />
      </div>
    </div>

    <div class="pui-calendar-keyword" :class="{ 'pui-calendar-keyword-visible': !!keyword }">
      <span>{{ keyword }}</span>
    </div>

    <template #after>
      <input :id="id" :name="name" :value="modelValue" hidden />
    </template>
  </PUIFloater>
</template>

<script lang="ts" setup>
import type { icons } from '@iconify-json/tabler/icons.json'
import { clamp, defu, getTimezoneOffset, isDefined, isNull, isString, searchByKeywords, sleep } from '@pruvious/utils'
import { useTimeout } from '@vueuse/core'
import type { PUITimeLabels } from './PUITime.vue'

export interface PUICalendarLabels extends PUITimeLabels {
  /**
   * An array of names of the months, starting with January.
   *
   * @default
   * [
   *   'January',
   *   'February',
   *   'March',
   *   'April',
   *   'May',
   *   'June',
   *   'July',
   *   'August',
   *   'September',
   *   'October',
   *   'November',
   *   'December',
   * ]
   */
  months?: string[]

  /**
   * An array of full names of the days of the week, starting with Sunday.
   *
   * @default
   * [
   *   'Sunday',
   *   'Monday',
   *   'Tuesday',
   *   'Wednesday',
   *   'Thursday',
   *   'Friday',
   *   'Saturday',
   * ]
   */
  days?: string[]

  /**
   * An array of short names of the days of the week, starting with Sunday.
   *
   * @default
   * ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
   */
  daysShort?: string[]

  /**
   * The tooltip for the "Clear" button.
   *
   * @default 'Clear'
   */
  clear?: string

  /**
   * The tooltip for a button to select a date.
   *
   * @default 'Select date'
   */
  selectDate?: string

  /**
   * The tooltip for the "Previous month" button.
   *
   * @default 'Previous month'
   */
  previousMonth?: string

  /**
   * The tooltip for the "Next month" button.
   *
   * @default 'Next month'
   */
  nextMonth?: string
}

const props = defineProps({
  /**
   * The value of the calendar field.
   * It must be a timestamp in milliseconds since Unix epoch or `null`.
   *
   * Note: Round the value to second precision as milliseconds are not used in the calendar.
   */
  modelValue: {
    type: [Number, null],
    required: true,
  },

  /**
   * Specifies the starting date/time displayed when the calendar opens.
   * It must be a timestamp in milliseconds since Unix epoch or `null`.
   *
   * - When not specified, the selected value is used.
   * - If the selected value is not set, the current date will be used.
   *
   * Note: Round the value to second precision as milliseconds are not used in the calendar.
   *
   * @default null
   */
  initial: {
    type: [Number, null],
    default: null,
  },

  /**
   * Specifies whether the calendar should include time selection.
   *
   * When disabled, all timestamps are set to midnight.
   * The `timezone` is used to resolve the midnight time.
   *
   * @default false
   */
  withTime: {
    type: Boolean,
    default: false,
  },

  /**
   * Specifies whether to show the seconds input in the time picker.
   *
   * @default true
   */
  showSeconds: {
    type: Boolean,
    default: true,
  },

  /**
   * The time difference in minutes between UTC and local time.
   * You can also use a time zone name (e.g., 'Europe/Berlin') which will automatically handle daylight saving time adjustments.
   *
   * By default, the time zone offset is set to UTC (GMT+0).
   *
   * @default 0
   *
   * @see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List
   * @see https://www.iana.org/time-zones
   *
   * @example
   * ```ts
   * // GMT+1
   * 60
   *
   * // GMT-5
   * -300
   *
   * // Time zone name
   * 'Europe/Berlin'
   * ```
   */
  timezone: {
    type: [Number, String],
    default: 0,
  },

  /**
   * The formatter function to display the selected value.
   * This function takes a timestamp and converts it to a string representation.
   *
   * @default
   * (timestamp: number) => new Date(timestamp).toUTCString()
   */
  formatter: {
    type: Function as PropType<(timestamp: number) => string>,
    default: (timestamp: number) => new Date(timestamp).toUTCString(),
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
   * An optional placeholder text to display when the value is `null`.
   */
  placeholder: {
    type: String,
  },

  /**
   * Specifies whether the input is clearable.
   *
   * @default true
   */
  clearable: {
    type: Boolean,
    default: true,
  },

  /**
   * The field icon.
   * You can use either a string for Tabler icons or a Vue node for Nuxt icons.
   *
   * @example
   * ```ts
   * // Tabler icon
   * 'calendar-week'
   *
   * // Nuxt icon
   * h(Icon, { name: 'tabler:calendar-event' })
   * ```
   *
   * @default 'calendar-week'
   */
  icon: {
    type: [String, Object, null] as PropType<keyof typeof icons | VNode | null>,
    default: 'calendar-week',
  },

  /**
   * The minimum allowed timestamp.
   * The value must be specified in milliseconds since Unix epoch.
   * The default value represents the earliest possible date in JavaScript.
   *
   * Note: Round the value to second precision as milliseconds are not used in the calendar.
   *
   * @default -8640000000000000
   */
  min: {
    type: Number,
    default: -8640000000000000,
  },

  /**
   * The maximum allowed timestamp.
   * The value must be specified in milliseconds since Unix epoch.
   * The default value represents the latest possible date in JavaScript.
   *
   * Note: Round the value to second precision as milliseconds are not used in the calendar.
   *
   * @default 8640000000000000
   */
  max: {
    type: Number,
    default: 8640000000000000,
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
   * The `name` attribute of the input element that holds the selected value.
   */
  name: {
    type: String,
  },

  /**
   * The starting day of the week for the calendar month.
   *
   * - `0` - Sunday
   * - `1` - Monday
   * - `2` - Tuesday
   * - `3` - Wednesday
   * - `4` - Thursday
   * - `5` - Friday
   * - `6` - Saturday
   *
   * @default 1
   */
  startDay: {
    type: Number,
    default: 1,
  },

  /**
   * Labels used for the calendar component.
   */
  labels: {
    type: Object as PropType<PUICalendarLabels>,
  },

  /**
   * The type of CSS position property to use for the picker.
   * The `fixed` value is recommended for most cases.
   * The `absolute` value is useful when the picker is inside a scrolling container.
   * You can also `provide('floatingStrategy', 'absolute')` from a parent component to change the default value.
   *
   * @default 'fixed'
   */
  strategy: {
    type: String as PropType<'fixed' | 'absolute'>,
    default: 'fixed',
  },
})

const emit = defineEmits<{
  'commit': [value: number | null]
  'update:modelValue': [value: number | null]
}>()

const resolvedLabels = computed<Required<PUICalendarLabels>>(() =>
  defu(props.labels ?? {}, {
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    clear: 'Clear',
    selectDate: 'Select date',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    hoursSuffix: 'h',
    minutesSuffix: 'm',
    secondsSuffix: 's',
  }),
)

const root = useTemplateRef('root')
const isMonthSelectorVisible = ref(false)
const isYearSelectorVisible = ref(false)
const selectorWidth = ref(0)
const selectorHeight = ref(0)
const { listen } = puiTrigger()
const displayedValue = computed(() => (isNull(props.modelValue) ? undefined : props.formatter(props.modelValue)))
const $initialValue = computed(() =>
  isNull(props.initial) ? null : clamp(withTimezoneOffset(props.initial), -8640000000000000, 8640000000000000),
)
const $today = computed(() => new Date(withTimezoneOffset(Date.now())))
const $modelValue = computed(() => (isNull(props.modelValue) ? null : withTimezoneOffset(props.modelValue)))
const $modelDate = computed(() => new Date($modelValue.value ?? $initialValue.value ?? $today.value.getTime()))
const $initialDate = computed(() => new Date($initialValue.value ?? props.modelValue ?? $today.value.getTime()))
const $initialDay = computed(() => $initialDate.value.getUTCDate())
const $initialMonth = computed(() => $initialDate.value.getUTCMonth() + 1)
const $initialYear = computed(() => $initialDate.value.getUTCFullYear())
const $minValue = computed(() => clamp(withTimezoneOffset(props.min), -8640000000000000, 8640000000000000))
const $maxValue = computed(() => clamp(withTimezoneOffset(props.max), -8640000000000000, 8640000000000000))
const $minDate = computed(() => new Date($minValue.value))
const $maxDate = computed(() => new Date($maxValue.value))
const $minYear = computed(() => $minDate.value.getUTCFullYear())
const $maxYear = computed(() => $maxDate.value.getUTCFullYear())
const $minMonth = computed(() => $minDate.value.getUTCMonth() + 1)
const $maxMonth = computed(() => $maxDate.value.getUTCMonth() + 1)
const $currentMonth = ref($initialMonth.value)
const $currentMonthLabel = computed(() => resolvedLabels.value.months[$currentMonth.value - 1])
const $currentYear = ref($initialYear.value)
const $currentHours = computed(() => $modelDate.value.getUTCHours())
const $currentMinutes = computed(() => $modelDate.value.getUTCMinutes())
const $currentSeconds = computed(() => $modelDate.value.getUTCSeconds())
const $currentTime = computed(() => $currentHours.value * 3600 + $currentMinutes.value * 60 + $currentSeconds.value)
const $minTime = computed(() =>
  isNull($modelValue.value)
    ? 0
    : $modelDate.value.getUTCFullYear() === $minDate.value.getUTCFullYear() &&
        $modelDate.value.getUTCMonth() === $minDate.value.getUTCMonth() &&
        $modelDate.value.getUTCDate() === $minDate.value.getUTCDate()
      ? $minDate.value.getUTCHours() * 3600 + $minDate.value.getUTCMinutes() * 60 + $minDate.value.getUTCSeconds()
      : 0,
)
const $maxTime = computed(() =>
  isNull($modelValue.value)
    ? 86399
    : $modelDate.value.getUTCFullYear() === $maxDate.value.getUTCFullYear() &&
        $modelDate.value.getUTCMonth() === $maxDate.value.getUTCMonth() &&
        $modelDate.value.getUTCDate() === $maxDate.value.getUTCDate()
      ? $maxDate.value.getUTCHours() * 3600 + $maxDate.value.getUTCMinutes() * 60 + $maxDate.value.getUTCSeconds()
      : 86399,
)
const keywordTimeout = useTimeout(750, { controls: true })
const keyword = ref('')

let timezoneOffset = 0

/**
 * Stops listening for focus events.
 */
let stopFocusListener: (() => void) | undefined

/**
 * Listens for click events on the associated label element.
 */
watch(
  () => props.id,
  (id) => {
    if (id) {
      stopFocusListener = listen(`focus:${id}`, () => {
        if (!props.disabled) {
          root.value?.handle?.focus()
        }
      })
    } else {
      stopFocusListener?.()
    }
  },
  { immediate: true },
)

watch(
  () => props.modelValue,
  () => {
    if (!isNull(props.modelValue)) {
      const normalized = toModelValue(withTimezoneOffset(props.modelValue, true))

      if (normalized !== props.modelValue) {
        emit('update:modelValue', normalized)
        emit('commit', normalized)
      }
    }
  },
  { immediate: true },
)

watch(keywordTimeout.ready, (isReady) => {
  if (isReady && root.value?.isActive && keyword.value.trim()) {
    const keywords = keyword.value
      .trim()
      .toLowerCase()
      .split(' ')
      .map((k) => k.trim())
      .filter(Boolean)

    let $day: number | undefined
    let $month: number | undefined
    let $year: number | undefined

    for (const k of keywords) {
      if (/^0*([1-9]|[12]\d|3[01])$/.test(k)) {
        $day = +k
      } else if (/^0*([1-9]|[1-9][0-9]|[1-9][0-9]{2}|[1-9][0-9]{3})$/.test(k)) {
        $year = +k
      } else {
        const months = resolvedLabels.value.months.map((m) => m.toLowerCase())
        const results = searchByKeywords(
          months.map((m) => m.toLowerCase()),
          k,
        )
        $month = results[0] ? months.indexOf(results[0]) + 1 : undefined
      }
    }

    if (isReady) {
      keyword.value = ''
    }

    const focusedDay = document.activeElement?.classList.contains('pui-calendar-day-button')
      ? +document.activeElement?.getAttribute('data-day')!
      : undefined
    $year = isDefined($year) ? clamp($year, $minYear.value, $maxYear.value) : $currentYear.value
    $month = isDefined($month) ? $month : $currentMonth.value
    $day = clamp($day ?? focusedDay ?? $initialDay.value, 1, new Date(Date.UTC($year, $month, 0)).getUTCDate())

    const $normalized = clamp(
      new Date(withTimezoneOffset(Date.UTC($year, $month - 1, $day))).getTime(),
      $minDate.value.getTime(),
      $maxDate.value.getTime(),
    )
    const $normalizedDate = new Date($normalized)
    $currentYear.value = $normalizedDate.getUTCFullYear()
    $currentMonth.value = $normalizedDate.getUTCMonth() + 1

    nextTick(() => {
      const dayButton = root.value?.container?.querySelector(
        `.pui-calendar-day-button:not(:disabled)[data-day="${$normalizedDate.getUTCDate()}"]`,
      ) as HTMLElement | null
      dayButton?.focus()
    })
  }
})

watch(
  () => root.value?.isActive,
  (isActive) => {
    if (isActive) {
      const visibleYearMonth = new Date(Date.UTC($currentYear.value, $currentMonth.value - 1))
      const clampedYearMonth = new Date(
        clamp(withTimezoneOffset(visibleYearMonth.getTime()), $minValue.value, $maxValue.value),
      )
      $currentYear.value = clampedYearMonth.getUTCFullYear()
      $currentMonth.value = clampedYearMonth.getUTCMonth() + 1
    } else {
      isMonthSelectorVisible.value = false
      isYearSelectorVisible.value = false
    }
  },
)

function withTimezoneOffset(timestamp: number, store = false) {
  const _timezoneOffset = isString(props.timezone) ? getTimezoneOffset(props.timezone, timestamp) : props.timezone
  if (store) {
    timezoneOffset = _timezoneOffset
  }
  return timestamp + _timezoneOffset * 60000
}

function withoutTimezoneOffset(timestamp: number) {
  return timestamp - timezoneOffset * 60000
}

function toModelValue(timestamp: number | null) {
  if (isNull(timestamp)) {
    return null
  }

  if (!props.withTime) {
    const date = new Date(timestamp)
    date.setUTCHours(0, 0, 0, 0)
    timestamp = date.getTime()
  }

  return clamp(withoutTimezoneOffset(timestamp), props.min, props.max)
}

function prevMonth(event?: Event) {
  if (event && puiIsEditingText()) {
    return false
  }

  event?.preventDefault()
  event?.stopImmediatePropagation()

  const _month = $currentMonth.value === 1 ? 12 : $currentMonth.value - 1
  const _year = $currentYear.value
  if ((_year === $minYear.value && _month < $minMonth.value) || (_month === 12 && !prevYear())) {
    return false
  }
  $currentMonth.value = _month
  nextTick(() => root.value?.container?.focus())
  return true
}

function nextMonth(event?: Event) {
  if (event && puiIsEditingText()) {
    return false
  }

  event?.preventDefault()
  event?.stopImmediatePropagation()

  const _month = $currentMonth.value === 12 ? 1 : $currentMonth.value + 1
  const _year = $currentYear.value
  if ((_year === $maxYear.value && _month > $maxMonth.value) || (_month === 1 && !nextYear())) {
    return false
  }
  $currentMonth.value = _month
  nextTick(() => root.value?.container?.focus())
  return true
}

function prevYear(event?: Event) {
  if (event && puiIsEditingText()) {
    return false
  }

  event?.preventDefault()
  event?.stopImmediatePropagation()

  if ($currentYear.value - 1 >= $minYear.value) {
    $currentYear.value--
    if ($currentYear.value === $minYear.value) {
      $currentMonth.value = Math.max($minMonth.value, $currentMonth.value)
    }
    nextTick(() => root.value?.container?.focus())
    return true
  }

  return false
}

function nextYear(event?: Event) {
  if (event && puiIsEditingText()) {
    return false
  }

  event?.preventDefault()
  event?.stopImmediatePropagation()

  if ($currentYear.value + 1 <= $maxYear.value) {
    $currentYear.value++
    if ($currentYear.value === $maxYear.value) {
      $currentMonth.value = Math.min($maxMonth.value, $currentMonth.value)
    }
    nextTick(() => root.value?.container?.focus())
    return true
  }
  return false
}

function onKeyDown(event: KeyboardEvent) {
  if (root.value?.isActive && !puiIsEditingText()) {
    if (keywordTimeout.ready.value) {
      keyword.value = ''
    }

    if (!event.ctrlKey && !event.metaKey && event.key.match(/^[\p{L}\p{N}]$/u)) {
      keyword.value += event.key
      keywordTimeout.start()
    } else if (!event.ctrlKey && !event.metaKey && event.key === ' ' && keyword.value) {
      keyword.value += ' '
      event.preventDefault()
    } else if (event.key === 'Backspace') {
      keyword.value = keyword.value.slice(0, -1)
      event.preventDefault()
    }
  }
}
</script>

<style>
.pui-calendar-displayed-value,
.pui-calendar-placeholder {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pui-calendar-icon {
  flex-shrink: 0;
}

.pui-calendar-icon-offset {
  margin-top: -1px;
}

.pui-calendar-clear {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  height: calc(100% - 2px);
  aspect-ratio: 1;
  margin-right: calc(-0.5em - 1px);
  margin-left: auto;
}

.pui-calendar-placeholder {
  color: hsl(var(--pui-muted-foreground));
}

.pui-calendar-main {
  transition: var(--pui-transition);
  transition-property: filter;
}

.pui-calendar-main-blurred {
  filter: blur(2px);
}

.pui-calendar-header {
  display: flex;
  gap: 0.5em;
  padding: 0.5em 0.5em 0;
}

.pui-calendar-header-nav {
  display: flex;
  margin-left: auto;
}

.pui-calendar-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  padding: 0.5em;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--pui-foreground) / 0.25) transparent;
}

.pui-calendar-time {
  display: flex;
  width: calc(1em + (2.5em + 0.125rem) * 7 - 0.125rem);
  padding: 0.5em;
}

.pui-calendar-keyword {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5em;
  overflow: hidden;
  background-color: hsl(var(--pui-card) / 0.82);
  border-radius: calc(var(--pui-radius) - 0.125rem);
  font-size: 2em;
  font-weight: 500;
  text-align: center;
  opacity: 0;
  visibility: hidden;
  transition: var(--pui-transition);
  transition-property: opacity, visibility;
}

.pui-calendar-keyword-visible {
  opacity: 1;
  visibility: visible;
}
</style>
