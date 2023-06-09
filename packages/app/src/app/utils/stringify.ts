export function stringify(value: any): string {
  if (value === null || value === undefined) {
    return ''
  } else if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join(', ')
  } else if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return value
}
