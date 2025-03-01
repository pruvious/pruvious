import { isFunction, isString } from '@pruvious/utils'
import type { Context, GenericDatabase } from '../core'
import type { CustomErrorMessage } from './types'

/**
 * Resolves a custom error message, if provided, or returns the default error message.
 * This function is used internally by validators.
 */
export function resolveCustomErrorMessage(
  customErrorMessage: CustomErrorMessage | undefined,
  defaultErrorMessage: string,
  i18nContext: Pick<Context<GenericDatabase>, '_' | '__'>,
): string {
  if (isString(customErrorMessage)) {
    return customErrorMessage
  }

  if (isFunction(customErrorMessage)) {
    return customErrorMessage(i18nContext)
  }

  return defaultErrorMessage
}
