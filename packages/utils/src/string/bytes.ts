import { castToNumber } from '../number/convert'
import { isRealNumber } from '../number/is'
import { isString } from './is'

/**
 * Formats a number of bytes into a human-readable string.
 * If the input `value` cannot be parsed, `null` is returned.
 *
 * @remarks This function is adapted from the `bytes` package (https://www.npmjs.com/package/bytes).
 *
 * @example
 * ```ts
 * formatBytes(2097152) // '2 MB'
 * formatBytes('1048576') // '1 MB'
 * ```
 */
export function formatBytes(value: number | string): string | null {
  const numberValue = castToNumber(value)

  if (!isRealNumber(numberValue) || numberValue < 0) {
    return null
  }

  const mag = Math.abs(numberValue)
  const thousandsSeparator = ''
  const unitSeparator = ' '
  const decimalPlaces = 2
  const fixedDecimals = false
  const formatDecimalsRegExp = /(?:\.0*|(\.[^0]+)0+)$/
  const formatThousandsRegExp = /\B(?=(\d{3})+(?!\d))/g
  const map: Record<string, number> = {
    b: 1,
    kb: 1 << 10,
    mb: 1 << 20,
    gb: 1 << 30,
    tb: Math.pow(1024, 4),
    pb: Math.pow(1024, 5),
  }
  let unit = ''

  if (!unit || !map[unit.toLowerCase()]) {
    if (mag >= map.pb) {
      unit = 'PB'
    } else if (mag >= map.tb) {
      unit = 'TB'
    } else if (mag >= map.gb) {
      unit = 'GB'
    } else if (mag >= map.mb) {
      unit = 'MB'
    } else if (mag >= map.kb) {
      unit = 'KB'
    } else {
      unit = 'B'
    }
  }

  const val = numberValue / map[unit.toLowerCase()]
  let str = val.toFixed(decimalPlaces)

  if (!fixedDecimals) {
    str = str.replace(formatDecimalsRegExp, '$1')
  }

  if (thousandsSeparator) {
    str = str
      .split('.')
      .map((s, i) => (i === 0 ? s.replace(formatThousandsRegExp, thousandsSeparator) : s))
      .join('.')
  }

  return str + unitSeparator + unit
}

/**
 * Parses a human-readable byte string into a number of bytes.
 *
 * @remarks This function is adapted from the `bytes` package (https://www.npmjs.com/package/bytes).
 *
 * @example
 * ```ts
 * parseBytes('2 MB') // 2097152
 * parseBytes(1048576) // 1048576
 * ```
 */
export function parseBytes(value: string | number): number {
  if (isRealNumber(value)) {
    return value
  } else if (isString(value)) {
    const parseRegExp = /^((-|\+)?(\d+(?:\.\d+)?)) *(kb|mb|gb|tb|pb)$/i
    const results = parseRegExp.exec(value)
    const map: Record<string, number> = {
      b: 1,
      kb: 1 << 10,
      mb: 1 << 20,
      gb: 1 << 30,
      tb: Math.pow(1024, 4),
      pb: Math.pow(1024, 5),
    }

    let floatValue: number | undefined
    let unit = 'b'

    if (!results) {
      floatValue = parseInt(value, 10)
      unit = 'b'
    } else {
      floatValue = parseFloat(results[1])
      unit = results[4].toLowerCase()
    }

    if (isRealNumber(floatValue) && floatValue >= 0) {
      return Math.floor(map[unit] * floatValue)
    }
  }

  return 0
}
