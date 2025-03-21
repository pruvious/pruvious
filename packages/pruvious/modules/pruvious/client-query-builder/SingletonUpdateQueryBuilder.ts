import { primaryLanguage } from '#pruvious/client/i18n'
import type { LanguageCode, Singletons } from '#pruvious/server'
import type {
  DefaultQueryBuilderParamsOptions,
  ExtractCastedTypes,
  ExtractPopulatedTypes,
  QueryBuilderResult,
  UpdateInput,
  UpdateQueryBuilderParamsOptions,
} from '@pruvious/orm'
import {
  normalizeQueryString,
  queryStringToUpdateQueryBuilderParams,
  updateQueryBuilderParamsToQueryString,
} from '@pruvious/orm/query-string'
import { deepClone, defu, isDefined, slugify, toArray, uniqueArray, type NonEmptyArray } from '@pruvious/utils'
import { pruviousPatch } from '../api/utils.client'
import type { SingletonQueryBuilderParamsOptions } from '../singletons/SingletonBaseQueryBuilder'
import type { QueryBuilderOptions } from './QueryBuilder'

/**
 * A utility class for constructing and querying singletons through the PATCH singletons API in a type-safe manner.
 * This class is designed for client-side code and only works for singletons that have the `api.update` setting enabled.
 *
 * @example
 * ```ts
 * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
 *   .set({ logo: 456 })
 *   .returning(['logo', 'copyrightText'])
 *   .run()
 *
 * console.log(updatedThemeOptions)
 * // {
 * //   success: true,
 * //   data: {
 * //     logo: 456,
 * //     copyrightText: '© 2025 Example Inc.',
 * //   },
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const failedUpdate = await new SingletonUpdateQueryBuilder('ThemeOptions')
 *   .set({ logo: 'foo' })
 *   .returning(['logo', 'copyrightText'])
 *   .run()
 *
 * console.log(failedUpdate)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: undefined,
 * //   inputErrors: {
 * //     'logo': 'The value must be a number or `null`',
 * //   },
 * // }
 * ```
 */
export class SingletonUpdateQueryBuilder<
  const TSingletonName extends keyof Singletons,
  TSingleton extends Singletons[TSingletonName] = Singletons[TSingletonName],
  TReturnType extends 'rows' | 'count' = 'count',
  TReturningFields extends TSingleton['TFieldNames'] = never,
  TKnownReturningFields extends boolean = true,
  TPopulateFields extends boolean = false,
