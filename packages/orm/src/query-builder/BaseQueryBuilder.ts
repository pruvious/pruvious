import { isDefined, isUndefined } from '@pruvious/utils'
import type { QueryBuilderError, QueryBuilderOutput } from './types'

export class BaseQueryBuilder<TCollections> {
  protected runtimeError?: string
  protected inputErrors: Record<string, string>[] = []
  protected cache: Record<string, any> = {}

  constructor(protected collections: TCollections) {}

  /**
   * Retrieves all `Collection` instances.
   */
  protected getCollections() {
    return this.collections
  }

  /**
   * Sets a runtime error message if one does not already exist.
   */
  protected setRuntimeError(message: string) {
    if (isUndefined(this.runtimeError)) {
      this.runtimeError = message
    }
  }

  /**
   * Sets a field-specific input error message at the specified index.
   * If an error already exists for the field, it is not overwritten.
   *
   * @param index The index matching the input array order.
   * @param fieldPath The field path using dot notation.
   * @param message The error message.
   *
   * @example
   * ```ts
   * this.setInputError(0, 'firstName', 'This field is required')
   * this.setInputError(0, 'notes.0.text', 'This field is required')
   * this.setInputError(2, 'firstName', 'This field is required')
   * ```
   */
  protected setInputError(index: number, fieldPath: string, message: string) {
    const inputErrors = this.inputErrors[index] || {}

    if (isUndefined(inputErrors[fieldPath])) {
      inputErrors[fieldPath] = message
    }
  }

  /**
   * Checks if the form has any errors.
   */
  protected hasErrors() {
    return isDefined(this.runtimeError) || this.inputErrors.length > 0
  }

  /**
   * Creates a `QueryBuilderOutput` object to return if the query is successful.
   */
  protected prepareOutput<T>(data: T): QueryBuilderOutput<T> {
    delete this.cache['__tmp']

    return {
      success: true,
      data,
      runtimeError: undefined,
      inputErrors: undefined,
    }
  }

  /**
   * Creates a `QueryBuilderError` object to return if the query fails or is invalid.
   * If `first` is `true`, only the first input error is returned.
   * By default, all input errors are returned as an array.
   */
  protected prepareError<T extends 'allInputErrors' | 'firstInputError' | 'noInputErrors' = 'allInputErrors'>(
    inputErrorsReturnMode?: T,
  ) {
    delete this.cache['__tmp']

    return {
      success: false,
      data: undefined,
      runtimeError: this.runtimeError,
      inputErrors:
        isDefined(this.runtimeError) || inputErrorsReturnMode === 'noInputErrors'
          ? undefined
          : inputErrorsReturnMode === 'firstInputError'
            ? (this.inputErrors[0] ?? {})
            : this.inputErrors,
    } as QueryBuilderError<
      T extends 'firstInputError'
        ? Record<string, string>
        : T extends 'noInputErrors'
          ? undefined
          : Record<string, string>[]
    >
  }
}
