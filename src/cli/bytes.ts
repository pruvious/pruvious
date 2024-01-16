/*!
 * bytes
 * Copyright(c) 2012-2014 TJ Holowaychuk
 * Copyright(c) 2015 Jed Watson
 * MIT Licensed
 */

const formatThousandsRegExp = /\B(?=(\d{3})+(?!\d))/g

const formatDecimalsRegExp = /(?:\.0*|(\.[^0]+)0+)$/

const map = {
  b: 1,
  kb: 1 << 10,
  mb: 1 << 20,
  gb: 1 << 30,
  tb: Math.pow(1024, 4),
  pb: Math.pow(1024, 5),
}

const parseRegExp = /^((-|\+)?(\d+(?:\.\d+)?)) *(kb|mb|gb|tb|pb)$/i

export function bytes(value: string, options?: any) {
  if (typeof value === 'string') {
    return parse(value)
  }

  if (typeof value === 'number') {
    return format(value, options)
  }

  return null
}

export function format(value: number, options?: any) {
  if (!Number.isFinite(value)) {
    return null
  }

  var mag = Math.abs(value)
  var thousandsSeparator = (options && options.thousandsSeparator) || ''
  var unitSeparator = (options && options.unitSeparator) || ''
  var decimalPlaces = options && options.decimalPlaces !== undefined ? options.decimalPlaces : 2
  var fixedDecimals = Boolean(options && options.fixedDecimals)
  var unit = (options && options.unit) || ''

  if (!unit || !(map as any)[unit.toLowerCase()]) {
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

  var val = value / (map as any)[unit.toLowerCase()]
  var str = val.toFixed(decimalPlaces)

  if (!fixedDecimals) {
    str = str.replace(formatDecimalsRegExp, '$1')
  }

  if (thousandsSeparator) {
    str = str
      .split('.')
      .map(function (s, i) {
        return i === 0 ? s.replace(formatThousandsRegExp, thousandsSeparator) : s
      })
      .join('.')
  }

  return str + unitSeparator + unit
}

export function parse(val: string) {
  if (typeof val === 'number' && !isNaN(val)) {
    return val
  }

  if (typeof val !== 'string') {
    return null
  }

  // Test if the string passed is valid
  var results = parseRegExp.exec(val)
  var floatValue
  var unit = 'b'

  if (!results) {
    // Nothing could be extracted from the given string
    floatValue = parseInt(val, 10)
    unit = 'b'
  } else {
    // Retrieve the value and the unit
    floatValue = parseFloat(results[1])
    unit = results[4].toLowerCase()
  }

  if (isNaN(floatValue)) {
    return null
  }

  return Math.floor((map as any)[unit] * floatValue)
}
