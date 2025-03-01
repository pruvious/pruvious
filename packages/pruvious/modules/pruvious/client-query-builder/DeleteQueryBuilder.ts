import type {
  Collection,
  DefaultQueryBuilderParamsOptions,
  DeleteQueryBuilderParamsOptions,
  ExtractCastedTypes,
  ExtractPopulatedTypes,
  QueryBuilderResult,
} from '@pruvious/orm'
import {
  deleteQueryBuilderParamsToQueryString,
  queryStringToDeleteQueryBuilderParams,
} from '@pruvious/orm/query-string'
import { deepClone, isDefined, toArray, uniqueArray, type NonEmptyArray } from '@pruvious/utils'
import { ConditionalQueryBuilder } from './ConditionalQueryBuilder'
import type { QueryBuilderOptions } from './QueryBuilder'

/**
 * A utility class for constructing and querying collection records through the DELETE collections API in a type-safe manner.
 * This class is designed for client-side code and only works for collections that have the `api.delete` setting enabled.
 *
 * @example
 * ```ts
 * const deletedStudent = await this.deleteFrom('Students')
 *   .where('firstName', '=', 'Draco')
 *   .where('lastName', '=', 'Malfoy')
 *   .returning(['firstName', 'lastName'])
 *   .run()
 *
 * console.log(deletedStudent)
 * // {
 * //   success: true,
 * //   data: [
 * //     { firstName: 'Draco', lastName: 'Malfoy' }
 * //   ],
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const deletedBookCount = await this.deleteFrom('Books')
 *   .where('author', '=', 'Gilderoy Lockhart')
 *   .run()
 *
 * console.log(deletedBookCount) // 7
 *
 * const failedDelete = await this.deleteFrom('Houses')
 *   .where('name', 'Slytherin')
 *   .returning(['name'])
 *   .run()
 *
 * console.log(failedDelete)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: 'Cannot delete a Hogwarts house',
 * //   inputErrors: undefined,
 * // }
 * ```
 */
export class DeleteQueryBuilder<
  TCollections extends Record<string, Collection<Record<string, any>, Record<string, any>>>,
  TCollectionName extends keyof TCollections & string,
  TCollection extends TCollections[TCollectionName],
  TReturnType extends 'rows' | 'count' = 'count',
  TReturningFields extends TCollection['TColumnNames'] | 'id' = never,
  TKnownReturningFields extends boolean = true,
  TPopulateFields extends boolean = false,
