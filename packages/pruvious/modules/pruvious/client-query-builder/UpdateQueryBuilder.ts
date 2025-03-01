import type {
  Collection,
  DefaultQueryBuilderParamsOptions,
  ExtractCastedTypes,
  ExtractPopulatedTypes,
  QueryBuilderResult,
  UpdateInput,
  UpdateQueryBuilderParamsOptions,
} from '@pruvious/orm'
import {
  queryStringToUpdateQueryBuilderParams,
  updateQueryBuilderParamsToQueryString,
} from '@pruvious/orm/query-string'
import { deepClone, isDefined, toArray, uniqueArray, type NonEmptyArray } from '@pruvious/utils'
import { ConditionalQueryBuilder } from './ConditionalQueryBuilder'
import type { QueryBuilderOptions } from './QueryBuilder'

/**
 * A utility class for constructing and querying collection records through the PATCH collections API in a type-safe manner.
 * This class is designed for client-side code and only works for collections that have the `api.update` setting enabled.
 *
 * @example
 * ```ts
 * const updatedStudent = await this.update('Students')
 *   .set({ house: 2, prefect: true })
 *   .where('firstName', '=', 'Harry')
 *   .where('lastName', '=', 'Potter')
 *   .returning(['firstName', 'lastName', 'house', 'prefect'])
 *   .run()
 *
 * console.log(updatedStudent)
 * // {
 * //   success: true,
 * //   data: [
 * //     { firstName: 'Harry', lastName: 'Potter', house: 2, prefect: true }
 * //   ],
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const updatedBookCount = await this.update('Books')
 *   .set({ author: 'Newt Scamander' })
 *   .where('title', '=', 'Fantastic Beasts and Where to Find Them')
 *   .run()
 *
 * console.log(updatedBookCount)
 * // {
 * //   success: true,
 * //   data: 1,
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const failedUpdate = await this.update('Spells')
 *   .set({ difficulty: 'Impossible' })
 *   .where('name', '=', 'Expelliarmus')
 *   .returning(['name', 'difficulty'])
 *   .run()
 *
 * console.log(failedUpdate)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: undefined,
 * //   inputErrors: {
 * //     'difficulty': 'Invalid difficulty level',
 * //   },
 * // }
 * ```
 */
export class UpdateQueryBuilder<
  TCollections extends Record<string, Collection<Record<string, any>, Record<string, any>>>,
  TCollectionName extends keyof TCollections & string,
  TCollection extends TCollections[TCollectionName],
  TReturnType extends 'rows' | 'count' = 'count',
  TReturningFields extends TCollection['TColumnNames'] | 'id' = never,
  TKnownReturningFields extends boolean = true,
  TPopulateFields extends boolean = false,
