import type { Context, GenericDatabase } from '../core'

/**
 * This type is used by validators to allow custom error messages.
 * It can be a string or a function that receives the `i18nContext` and returns a string.
 */
export type CustomErrorMessage<TDatabase extends GenericDatabase = GenericDatabase> =
  | string
  | ((i18nContext: Pick<Context<TDatabase>, '_' | '__'>) => string)
