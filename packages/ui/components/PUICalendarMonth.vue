<template>
  <table class="pui-calendar-month">
    <thead>
      <tr>
        <th v-for="i in days" :key="`day-${i}`">{{ labels.daysShort[i - 1] }}</th>
      </tr>
    </thead>

    <tbody>
      <tr v-for="(week, i) in weeks" :key="`${year}-${month}-${i}`">
        <td v-for="({ day, disabled, selected, isToday }, j) in week" :key="`${year}-${month}-${i}-${j}`">
          <button
            :data-day="day"
            :disabled="disabled"
            :tabindex="disabled ? -1 : undefined"
            :title="disabled ? undefined : labels.selectDate"
            @click="$emit('selectDay', day, $event)"
            type="button"
            class="pui-calendar-day-button pui-raw"
            :class="{
              'pui-calendar-day-button-disabled': disabled,
              'pui-calendar-day-button-selected': selected,
              'pui-calendar-day-button-today': isToday,
            }"
          >
            {{ day }}
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts" setup>
import type { Dayjs } from 'dayjs/esm'
import type { PUICalendarLabels } from './PUICalendar.vue'

const props = defineProps({
  /**
   * The value of the calendar field.
   * It must be `Dayjs` object or `null`.
   */
  modelValue: {
    type: [Object, null] as PropType<Dayjs | null>,
    required: true,
  },

  /**
   * The currently displayed year.
   */
  year: {
    type: Number,
    required: true,
  },

  /**
   * The currently displayed month.
   * It must be a number between `1` (January) and `12` (December).
   */
  month: {
    type: Number,
    required: true,
    validator: (value: number) => value >= 1 && value <= 12,
  },

  /**
   * The minimum allowed date.
   * The value must be a `Dayjs` object.
   */
  min: {
    type: Object as PropType<Dayjs>,
    required: true,
  },

  /**
   * The maximum allowed date.
   * The value must be a `Dayjs` object.
   */
  max: {
    type: Object as PropType<Dayjs>,
    required: true,
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
   */
  startDay: {
    type: Number,
    required: true,
  },

  /**
   * The current date.
   */
  today: {
    type: Object as PropType<Dayjs>,
    required: true,
  },

  /**
   * A function that resolves the timezone.
   */
  resolveTimezone: {
    type: Function as PropType<() => string>,
    required: true,
  },

  /**
   * Labels used for the calendar component.
   */
  labels: {
    type: Object as PropType<Required<PUICalendarLabels>>,
    required: true,
  },
})

defineEmits<{
  selectDay: [day: number, event: Event]
}>()

const days = computed(() => Array.from({ length: 7 }, (_, i) => ((i + props.startDay) % 7) + 1))
const selectedDate = computed(() => puiDayjs().tz(`${props.year}-${props.month}-01`, props.resolveTimezone()))
const totalDays = computed(() => selectedDate.value.daysInMonth())
const weeks = computed(() => {
  const firstDayOfMonth = puiDayjs().tz(`${props.year}-${props.month}-01`, props.resolveTimezone())
  const startDayIndex = (firstDayOfMonth.day() + 7 - props.startDay) % 7
  const prevMonthDays = puiDayjs()
    .tz(`${props.year}-${props.month}-01`, props.resolveTimezone())
    .subtract(1, 'month')
    .daysInMonth()
  const isActiveMonthAndYear = props.modelValue?.year() === props.year && props.modelValue?.month() + 1 === props.month
  const isTodayMonthAndYear = props.today.year() === props.year && props.today.month() + 1 === props.month

  const currentMonthDays = Array.from({ length: totalDays.value }, (_, i) => {
    const day = i + 1
    const currentDateStart = puiDayjs().tz(`${props.year}-${props.month}-${day}`, props.resolveTimezone())
    const currentTimestampStart = currentDateStart.valueOf()
    const currentTimestampEnd = currentTimestampStart + 86400000 - 1
    const isDisabled =
      (currentTimestampStart < props.min.valueOf() && currentTimestampEnd < props.min.valueOf()) ||
      (currentTimestampStart > props.max.valueOf() && currentTimestampEnd > props.max.valueOf())

    return {
      day,
      disabled: isDisabled,
      selected: isActiveMonthAndYear && props.modelValue?.date() === day,
      isToday: isTodayMonthAndYear && props.today.date() === day,
    }
  })

  const prevMonthFiller = Array.from({ length: startDayIndex }, (_, i) => {
    const day = prevMonthDays - startDayIndex + i + 1
    return {
      day,
      disabled: true,
      selected: false,
      isToday: false,
    }
  })

  let calendarDays = [...prevMonthFiller, ...currentMonthDays]

  const nextMonthDaysNeeded = 7 - (calendarDays.length % 7 || 7)

  if (nextMonthDaysNeeded < 7) {
    const nextMonthFiller = Array.from({ length: nextMonthDaysNeeded }, (_, i) => ({
      day: i + 1,
      disabled: true,
      selected: false,
      isToday: false,
    }))
    calendarDays = [...calendarDays, ...nextMonthFiller]
  }

  const weekCount = Math.ceil(calendarDays.length / 7)
  return Array.from({ length: weekCount }, (_, i) => calendarDays.slice(i * 7, i * 7 + 7))
})
</script>

<style>
.pui-calendar-month {
  table-layout: fixed;
  padding: calc(0.5em - 0.0625rem);
  border-collapse: separate;
  border-spacing: 0;
  text-indent: 0;
  vertical-align: middle;
}

.pui-calendar-month :where(th, td) {
  width: calc(2.5em + 0.125rem);
  height: calc(2.5em + 0.125rem);
  padding: 0.0625rem;
  text-align: center;
}

.pui-calendar-month :where(th) {
  font-size: calc(1em - 0.0625rem);
  font-weight: 500;
  color: hsl(var(--pui-muted-foreground));
}

.pui-calendar-day-button {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2.5em;
  height: 2.5em;
  border-radius: calc(var(--pui-radius) - 0.125rem);
  background-color: transparent;
  color: hsl(var(--pui-foreground));
  text-decoration: none;
  transition: var(--pui-transition);
  transition-property: background-color, box-shadow, color;
}

.pui-calendar-day-button:hover {
  background-color: hsl(var(--pui-secondary));
  color: hsl(var(--pui-secondary-foreground));
}

.pui-calendar-day-button:focus-visible {
  box-shadow:
    0 0 0 0.125rem hsl(var(--pui-ring)),
    0 0 #0000;
  outline: none;
}

.pui-calendar-day-button-disabled {
  pointer-events: none;
  opacity: 0.36;
}

.pui-calendar-day-button:not(.pui-calendar-day-button-disabled) {
  font-weight: 500;
}

.pui-calendar-day-button-selected {
  background-color: hsl(var(--pui-primary));
  color: hsl(var(--pui-primary-foreground));
}

.pui-calendar-day-button-selected:hover {
  background-color: hsl(var(--pui-primary) / 0.9);
  color: hsl(var(--pui-primary-foreground));
}

.pui-calendar-day-button-today::before {
  content: '';
  position: absolute;
  bottom: 0.325em;
  left: 50%;
  width: 0.25em;
  height: 0.25em;
  margin-left: -0.125em;
  background-color: hsl(var(--pui-primary));
  border-radius: 50%;
}

.pui-calendar-day-button-today.pui-calendar-day-button-selected::before {
  background-color: hsl(var(--pui-primary-foreground));
}
</style>