> {
  protected options: {
    fetcher: Required<QueryBuilderOptions>['fetcher']
    apiRouteResolver: (singletonName: string, queryString: string) => string
  }
  protected input: Record<string, any> = {}
  protected returnType: 'rows' | 'count' = 'count'
  protected languageCode: LanguageCode | null = null
  protected returningFields: string[] = []
  protected populateFields: boolean = false

  constructor(
    protected singletonName: TSingletonName,
    options?: {
      /**
       * A custom fetcher function to use for fetching data.
       *
       * @default pruviousPatch
       */
      fetcher?: QueryBuilderOptions['fetcher']

      /**
       * Resolves the POST path for reading singleton records.
       *
       * @default
       * (singletonName, queryString) => `singletons/${slugify(singletonName)}` + (queryString ? `?${queryString}` : '')
       */
      apiRouteResolver?: (singletonName: string, queryString: string) => string
    },
  ) {
    this.options = defu(options ?? {}, {
      fetcher: pruviousPatch,
      apiRouteResolver: (singletonName: string, queryString: string) =>
        `singletons/${slugify(singletonName)}` + (queryString ? `?${queryString}` : ''),
    })
  }

  /**
   * Applies a query string to the current query builder instance.
   *
   * The following query string parameters are supported:
   *
   * - `returning` - Comma-separated list of fields to return after the UPDATE operation.
   * - `where` - Filtering condition for the results (excluding raw queries).
   * - `populate` - Whether to populate fields after the UPDATE operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('Student')
   *   .fromQueryString('returning=logo,copyrightText')
   *   .set({ logo: 456 })
   *   .run()
   *
   * console.log(updatedThemeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 456,
   * //     copyrightText: '© 2025 Example Inc.',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  fromQueryString(
    queryString: string | URLSearchParams | Record<string, string | string[]>,
    options?: Pick<UpdateQueryBuilderParamsOptions<TSingleton['TFieldNames']>, 'returning' | 'populate'> &
      DefaultQueryBuilderParamsOptions &
      SingletonQueryBuilderParamsOptions,
  ): SingletonUpdateQueryBuilder<
    TSingletonName,
    TSingleton,
    'rows' | 'count',
    TReturningFields,
    false,
    TPopulateFields
  > {
    const params = queryStringToUpdateQueryBuilderParams(queryString, { ...options, where: false })

    if (options?.language !== false) {
      const normalizedQS = normalizeQueryString(queryString)
      if (isDefined(normalizedQS.language)) {
        this.languageCode = normalizedQS.language.trim() || (null as any)
      } else if (options?.withDefaults) {
        this.languageCode = null
      }
    }

    if (params.returning) {
      this.returning(params.returning.includes('*') ? ['*'] : (params.returning as any))
    } else if (options?.withDefaults) {
      this.clearReturning()
    }

    if (isDefined(params.populate)) {
      this.populateFields = params.populate
    } else if (options?.withDefaults) {
      this.clearPopulate()
    }

    return this as any
  }

  /**
   * Generates a query string from the following query builder parameters:
   *
   * - `returning` - Comma-separated list of fields to return after the UPDATE operation.
   * - `populate` - Whether to populate fields after the UPDATE operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const queryString = new SingletonUpdateQueryBuilder('Student')
   *   .set({ logo: 456 })
   *   .returning(['logo', 'copyrightText'])
   *   .toQueryString()
   *
   * console.log(queryString)
   * // 'returning=logo,copyrightText'
   * ```
   */
  toQueryString(
    options?: Pick<UpdateQueryBuilderParamsOptions<TSingleton['TFieldNames']>, 'returning' | 'populate'> &
      DefaultQueryBuilderParamsOptions &
      SingletonQueryBuilderParamsOptions,
  ): string {
    const wd = !!options?.withDefaults

    let queryString = updateQueryBuilderParamsToQueryString(
      {
        returning: this.returnType === 'rows' ? this.returningFields : undefined,
        populate: this.populateFields === true ? this.populateFields : wd ? false : undefined,
      },
      { ...options, where: false },
    )

    if (options?.language !== false) {
      const language = this.languageCode ?? (wd ? primaryLanguage : '')
      if (language) {
        queryString += (queryString ? '&' : '') + `language=${language}`
      }
    }

    return queryString
  }

  /**
   * Clones the current query builder instance.
   */
  clone(): this {
    const clone = new SingletonUpdateQueryBuilder(this.singletonName, this.options)

    clone.input = deepClone(this.input)
    clone.returnType = this.returnType
    clone.languageCode = this.languageCode
    clone.returningFields = [...this.returningFields]
    clone.populateFields = this.populateFields

    return clone as any
  }

  /**
   * Updates specific fields in the current singleton.
   *
   * This method will override any previously set fields.
   *
   * @example
   * ```ts
   * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .set({ logo: 456 })
   *   .returning(['logo', 'copyrightText'])
   *   .run()
   *
   * console.log(updatedThemeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 456,
   * //     copyrightText: '© 2025 Example Inc.',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  set(input: UpdateInput<TSingleton>): this {
    this.input = deepClone(input)
    return this
  }

  /**
   * Specifies which translation of the singleton content should be updated.
   * If not set, content in the primary language will be updated.
   * Only works for singletons that have translations enabled.
   */
  language<TLanguageCode extends TSingleton['translatable'] extends true ? LanguageCode : never>(
    languageCode: TLanguageCode,
  ): SingletonUpdateQueryBuilder<
    TSingletonName,
    TSingleton,
    TReturnType,
    TReturningFields,
    TKnownReturningFields,
    TPopulateFields
  > {
    this.languageCode = languageCode as any
    return this
  }

  /**
   * Specifies which `fields` should be returned after the UPDATE operation.
   *
   * This method will override any previously set RETURNING fields.
   *
   * @example
   * ```ts
   * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .set({ logo: 456 })
   *   .returning(['logo', 'copyrightText'])
   *   .run()
   *
   * console.log(updatedThemeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 456,
   * //     copyrightText: '© 2025 Example Inc.',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  returning<TReturningFields extends TSingleton['TFieldNames']>(
    fields: NonEmptyArray<TReturningFields>,
  ): SingletonUpdateQueryBuilder<TSingletonName, TSingleton, 'rows', TReturningFields, true, TPopulateFields>
  returning<TReturningFields extends TSingleton['TFieldNames']>(
    field: TReturningFields,
  ): SingletonUpdateQueryBuilder<TSingletonName, TSingleton, 'rows', TReturningFields, true, TPopulateFields>
  returning<TReturningFields extends TSingleton['TFieldNames']>(
    fields: NonEmptyArray<TReturningFields> | TReturningFields,
  ) {
    this.returnType = 'rows'
    this.returningFields = uniqueArray(toArray(fields))
    return this as SingletonUpdateQueryBuilder<
      TSingletonName,
      TSingleton,
      'rows',
      TReturningFields,
      true,
      TPopulateFields
    >
  }

  /**
   * Specifies that all fields should be returned after the UPDATE operation.
   *
   * @example
   * ```ts
   * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .set({ logo: 456 })
   *   .returningAll()
   *   .run()
   *
   * console.log(updatedThemeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 123,
   * //     primaryColor: '#ff0000',
   * //     secondaryColor: '#00ff00',
   * //     ...
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  returningAll(): SingletonUpdateQueryBuilder<
    TSingletonName,
    TSingleton,
    'rows',
    TSingleton['TFieldNames'],
    true,
    TPopulateFields
  > {
    this.returnType = 'rows'
    this.returningFields = ['*']
    return this as any
  }

  /**
   * Clears any previously set RETURNING fields and sets the return type to `count`.
   * This means the UPDATE operation will return the number of affected rows instead of the updated data.
   *
   * @example
   * ```ts
   * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .returning(['logo']) // This will be ignored
   *   .clearReturning()    // This will clear the RETURNING fields
   *   .run()
   *
   * console.log(updatedThemeOptions)
   * // {
   * //   success: true,
   * //   data: 1,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  clearReturning(): SingletonUpdateQueryBuilder<TSingletonName, TSingleton, 'count', never, false, TPopulateFields> {
    this.returnType = 'count'
    this.returningFields = []
    return this as any
  }

  /**
   * Specifies that the query should return populated field values.
   * Field populators transform the field value into a format suitable for application use.
   * They can retrieve related data from the database, format the value, or perform other operations.
   *
   * @example
   * ```ts
   * const updateThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .set({ logo: 456 })
   *   .returning(['logo', 'copyrightText'])
   *   .populate()
   *   .run()
   *
   * console.log(updateThemeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: {
   * //       // @todo populated image data
   * //     },
   * //     copyrightText: '© 2025 Example Inc.',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  populate(): SingletonUpdateQueryBuilder<
    TSingletonName,
    TSingleton,
    TReturnType,
    TReturningFields,
    TKnownReturningFields,
    true
  > {
    this.populateFields = true
    return this as any
  }

  /**
   * Disables field population for the query.
   * The query will return casted field values without executing any field populators.
   *
   * @example
   * ```ts
   * new SingletonUpdateQueryBuilder('Student')
   *   .set({ logo: 456 })
   *   .returning(['logo', 'copyrightText'])
   *   .populate()      // This will be ignored
   *   .clearPopulate() // This will disable field population
   *   .all()
   * ```
   */
  clearPopulate(): SingletonUpdateQueryBuilder<
    TSingletonName,
    TSingleton,
    TReturnType,
    TReturningFields,
    TKnownReturningFields,
    false
  > {
    this.populateFields = true
    return this as any
  }

  /**
   * Executes the HTTP request and returns the results.
   *
   * @example
   * ```ts
   * const updatedThemeOptions = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .set({ logo: 456 })
   *   .returning(['logo', 'copyrightText'])
   *   .run()
   *
   * console.log(updatedThemeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 456,
   * //     copyrightText: '© 2025 Example Inc.',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   *
   * const failedUpdate = await new SingletonUpdateQueryBuilder('ThemeOptions')
   *   .set({ logo: 'foo' })
   *   .returning(['logo', 'copyrightText'])
   *   .run()
   *
   * console.log(failedUpdate)
   * // {
   * //   success: false,
   * //   data: undefined,
   * //   runtimeError: undefined,
   * //   inputErrors: {
   * //     'logo': 'The value must be a number or `null`',
   * //   },
   * // }
   * ```
   */
  async run(): Promise<
    QueryBuilderResult<
      TReturnType extends 'count'
        ? number
        : TKnownReturningFields extends false
          ? Partial<
              (TPopulateFields extends true
                ? ExtractPopulatedTypes<TSingleton['fields']>
                : ExtractCastedTypes<TSingleton['fields']>) & { id: number }
            > &
              Record<string, any>
          : Pick<
              (TPopulateFields extends true
                ? ExtractPopulatedTypes<TSingleton['fields']>
                : ExtractCastedTypes<TSingleton['fields']>) & { id: number },
              TReturningFields & (keyof TSingleton['fields'] | 'id')
            >,
      Record<string, string>
    >
  > {
    const response = await this.options.fetcher(
      this.options.apiRouteResolver(this.singletonName, this.toQueryString()),
      { body: this.input },
    )

    if (response.success) {
      return {
        success: true,
        data: response.data,
        runtimeError: undefined,
        inputErrors: undefined,
      }
    } else if (response.error.statusCode === 422) {
      return {
        success: false,
        data: undefined,
        runtimeError: undefined,
        inputErrors: response.error.data as Record<string, string>,
      }
    } else {
      return {
        success: false,
        data: undefined,
        runtimeError: response.error.message,
        inputErrors: undefined,
      }
    }
  }
}
