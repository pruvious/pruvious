import { defineField } from '#pruvious/server'
import { numberFieldModel, timestampValidator } from '@pruvious/orm'

const customOptions: {
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
} = {
  min: -8640000000000000,
  max: 8640000000000000,
}

export default defineField({
  model: numberFieldModel(),
  sanitizers: [], // @todo sanitize any date input
  validators: [timestampValidator()],
  customOptions,
  uiOptions: { placeholder: true },
  omitOptions: ['decimalPlaces', 'min', 'max'],
})
