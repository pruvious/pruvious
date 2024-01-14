export interface SizeInput<T extends string = string> {
  /**
   * The label displayed for the size input.
   *
   * If not specified, the label will be generated from the size property name (e.g., `width` => `Width`).
   */
  label?: string

  /**
   * The placeholder text displayed in the size input.
   *
   * @default ''
   */
  placeholder?: string

  /**
   * The minimum allowed size value.
   *
   * @default 0
   */
  min?: number

  /**
   * The maximum allowed size value.
   *
   * @default Number.MAX_SAFE_INTEGER (9007199254740991)
   */
  max?: number

  /**
   * Array of allowed units (e.g., `['px', 'em', 'rem']`).
   * When specified, the units are displayed in a dropdown menu next to the size input.
   *
   * @default []
   */
  units?: T[]

  /**
   * The default size input value.
   *
   * @default { value: 0 }
   */
  default?: { value: number; unit?: T }
}
