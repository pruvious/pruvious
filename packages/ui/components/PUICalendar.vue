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
    @blurHandle="focusVisible = false"
    @close="$emit('commit', prepareEmitValue(date))"
    @keydown="onKeyDown"
    @keydown.down="prevYear"
    @keydown.left="prevMonth"
    @keydown.right="nextMonth"
    @keydown.up="nextYear"
    ref="root"
    class="pui-calendar"
    :class="{ 'pui-calendar-focus-visible': focusVisible }"
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
              $emit('commit', null)
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
                ?.querySelector(`[data-month='${selectedMonth}']`)
                ?.scrollIntoView({ block: 'center', behavior: 'instant' })
            }
          "
          variant="secondary"
        >
          {{ selectedMonthName }}
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
                ?.querySelector(`[data-year='${selectedYear}']`)
                ?.scrollIntoView({ block: 'center', behavior: 'instant' })
            }
          "
          variant="secondary"
        >
          {{ selectedYear }}
        </PUIButton>

        <div class="pui-calendar-header-nav">
          <PUIButton
            :disabled="selectedYear === minDate.year() && selectedMonth === minDate.month() + 1"
            :size="typeof size === 'number' ? size - 1 : -2"
            :title="resolvedLabels.previousMonth"
            @click="$event.shiftKey ? prevYear() : prevMonth()"
            variant="ghost"
          >
            <Icon mode="svg" name="tabler:chevron-left" />
          </PUIButton>

          <PUIButton
            :disabled="selectedYear === maxDate.year() && selectedMonth === maxDate.month() + 1"
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
              (selectedYear === minDate.year() && i < minDate.month()) ||
              (selectedYear === maxDate.year() && i > maxDate.month())
            "
            :variant="i + 1 === selectedMonth ? 'primary' : 'secondary'"
            @click="
              () => {
                selectedMonth = resolvedLabels.months.indexOf(month) + 1
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
        <template v-for="year in Array.from({ length: 201 }).map((_, i) => selectedYear - 100 + i)">
          <PUIButton
            v-if="year >= minDate.year() && year <= maxDate.year()"
            :data-year="year"
            :variant="year === selectedYear ? 'primary' : 'secondary'"
            @click="
              () => {
                const current = puiDayjs().tz(`${year}-${selectedMonth}-01`, resolveTimezone())
                const clamped = clampDate(current)
                selectedYear = clamped.year()
                selectedMonth = clamped.month() + 1
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
        :max="maxDate"
        :min="minDate"
        :modelValue="date"
        :month="selectedMonth"
        :resolveTimezone="resolveTimezone"
        :startDay="startDay"
        :timezone="timezone"
        :today="today"
        :year="selectedYear"
        @selectDay="
          (day, event) => {
            const { hours, minutes, seconds } = puiTimestampToSpanObject(time)
            const newDate = puiDayjs().tz(
              `${selectedYear}-${selectedMonth}-${day} ${hours}:${minutes}:${seconds}`,
              resolveTimezone(),
            )
            const clamped = clampDate(newDate)
            const emitValue = prepareEmitValue(clamped)
            $emit('update:modelValue', emitValue)
            if (!root?.isActive) {
              $emit('commit', emitValue)
            }
            if (!withTime) {
              $nextTick(() => root?.close(event))
            }
          }
        "
      />

      <div v-if="withTime && !isMonthSelectorVisible && !isYearSelectorVisible" class="pui-calendar-time">
        <PUITime
          :id="id ? `${id}--time` : undefined"
          :max="maxTime"
          :min="minTime"
          :modelValue="time"
          :name="name ? `${name}--time` : undefined"
          :showSeconds="showSeconds"
          @update:modelValue="
            (time) => {
              const { hours, minutes, seconds } = puiTimestampToSpanObject(time)
              const newDate = puiDayjs().tz(
                `${selectedYear}-${selectedMonth}-${selectedDay} ${hours}:${minutes}:${seconds}`,
                resolveTimezone(),
              )
              const clamped = clampDate(newDate)
              $emit('update:modelValue', prepareEmitValue(clamped))
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
import { defu, isNull, isNumber, searchByKeywords, sleep } from '@pruvious/utils'
import { useTimeout } from '@vueuse/core'
import type { Dayjs } from 'dayjs/esm'
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
   * Sets the initial year and month shown when the calendar opens.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds.
   * - String - ISO 8601 formatted date.
   *
   * If not specified, the calendar will try to use the current `modelValue`.
   * If `modelValue` is `null`, it defaults to the current year and month.
   *
   * @default null
   */
  initial: {
    type: [Number, String, null],
    default: null,
  },

  /**
   * Specifies whether the calendar should include time selection.
   *
   * When disabled, all timestamps are set to midnight.
   * The `timezone` prop is used to resolve the midnight time.
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
   * The time zone identifier for displaying date values in the calendar.
   * The value must be a valid IANA time zone name or `local`.
   *
   * @default 'UTC'
   *
   * @see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List
   * @see https://www.iana.org/time-zones
   *
   * @example
   * ```ts
   * 'local'
   * 'Europe/Berlin'
   * 'America/New_York'
   * 'Asia/Tokyo'
   * ```
   */
  timezone: {
    type: String as PropType<PUITimezone | 'local'>,
    default: 'UTC',
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
   * Controls the visibility of the clear button in the calendar input.
   * When set to `false`, users cannot remove their date selection.
   *
   * @default true
   */
  clearable: {
    type: Boolean,
    default: true,
  },

  /**
   * The icon to display in the calendar input.
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
   * The minimum selectable date.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds.
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted date.
   *   - Parsed through `Date.parse()`.
   *
   * When not specified, defaults to January 1st, 100 CE (0100-01-01T00:00:00.000Z).
   *
   * @default -59011459200000
   *
   * @example
   * ```ts
   * new Date('2024-12-15').getTime()
   * '2024-12-15T00:00:00.000Z'
   * '2024'
   * ```
   */
  min: {
    type: [Number, String],
    default: -59011459200000,
  },

  /**
   * The maximum selectable date.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds.
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted date.
   *   - Parsed through `Date.parse()`.
   *
   * When not specified, defaults to the latest possible date in JavaScript.
   *
   * @default 8640000000000000
   *
   * @example
   * ```ts
   * new Date('2077-06-06').getTime()
   * '2077-06-06T00:00:00.000Z'
   * '2077'
   * ```
   */
  max: {
    type: [Number, String],
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

defineEmits<{
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
const date = ref<Dayjs | null>(useTimezone(props.modelValue))
const time = computed(() =>
  isNull(date.value)
    ? 0
    : puiParseTime({ hours: date.value.hour(), minutes: date.value.minute(), seconds: date.value.second() }),
)
const today = ref(puiDate().tz(resolveTimezone()))
const initialDate = computed(() => useTimezone(props.initial))
const selectedYear = ref(initialDate.value?.year() ?? date.value?.year() ?? today.value.year())
const selectedMonth = ref((initialDate.value?.month() ?? date.value?.month() ?? today.value.month()) + 1)
const selectedMonthName = computed(() => resolvedLabels.value.months[selectedMonth.value - 1])
const selectedDay = ref(today.value.date())
const minDate = computed(() => useTimezone(isNumber(props.min) ? Math.max(props.min, -59011459200000) : props.min)!)
const maxDate = computed(() => useTimezone(props.max)!)
const minTime = computed(() =>
  selectedYear.value === minDate.value.year() &&
  selectedMonth.value === minDate.value.month() + 1 &&
  selectedDay.value === minDate.value.date()
    ? puiParseTime({ hours: minDate.value.hour(), minutes: minDate.value.minute(), seconds: minDate.value.second() })
    : 0,
)
const maxTime = computed(() =>
  selectedYear.value === maxDate.value.year() &&
  selectedMonth.value === maxDate.value.month() + 1 &&
  selectedDay.value === maxDate.value.date()
    ? puiParseTime({ hours: maxDate.value.hour(), minutes: maxDate.value.minute(), seconds: maxDate.value.second() })
    : 86399000,
)
const keywordTimeout = useTimeout(750, { controls: true })
const keyword = ref('')
const focusVisible = ref(false)

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
          focusVisible.value = true
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
    date.value = useTimezone(props.modelValue)
    selectedDay.value = date.value?.date() ?? 0
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
    const current = puiDayjs().tz(
      `${$year ?? selectedYear.value}-${$month ?? selectedMonth.value}-${$day ?? focusedDay ?? 1}`,
      resolveTimezone(),
    )
    const clamped = clampDate(current)

    selectedYear.value = clamped.year()
    selectedMonth.value = clamped.month() + 1

    nextTick(() => {
      const dayButton = root.value?.container?.querySelector(
        `.pui-calendar-day-button:not(:disabled)[data-day="${clamped.date()}"]`,
      ) as HTMLElement | null
      dayButton?.focus()
    })
  }
})

watch(
  () => root.value?.isActive,
  (isActive) => {
    if (isActive) {
      const current = puiDayjs().tz(`${selectedYear.value}-${selectedMonth.value}-01`, resolveTimezone())
      const clamped = clampDate(current)
      selectedYear.value = clamped.year()
      selectedMonth.value = clamped.month() + 1
    } else {
      isMonthSelectorVisible.value = false
      isYearSelectorVisible.value = false
    }
  },
)

function resolveTimezone(): string {
  return puiResolveTimezone(props.timezone)
}

function useTimezone(date: PUIDateInput) {
  return isNull(date) ? null : puiDate(date).tz(resolveTimezone())
}

function prepareEmitValue(date: Dayjs | null): number | null {
  if (isNull(date)) {
    return null
  }

  return props.withTime ? date.valueOf() : date.startOf('day').valueOf()
}

function clampDate(date: Dayjs) {
  return puiDayjs().min(puiDayjs().max(date, minDate.value), maxDate.value)
}

function prevMonth(event?: Event) {
  if (event && puiIsEditingText()) {
    return false
  }

  event?.preventDefault()
  event?.stopImmediatePropagation()
  const current = puiDayjs().tz(`${selectedYear.value}-${selectedMonth.value}-01`, resolveTimezone())
  const prev = clampDate(current.subtract(1, 'month'))
  selectedYear.value = prev.year()
  selectedMonth.value = prev.month() + 1
  nextTick(() => root.value?.container?.focus())
  return true
}

function nextMonth(event?: Event) {
  if (event && puiIsEditingText()) {
    return false
  }

  event?.preventDefault()
  event?.stopImmediatePropagation()
  const current = puiDayjs().tz(`${selectedYear.value}-${selectedMonth.value}-01`, resolveTimezone())
  const next = clampDate(current.add(1, 'month'))
  selectedYear.value = next.year()
  selectedMonth.value = next.month() + 1
  nextTick(() => root.value?.container?.focus())
  return true
}

function prevYear(event?: Event) {
  if (event && puiIsEditingText()) {
    return false
  }

  event?.preventDefault()
  event?.stopImmediatePropagation()
  const current = puiDayjs().tz(`${selectedYear.value}-${selectedMonth.value}-01`, resolveTimezone())
  const prev = clampDate(current.subtract(1, 'year'))
  selectedYear.value = prev.year()
  selectedMonth.value = prev.month() + 1
  nextTick(() => root.value?.container?.focus())
  return true
}

function nextYear(event?: Event) {
  if (event && puiIsEditingText()) {
    return false
  }

  event?.preventDefault()
  event?.stopImmediatePropagation()
  const current = puiDayjs().tz(`${selectedYear.value}-${selectedMonth.value}-01`, resolveTimezone())
  const next = clampDate(current.add(1, 'year'))
  selectedYear.value = next.year()
  selectedMonth.value = next.month() + 1
  nextTick(() => root.value?.container?.focus())
  return true
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
.pui-calendar-focus-visible .pui-floater-handle {
  border-color: transparent;
  box-shadow: 0 0 0 0.125rem hsl(var(--pui-ring));
  outline: none;
}

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