> extends ConditionalQueryBuilder<TCollections, TCollectionName, TCollection> {
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
   * - `returning` - Comma-separated list of fields to return after the DELETE operation.
   * - `where` - Filtering condition for the results (excluding raw queries).
   * - `populate` - Whether to return populated field values after the DELETE operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const deletedStudent = await this.deleteFrom('Students')
   *   .fromQueryString('returning=firstName,lastName&where=firstName[=][Draco],lastName[=][Malfoy]')
   *   .run()
   *
   * console.log(deletedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Draco', lastName: 'Malfoy' }
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  fromQueryString(
    queryString: string | URLSearchParams | Record<string, string | string[]>,
    options?: DeleteQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): DeleteQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    'rows' | 'count',
    TReturningFields,
    false,
    TPopulateFields
  > {
    const params = queryStringToDeleteQueryBuilderParams(queryString, options)

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
   * - `returning` - Comma-separated list of fields to return after the DELETE operation.
   * - `where` - Filtering condition for the results (excluding raw queries).
   * - `populate` - Whether to return populated field values after the DELETE operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const queryString = this.deleteFrom('Students')
   *   .where('firstName', '=', 'Draco')
   *   .where('lastName', '=', 'Malfoy')
   *   .returning(['firstName', 'lastName'])
   *   .toQueryString()
   *
   * console.log(queryString)
   * // 'returning=firstName,lastName&where=firstName[=][Draco],lastName[=][Malfoy]'
   * ```
   */
  toQueryString(
    options?: DeleteQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): string {
    const wd = !!options?.withDefaults

    return deleteQueryBuilderParamsToQueryString(
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
    const clone = new DeleteQueryBuilder(this.collectionName, this.options)

    clone.whereCondition = deepClone(this.whereCondition)

    clone.returnType = this.returnType
    clone.returningFields = [...this.returningFields]
    clone.populateFields = this.populateFields

    return clone as any
  }

  /**
   * Specifies which `fields` should be returned after the DELETE operation.
   *
   * This method will override any previously set RETURNING fields.
   *
   * @example
   * ```ts
   * const deletedStudent = await this.deleteFrom('Students')
   *   .where('firstName', '=', 'Draco')
   *   .where('lastName', '=', 'Malfoy')
   *   .returning(['firstName', 'lastName'])
   *   .run()
   *
   * console.log(deletedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Draco', lastName: 'Malfoy' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    fields: NonEmptyArray<TReturningFields>,
  ): DeleteQueryBuilder<TCollections, TCollectionName, TCollection, 'rows', TReturningFields, true, TPopulateFields>
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    field: TReturningFields,
  ): DeleteQueryBuilder<TCollections, TCollectionName, TCollection, 'rows', TReturningFields, true, TPopulateFields>
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    fields: NonEmptyArray<TReturningFields> | TReturningFields,
  ) {
    this.returnType = 'rows'
    this.returningFields = uniqueArray(toArray(fields))
    return this as DeleteQueryBuilder<
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
   * Specifies that all fields should be returned after the DELETE operation.
   *
   * @example
   * ```ts
   * const deletedStudent = await this.deleteFrom('Students')
   *   .where('firstName', '=', 'Draco')
   *   .where('lastName', '=', 'Malfoy')
   *   .returningAll()
   *   .run()
   *
   * console.log(deletedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     {
   * //       id: 3,
   * //       firstName: 'Draco',
   * //       middleName: null,
   * //       lastName: 'Malfoy',
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
  returningAll(): DeleteQueryBuilder<
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
   * This means the DELETE operation will return the number of affected rows instead of the deleted data.
   *
   * @example
   * ```ts
   * const deletedBookCount = await this.deleteFrom('Books')
   *   .where('author', '=', 'Gilderoy Lockhart')
   *   .returning(['id']) // This will be ignored
   *   .clearReturning()  // This will clear the RETURNING fields
   *   .run()
   *
   * console.log(deletedBookCount) // 7
   * ```
   */
  clearReturning(): DeleteQueryBuilder<
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
   * const deletedStudent = await this.deleteFrom('Students')
   *   .where('id', '=', 2)
   *   .returning(['id', 'house'])
   *   .populate()
   *   .run()
   *
   * console.log(deletedStudent)
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
  populate(): DeleteQueryBuilder<
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
   * this.deleteFrom('Students')
   *   .where('id', '=', 2)
   *   .returning(['id', 'house'])
   *   .populate()      // This will be ignored
   *   .clearPopulate() // This will disable field population
   *   .all()
   * ```
   */
  clearPopulate(): DeleteQueryBuilder<
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
   * Executes the DELETE query and returns the results.
   *
   * @example
   * ```ts
   * const deletedStudent = await this.deleteFrom('Students')
   *   .where('firstName', '=', 'Draco')
   *   .where('lastName', '=', 'Malfoy')
   *   .returning(['firstName', 'lastName'])
   *   .run()
   *
   * console.log(deletedStudent)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Draco', lastName: 'Malfoy' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   *
   * const failedDelete = await this.deleteFrom('Houses')
   *   .where('name', 'Slytherin')
   *   .returning(['name'])
   *   .run()
   *
   * console.log(failedDelete)
   * // {
   * //   success: false,
   * //   data: undefined,
   * //   runtimeError: 'Cannot delete a Hogwarts house',
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
      undefined
    >
  > {
    const response = await this.options.fetcher(this.options.apiRouteResolver.delete(this.collectionName), {
      body: { query: this.toQueryString() },
    })

    if (response.success) {
      return {
        success: true,
        data: response.data,
        runtimeError: undefined,
        inputErrors: undefined,
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
