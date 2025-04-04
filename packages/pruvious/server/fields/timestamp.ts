import { defineField } from '#pruvious/server'
import type { icons } from '@iconify-json/tabler/icons.json'
import { numberFieldModel } from '@pruvious/orm'
import type { PUITimezone } from '@pruvious/ui/composables/puiTimezone'
import { isNotNull, isString } from '@pruvious/utils'

export interface TimestampFieldOptions {
  /**
   * The minimum allowed timestamp value in milliseconds.
   * The default value represents the earliest possible date in JavaScript.
   *
   * @default -8640000000000000
   *
   * @example
   * ```ts
   * 1734220800000 // 2024-12-15
   * ```
   */
  min?: number

  /**
   * The maximum allowed timestamp value in milliseconds.
   * The default value represents the latest possible date in JavaScript.
   *
   * @default 8640000000000000
   *
   * @example
   * ```ts
   * 3390163200000 // 2077-06-06
   * ```
   */
  max?: number

  ui?: {
    /**
     * Options for the calendar component.
     * This is only available when the `picker` option is set to `calendar` or `combo`.
     */
    calendar?: {
      /**
       * The icon to display in the calendar input.
       * You can use either a string for Tabler icons or a Vue node for Nuxt icons.
       *
       * @default 'calendar-week'
       */
      icon?: keyof typeof icons | null

      /**
       * Sets the initial year and month shown when the calendar opens.
       * Accepts these formats:
       *
       * - Numeric - Unix timestamp in milliseconds.
       * - String - ISO 8601 formatted date.
       *
       * If not specified, the calendar will try to use the field's current value.
       * When no value exists, it defaults to the current year and month.
       *
       * @default null
       */
      initial?: number | string | null

      /**
       * Specifies whether to show the seconds input in the time picker.
       *
       * @default true
       */
      showSeconds?: boolean

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
      startDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6

      /**
       * The time zone identifier for displaying date values in the calendar.
       * The value must be a valid IANA time zone name or `local`.
       *
       * Note: Data table timestamps are always shown in the user's preferred timezone.
       *
       * @default 'local'
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
      timezone?: PUITimezone | 'local'
    }

    /**
     * Specifies the component used to input the timestamp.
     *
     * - `calendar` - A calendar component for selecting dates (second precision).
     * - `combo` - A toggleable component that allows both calendar and numeric input.
     * - `numeric` - A numeric input field for entering the timestamp directly (in milliseconds).
     *
     * @default 'combo'
     */
    picker?: 'calendar' | 'combo' | 'numeric'

    /**
     * Controls whether timestamps should be shown as relative time expressions (like '2 hours ago' or 'in 3 days')
     * instead of absolute dates throughout the user interface.
     *
     * @default false
     */
    relativeTime?: boolean
  }
}

const customOptions: TimestampFieldOptions = {
  min: -8640000000000000,
  max: 8640000000000000,
  ui: {
    calendar: {
      icon: 'calendar-week',
      initial: null,
      showSeconds: true,
      startDay: 1,
      timezone: 'local',
    },
    picker: 'combo',
    relativeTime: false,
  },
}

export default defineField({
  model: numberFieldModel(),
  sanitizers: [
    (value) => {
      if (isString(value)) {
        try {
          return Date.parse(value)
        } catch {}
      }
      return value
    },
  ],
  validators: [
    (value, { definition, context }) => {
      if (isNotNull(value)) {
        if (isString(definition.options.min)) {
          if (value < Date.parse(definition.options.min)) {
            throw new Error(
              context.__('pruvious-orm', 'The value must be greater than or equal to `$min`', {
                min: Date.parse(definition.options.min),
              }),
            )
          }
        }

        if (isString(definition.options.max)) {
          if (value > Date.parse(definition.options.max)) {
            throw new Error(
              context.__('pruvious-orm', 'The value must be less than or equal to `$max`', {
                max: Date.parse(definition.options.max),
              }),
            )
          }
        }
      }
    },
  ],
  customOptions,
  uiOptions: { placeholder: true },
  omitOptions: ['decimalPlaces', 'min', 'max'],
})
