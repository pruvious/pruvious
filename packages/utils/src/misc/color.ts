import { isString } from '../string/is'

/**
 * Checks whether a CSS `color` string carries an alpha channel that can produce a
 * less-than-opaque pixel. Recognized forms:
 *
 * - The literal `'transparent'` keyword.
 * - 4 or 8 digit hex (`#RGBA`, `#RRGGBBAA`).
 * - `rgba(...)` and `hsla(...)` functions.
 * - Modern slash syntax inside any color function (e.g. `rgb(255 0 0 / 0.5)`,
 *   `hsl(0 0% 0% / 0.5)`, `hwb(...)`, `lab(...)`, `lch(...)`, `oklab(...)`,
 *   `oklch(...)`, `color(...)`).
 *
 * Named colors, 3 or 6 digit hex, plain `rgb()`/`hsl()`, `currentColor` and
 * anything else are reported as opaque.
 *
 * @example
 * ```ts
 * hasAlphaChannel('#ff0000')          // false
 * hasAlphaChannel('#ff000080')        // true
 * hasAlphaChannel('transparent')        // true
 * hasAlphaChannel('rgba(0, 0, 0, 0)') // true
 * hasAlphaChannel('rgb(0 0 0 / 0.5)')   // true
 * ```
 */
export function hasAlphaChannel(color: string): boolean {
  if (!isString(color)) {
    return false
  }
  const value = color.trim().toLowerCase()
  if (!value) {
    return false
  }
  if (value === 'transparent') {
    return true
  }
  if (value.startsWith('#')) {
    return value.length === 5 || value.length === 9
  }
  if (value.startsWith('rgba(') || value.startsWith('hsla(')) {
    return true
  }
  // Modern slash syntax inside any color function: e.g. `rgb(255 0 0 / 0.5)`.
  return /\([^)]*\/[^)]*\)/.test(value)
}
