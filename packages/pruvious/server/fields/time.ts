import { defineField } from '#pruvious/server'
import { numberFieldModel, timeValidator } from '@pruvious/orm'

const customOptions: {
  /**
   * The minimum allowed time.
   * The value must be specified in seconds (e.g., `3600` for 01:00:00).
   *
   * @default 0
   */
  min?: number

  /**
   * The maximum allowed time.
   * The value must be specified in seconds (e.g., `7200` for 02:00:00).
   *
   * @default 86399
   */
  max?: number

  ui?: {
    /**
     * Specifies whether to show the seconds input in the time picker.
     *
     * @default true
     */
    showSeconds?: boolean
  }
} = {
  min: 0,
  max: 86399,
  ui: {
    showSeconds: true,
  },
}

export default defineField({
  model: numberFieldModel(),
  sanitizers: [], // @todo sanitize any string input (e.g., '01:00:00')
  validators: [timeValidator()],
  customOptions,
  omitOptions: ['decimalPlaces', 'min', 'max'],
})
