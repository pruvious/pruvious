import { isObject } from '@pruvious-test/utils'
import dayjs from 'dayjs'
import { Field, QueryableField } from './types'

/**
 * Get the field value type.
 */
export function getFieldValueType(field: Field): 'string' | 'number' | 'boolean' | 'json' {
  if (
    field.type === 'buttons' ||
    field.type === 'editor' ||
    field.type === 'icon' ||
    field.type === 'select' ||
    field.type === 'text' ||
    field.type === 'textArea' ||
    field.type === 'url'
  ) {
    return 'string'
  } else if (
    field.type === 'date' ||
    field.type === 'dateTime' ||
    field.type === 'file' ||
    field.type === 'image' ||
    field.type === 'number' ||
    field.type === 'page' ||
    field.type === 'post' ||
    field.type === 'preset' ||
    field.type === 'role' ||
    field.type === 'slider' ||
    field.type === 'time' ||
    field.type === 'user'
  ) {
    return 'number'
  } else if (field.type === 'checkbox' || field.type === 'switch') {
    return 'boolean'
  } else {
    return 'json'
  }
}

/**
 * Get the default value of a field.
 */
export function getDefaultFieldValue(field: Field, mode: 'standard' | 'meta' = 'standard'): any {
  if (
    field.type === 'file' ||
    field.type === 'image' ||
    field.type === 'link' ||
    field.type === 'page' ||
    field.type === 'post' ||
    field.type === 'preset' ||
    field.type === 'role' ||
    field.type === 'user'
  ) {
    return null
  } else if (field.type === 'repeater') {
    return mode === 'standard' ? [] : '[]'
  } else if (field.type === 'checkbox' || field.type === 'switch') {
    return mode === 'standard' ? !!field.default : +!!field.default
  }

  if (field.default !== undefined) {
    if (mode === 'meta') {
      if (typeof field.default === 'boolean') {
        return +(field as any).default
      } else if (isObject(field.default)) {
        return JSON.stringify(field.default)
      }
    }

    if (field.type === 'date' && typeof field.default === 'string') {
      const date = dayjs(field.default)
      return date
        .subtract(date.get('hours'), 'hours')
        .subtract(date.get('minutes'), 'minutes')
        .subtract(date.get('seconds'), 'seconds')
        .subtract(date.get('milliseconds'), 'milliseconds')
        .toDate()
        .getTime()
    } else if (field.type === 'dateTime' && typeof field.default === 'string') {
      const date = dayjs(field.default)
      return field.utc
        ? date
            .subtract(date.utcOffset() * 60000)
            .toDate()
            .getTime()
        : date.toDate().getTime()
    } else if (field.type === 'time' && typeof field.default === 'string') {
      const date = dayjs(`1970-01-01 ${field.default}`).toDate()
      return (
        (date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds()) * 1000 +
        date.getUTCMilliseconds()
      )
    } else if (field.type === 'checkboxes') {
      return mode === 'standard' ? field.default : JSON.stringify(field.default)
    } else if (field.type === 'size') {
      return mode === 'standard' ? field.default : JSON.stringify(field.default)
    }

    return field.default
  }

  if (field.type === 'text' || field.type === 'textArea' || field.type === 'url') {
    return ''
  } else if (field.type === 'editor') {
    return '<p></p>'
  } else if (field.type === 'number' || field.type === 'slider') {
    return field.min ?? 0
  } else if (field.type === 'checkboxes') {
    return mode === 'standard' ? [] : '[]'
  } else if (field.type === 'size') {
    const defaultValue = Object.fromEntries(
      (field.names ?? ['width', 'height']).map((name) => [
        name,
        { value: 0, unit: field.units?.length ? field.units[0] : undefined },
      ]),
    )

    return mode === 'standard' ? defaultValue : JSON.stringify(defaultValue)
  } else {
    return null
  }
}

export function getFilterableFields(...fields: QueryableField[]): QueryableField[] {
  return fields.filter((field) => isFilterableField(field))
}

export function isSortableField(field: QueryableField): boolean {
  return (
    (field.type === 'buttons' ||
      field.type === 'checkbox' ||
      field.type === 'date' ||
      field.type === 'dateTime' ||
      field.type === 'editor' ||
      field.type === 'icon' ||
      field.type === 'number' ||
      field.type === 'select' ||
      field.type === 'slider' ||
      field.type === 'switch' ||
      field.type === 'text' ||
      field.type === 'textArea' ||
      field.type === 'time' ||
      field.type === 'url') &&
    field.selectable !== false &&
    field['sortable'] !== false
  )
}

export function isFilterableField(field: QueryableField): boolean {
  return (
    (field.type === 'buttons' ||
      field.type === 'checkbox' ||
      field.type === 'date' ||
      field.type === 'dateTime' ||
      field.type === 'editor' ||
      field.type === 'file' ||
      field.type === 'icon' ||
      field.type === 'image' ||
      field.type === 'number' ||
      field.type === 'page' ||
      field.type === 'post' ||
      field.type === 'preset' ||
      field.type === 'role' ||
      field.type === 'select' ||
      field.type === 'slider' ||
      field.type === 'switch' ||
      field.type === 'text' ||
      field.type === 'textArea' ||
      field.type === 'time' ||
      field.type === 'url' ||
      field.type === 'user') &&
    field.selectable !== false &&
    field['filterable'] !== false
  )
}
