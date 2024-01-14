import { queueError } from '../instances/logger'
import { isUndefined } from '../utils/common'
import { isObject } from '../utils/object'
import { isPascalCase, isSafeSlug, isString } from './string'

interface StringValidationOptions {
  subject: string
  prop: string
  value: any
  path: string
  examples?: string[]
}

export function validateString(options: StringValidationOptions): boolean {
  if (isUndefined(options.value)) {
    return queueErrorAndReturn(`Missing ${options.subject} $c{{ ${options.prop} }}${inSuffix(options.path)}`)
  } else if (!isString(options.value)) {
    return queueErrorAndReturn(
      `Invalid ${options.subject} $c{{ ${options.prop} }} type (${typeof options.value})${inSuffix(options.path)}`,
      `\n\nThe ${options.subject} $c{{ ${options.prop} }} must be a $u{{ string }}.`,
    )
  }

  return true
}

export function validateSlug(options: StringValidationOptions): boolean {
  if (!validateString(options)) {
    return false
  }

  if (!isSafeSlug(options.value)) {
    return queueErrorAndReturn(
      `Invalid ${options.subject} $c{{ ${options.prop} }} ('${options.value}')${inSuffix(options.path)}`,
      `\n\nThe ${options.prop} can contain only lowercase alphanumeric characters and hyphens.`,
      `It must start and end with an alphanumeric character, and it cannot have two consecutive hyphens.`,
      options.examples ? `Examples: ${options.examples.join(', ')}` : '',
    )
  }

  return true
}

export function validateSafeSlug(options: StringValidationOptions): boolean {
  if (!validateString(options)) {
    return false
  }

  if (!isSafeSlug(options.value)) {
    return queueErrorAndReturn(
      `Invalid ${options.subject} $c{{ ${options.prop} }} ('${options.value}')${inSuffix(options.path)}`,
      `\n\nThe ${options.prop} can contain only lowercase alphanumeric characters and hyphens.`,
      `It must begin with a letter, end with an alphanumeric character, and it cannot have two consecutive hyphens.`,
      options.examples ? `Examples: ${options.examples.join(', ')}` : '',
    )
  }

  return true
}

export function validatePascalCase(options: StringValidationOptions): boolean {
  if (!validateString(options)) {
    return false
  }

  if (!isPascalCase(options.value)) {
    return queueErrorAndReturn(
      `Invalid ${options.subject} $c{{ ${options.prop} }} ('${options.value}')${inSuffix(options.path)}`,
      `\n\nThe ${options.prop} must consist of alphanumeric characters where each word starts with an uppercase letter`,
      `and has no spaces or special characters.`,
      options.examples ? `Examples: ${options.examples.join(', ')}` : '',
    )
  }

  return true
}

export function validateDefaultExport(subjects: string, useFn: string, file: any, path: string): boolean {
  if (!file.default) {
    return queueErrorAndReturn(
      `Missing $c{{ default export }}${inSuffix(path)}`,
      `\n\nUse the $c{{ ${useFn} }} function from $c{{ #pruvious }} to register new ${subjects}.`,
    )
  } else if (!isObject(file.default)) {
    return queueErrorAndReturn(
      `Invalid $c{{ default export }} type${inSuffix(path)}`,
      `\n\nUse the $c{{ ${useFn} }} function from $c{{ #pruvious }} to register new ${subjects}.`,
    )
  }

  return true
}

function inSuffix(path: string): string {
  return path ? ` in $c{{ ${path} }}` : '.'
}

export function queueErrorAndReturn(message: string, ...args: string[]): false {
  queueError(message, ...args)
  return false
}
