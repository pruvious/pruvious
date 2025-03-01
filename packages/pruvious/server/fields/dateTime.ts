import { defineField } from '#pruvious/server'
import { numberFieldModel, timestampValidator } from '@pruvious/orm'

const customOptions: {
  /**
   * The minimum date that can be selected.
   * Value must be specified in milliseconds since Unix epoch.
   * The default value represents the earliest possible date in JavaScript.
   *
   * @default -8640000000000000
   *
   * @example
   * ```ts
   * new Date('2024-12-15').getTime()
   * ```
   */
  min?: number

  /**
   * The maximum date that can be selected.
   * Value must be specified in milliseconds since Unix epoch.
   * The default value represents the latest possible date in JavaScript.
   *
   * @default 8640000000000000
   *
   * @example
   * ```ts
   * new Date('2077-06-06').getTime()
   * ```
   */
  max?: number
} = {
  min: -8640000000000000,
  max: 8640000000000000,
}

export default defineField({
  model: numberFieldModel(),
  nullable: true,
  default: null,
  sanitizers: [], // @todo sanitize any date input
  validators: [timestampValidator()],
  customOptions,
  omitOptions: ['decimalPlaces', 'min', 'max'],
})