> extends ConditionalQueryBuilder<TCollections, TCollectionName, TCollection> {
  protected input: Record<string, any> = {}
  protected returnType: 'rows' | 'count' = 'count'
  protected returningFields: string[] = []
  protected populateFields: boolean = false

  constructor(
    collectionName: TCollectionName,
    protected options: Required<QueryBuilderOptions> & {
      apiRouteResolver: Required<QueryBuilderOptions['apiRouteResolver']>
    },
  ) {
    super(collectionName)
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
   * const updatedStudent = await this.update('Students')
   *   .fromQueryString('returning=prefect&where=firstName[=][Harry],lastName[=][Potter]')
   *   .set({ prefect: true })
   *   .run()
   *
   * console.log(updatedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     { prefect: true },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  fromQueryString(
    queryString: string | URLSearchParams | Record<string, string | string[]>,
    options?: UpdateQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): UpdateQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    'rows' | 'count',
    TReturningFields,
    false,
    TPopulateFields
  > {
    const params = queryStringToUpdateQueryBuilderParams(queryString, options)

    if (params.returning) {
      this.returning(params.returning.includes('*') ? ['*'] : (params.returning as any))
    } else if (options?.withDefaults) {
      this.clearReturning()
    }

    if (params.where) {
      this.whereCondition = params.where
    } else if (options?.withDefaults) {
      this.clearWhere()
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
   * - `where` - Filtering condition for the results (excluding raw queries).
   * - `populate` - Whether to populate fields after the UPDATE operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const queryString = this.update('Students')
   *   .set({ prefect: true })
   *   .where('firstName', '=', 'Harry')
   *   .where('lastName', '=', 'Potter')
   *   .returning('prefect')
   *   .toQueryString()
   *
   * console.log(queryString)
   * // 'returning=prefect&where=firstName[=][Harry],lastName[=][Potter]'
   * ```
   */
  toQueryString(
    options?: UpdateQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): string {
    const wd = !!options?.withDefaults

    return updateQueryBuilderParamsToQueryString(
      {
        returning: this.returnType === 'rows' ? this.returningFields : undefined,
        where: this.whereCondition.length ? (this.whereCondition as any) : wd ? [] : undefined,
        populate: this.populateFields === true ? this.populateFields : wd ? false : undefined,
      },
      options,
    )
  }

  /**
   * Clones the current query builder instance.
   */
  clone(): this {
    const clone = new UpdateQueryBuilder(this.collectionName, this.options)

    clone.whereCondition = deepClone(this.whereCondition)

    clone.input = deepClone(this.input)
    clone.returnType = this.returnType
    clone.returningFields = [...this.returningFields]
    clone.populateFields = this.populateFields

    return clone as any
  }

  /**
   * Updates specified fields of records in the current collection that match the provided conditions.
   *
   * This method will override any previously set fields.
   *
   * @example
   * ```ts
   * const updatedStudent = await this.update('Students')
   *   .set({ house: 2, prefect: true })
   *   .where('firstName', '=', 'Harry')
   *   .where('lastName', '=', 'Potter')
   *   .returning(['firstName', 'lastName', 'house', 'prefect'])
   *   .run()
   *
   * console.log(updatedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter', house: 2, prefect: true },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  set(input: UpdateInput<TCollection>): this {
    this.input = deepClone(input)
    return this
  }

  /**
   * Specifies which `fields` should be returned after the UPDATE operation.
   *
   * This method will override any previously set RETURNING fields.
   *
   * @example
   * ```ts
   * const updatedStudent = await this.update('Students')
   *   .set({ house: 2, prefect: true })
   *   .where('firstName', '=', 'Harry')
   *   .where('lastName', '=', 'Potter')
   *   .returning(['firstName', 'lastName', 'house', 'prefect'])
   *   .run()
   *
   * console.log(updatedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter', house: 2, prefect: true },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    fields: NonEmptyArray<TReturningFields>,
  ): UpdateQueryBuilder<TCollections, TCollectionName, TCollection, 'rows', TReturningFields, true, TPopulateFields>
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    field: TReturningFields,
  ): UpdateQueryBuilder<TCollections, TCollectionName, TCollection, 'rows', TReturningFields, true, TPopulateFields>
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    fields: NonEmptyArray<TReturningFields> | TReturningFields,
  ) {
    this.returnType = 'rows'
    this.returningFields = uniqueArray(toArray(fields))
    return this as UpdateQueryBuilder<
      TCollections,
      TCollectionName,
      TCollection,
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
   * const updatedStudent = await this.update('Students')
   *   .set({ house: 2, prefect: true })
   *   .where('firstName', '=', 'Harry')
   *   .where('lastName', '=', 'Potter')
   *   .returningAll()
   *   .run()
   *
   * console.log(updatedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     {
   * //       id: 1,
   * //       firstName: 'Harry',
   * //       middleName: null,
   * //       lastName: 'Potter',
   * //       house: 2,
   * //       prefect: true,
   * //       createdAt: 1724091250000,
   * //       updatedAt: 1724091250000,
   * //     },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  returningAll(): UpdateQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    'rows',
    TCollection['TColumnNames'] | 'id',
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
   * const updatedBookCount = await this.update('Books')
   *   .where('author', '=', 'Newt Scamander')
   *   .returning(['id']) // This will be ignored
   *   .clearReturning()  // This will clear the RETURNING fields
   *   .run()
   *
   * console.log(updatedBookCount)
   * // {
   * //   success: true,
   * //   data: 1,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  clearReturning(): UpdateQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    'count',
    never,
    true,
    TPopulateFields
  > {
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
   * const updatedStudent = await this.update('Students')
   *   .set({ house: 1 })
   *   .where('id', '=', 2)
   *   .returning(['id', 'house'])
   *   .populate()
   *   .run()
   *
   * console.log(updatedStudent)
   * // {
   * //   success: true,
   * //   data: [{
   * //     id: 2,
   * //     house: {
   * //       id: 1,
   * //       name: 'Gryffindor',
   * //       points: 100,
   * //     },
   * //   }],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  populate(): UpdateQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TReturnType,
    TReturningFields,
    TKnownReturningFields,
    true
  > {
    this.populateFields = true
    return this
  }

  /**
   * Disables field population for the query.
   * The query will return casted field values without executing any field populators.
   *
   * @example
   * ```ts
   * this.update('Students')
   *   .set({ house: 1 })
   *   .where('id', '=', 2)
   *   .returning(['id', 'house'])
   *   .populate()      // This will be ignored
   *   .clearPopulate() // This will disable field population
   *   .all()
   * ```
   */
  clearPopulate(): UpdateQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TReturnType,
    TReturningFields,
    TKnownReturningFields,
    false
  > {
    this.populateFields = true
    return this
  }

  /**
   * Executes the HTTP request and returns the results.
   *
   * @example
   * ```ts
   * const updatedSpell = await this.update('Spells')
   *   .set({ difficulty: 'Beginner' })
   *   .where('name', '=', 'Lumos')
   *   .returning(['name', 'difficulty'])
   *   .run()
   *
   * console.log(updatedSpell)
   * // {
   * //   success: true,
   * //   data: [
   * //     { name: 'Lumos', difficulty: 'Beginner' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   *
   * const failedUpdate = await this.update('Spells')
   *   .set({ difficulty: 'Advanced' })
   *   .where('name', '=', 'Hocus Pocus')
   *   .returning(['name', 'difficulty'])
   *   .run()
   *
   * console.log(failedUpdate)
   * // {
   * //   success: false,
   * //   data: undefined,
   * //   runtimeError: 'Spell not found',
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  async run(): Promise<
    QueryBuilderResult<
      TReturnType extends 'count'
        ? number
        : (TKnownReturningFields extends false
            ? Partial<
                (TPopulateFields extends true
                  ? ExtractPopulatedTypes<TCollection['fields']>
                  : ExtractCastedTypes<TCollection['fields']>) & { id: number }
              > &
                Record<string, any>
            : Pick<
                (TPopulateFields extends true
                  ? ExtractPopulatedTypes<TCollection['fields']>
                  : ExtractCastedTypes<TCollection['fields']>) & { id: number },
                TReturningFields
              >)[],
      Record<string, string>
    >
  > {
    const response = await this.options.fetcher(this.options.apiRouteResolver.update(this.collectionName), {
      body: { query: this.toQueryString(), data: this.input },
    })

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
