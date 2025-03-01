import type { I18n } from '@pruvious/i18n'
import {
  castToBoolean,
  deepClone,
  isArray,
  isBoolean,
  isDefined,
  isNull,
  isNumber,
  isNumericString,
  isRealNumber,
  isUndefined,
  toArray,
  type ExtractSQLParams,
} from '@pruvious/utils'
import type { GenericCollection, GenericDatabase } from '../core'
import { DerivedQueryBuilder } from './DerivedQueryBuilder'
import type {
  DerivedExpressionBuilder,
  OmitReservedSQLParams,
  Operator,
  WhereCondition,
  WhereOperator,
  WhereValue,
} from './types'

export class ConditionalQueryBuilder<
  TCollections extends Record<string, GenericCollection>,
  const TCollectionName extends string,
  TCollection extends GenericCollection,
  TI18n extends I18n,
> extends DerivedQueryBuilder<TCollections, TCollectionName, TCollection, TI18n> {
  protected whereCondition: WhereCondition[] = []

  constructor(
    protected collections: TCollections,
    protected collectionName: TCollectionName,
    protected i18n: TI18n,
    protected db: GenericDatabase,
    protected contextLanguage: string,
    protected logger: (message: string, ...optionalParams: any[]) => void,
  ) {
    super(collections, collectionName, i18n, db, contextLanguage, logger)
  }

  /**
   * Replaces the entire `whereCondition` array with a new set of conditions.
   *
   * This method overwrites any existing conditions.
   */
  setWhereCondition(whereCondition: WhereCondition[]): this {
    this.whereCondition = whereCondition
    return this
  }

  /**
   * Retrieves a deep copy of the current `whereCondition` array.
   */
  getWhereCondition(): WhereCondition[] {
    return deepClone(this.whereCondition)
  }

  /**
   * Adds a condition to the query to filter the results based on a `field`, `operator`, and `value`.
   *
   * This method can be chained to add multiple conditions to the query.
   *
   * @example
   * ```ts
   * const students = await this.selectFrom('Students')
   *   .select(['firstName', 'lastName'])
   *   .where('firstName', 'like', 'H%')
   *   .all()
   *
   * console.log(students)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter' },
   * //     { firstName: 'Hermione', lastName: 'Granger' },
   * //     // ... other students with first names starting with 'H'
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  where<
    TField extends TCollection['TColumnNames'] | 'id',
    TOperator extends TField extends 'id'
      ? Exclude<
          Operator,
          'includes' | 'includesAny' | 'excludes' | 'excludesAny' | 'like' | 'notLike' | 'ilike' | 'notIlike'
        >
      : WhereOperator<TCollection['fields'][TField]>,
    TValue extends TField extends 'id'
      ? WhereValue<any, TOperator, number | string>
      : WhereValue<TCollection['fields'][TField], TOperator>,
  >(field: TField, operator: TOperator, value: TValue): this {
    this.whereCondition.push({ field, operator, value: value as any })
    return this
  }

  /**
   * Adds a raw SQL condition to the query for more complex filtering.
   *
   * Parameter names with the pattern `$p${number}` (e.g. '$p1', '$p2', etc.) are forbidden due to the use for internal parameterization.
   * Be cautious when using this method, as it can make your queries vulnerable to SQL injection if not used properly.
   *
   * This method can be chained to add multiple conditions to the query.
   *
   * @example
   * ```ts
   * const students = await this.selectFrom('Students')
   *   .select(['firstName', 'lastName'])
   *   .whereRaw('"id" in (select "studentId" from "Enrollments" where "courseId" = $courseId)', { courseId: 1 })
   *   .all()
   *
   * console.log(students)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter' },
   * //     { firstName: 'Hermione', lastName: 'Granger' },
   * //     { firstName: 'Ron', lastName: 'Weasley' },
   * //     // ... other students enrolled in the course with ID 1
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  whereRaw<T extends string>(where: T, params?: OmitReservedSQLParams<ExtractSQLParams<T>>): this {
    this.whereCondition.push({ raw: where, params })
    return this
  }

  /**
   * Adds an OR condition group to the query, allowing for complex logical combinations of conditions.
   *
   * This method can be chained to add multiple conditions to the query.
   *
   * @example
   * ```ts
   * const students = await this.selectFrom('Students')
   *   .select(['firstName', 'lastName'])
   *   .orGroup([
   *     (eb) => eb.where('firstName', '=', 'Harry'),
   *     (eb) => eb.where('firstName', '=', 'Hermione'),
   *   ])
   *   .all()
   *
   * console.log(students)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Harry', lastName: 'Potter' },
   * //     { firstName: 'Hermione', lastName: 'Granger' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  orGroup(
    callbacks: ((
      eb: DerivedExpressionBuilder<TCollections, TCollectionName, TCollection, TI18n>,
    ) => DerivedExpressionBuilder<TCollections, TCollectionName, TCollection, TI18n>)[],
  ): this {
    const or: WhereCondition[][] = []

    for (const callback of callbacks) {
      const eb = callback(
        new ConditionalQueryBuilder(
          this.collections,
          this.collectionName,
          this.i18n,
          this.db,
          this.contextLanguage,
          this.logger,
        ),
      ) as ConditionalQueryBuilder<TCollections, TCollectionName, TCollection, TI18n>

      or.push(eb.whereCondition)
    }

    this.whereCondition.push({ or })

    return this
  }

  /**
   * Removes all previously set WHERE conditions from the query.
   */
  clearWhere(): this {
    this.whereCondition = []
    return this
  }

  /**
   * Validates the `whereCondition` array to ensure:
   *
   * - Column names used in conditions exist in the collection.
   * - Operators are valid and supported.
   * - Values match the expected type for the given field and operator.
   *
   * The `whereCondition` parameter is optional and defaults to the root `whereCondition` property.
   */
  protected validateWhereCondition(whereCondition?: WhereCondition[]) {
    if (isUndefined(this.runtimeError)) {
      for (const condition of whereCondition ?? this.whereCondition) {
        if ('field' in condition) {
          const field = this.c().fields[condition.field]

          if (!field && condition.field !== 'id') {
            return this.setRuntimeError(this._('The field `$field` does not exist', { field: condition.field }))
          }

          const dataType = condition.field === 'id' ? 'bigint' : field!.model.dataType
          const nullable = condition.field === 'id' ? false : field!.nullable

          if (condition.operator === '=' || condition.operator === '!=') {
            if (condition.value === null) {
              if (!nullable) {
                return this.setRuntimeError(this._('The field `$field` is not nullable', { field: condition.field }))
              }
            } else if (dataType === 'bigint' || dataType === 'numeric') {
              if (!isRealNumber(condition.value) && !isNumericString(condition.value)) {
                return this.setRuntimeError(
                  this._(
                    nullable ? 'The field `$field` must be a number or `null`' : 'The field `$field` must be a number',
                    { field: condition.field },
                  ),
                )
              }
            } else if (dataType === 'boolean') {
              if (!isBoolean(castToBoolean(condition.value))) {
                return this.setRuntimeError(
                  this._(
                    nullable
                      ? 'The field `$field` must be a boolean or `null`'
                      : 'The field `$field` must be a boolean',
                    { field: condition.field },
                  ),
                )
              }
            }
          } else if (
            condition.operator === '<' ||
            condition.operator === '<=' ||
            condition.operator === '>' ||
            condition.operator === '>='
          ) {
            if (dataType === 'bigint' || dataType === 'numeric') {
              if (!isRealNumber(condition.value) && !isNumericString(condition.value)) {
                return this.setRuntimeError(this._('The field `$field` must be a number', { field: condition.field }))
              }
            } else {
              return this.setRuntimeError(
                this._('The operator `$operator` is not supported for the field `$field`', {
                  operator: condition.operator,
                  field: condition.field,
                }),
              )
            }
          } else if (condition.operator === 'in' || condition.operator === 'notIn') {
            if (!nullable && isArray(condition.value) && (condition.value as any[]).includes(null)) {
              return this.setRuntimeError(this._('The field `$field` is not nullable', { field: condition.field }))
            } else if (dataType === 'bigint' || dataType === 'numeric') {
              if (!isArray(condition.value) || !condition.value.every((v) => isRealNumber(v) || isNumericString(v))) {
                return this.setRuntimeError(
                  this._('The field `$field` must be an array of numbers', { field: condition.field }),
                )
              }
            } else if (dataType === 'boolean') {
              return this.setRuntimeError(
                this._('The operator `$operator` is not supported for the field `$field`', {
                  operator: condition.operator,
                  field: condition.field,
                }),
              )
            } else if (dataType === 'text') {
              if (!isArray(condition.value)) {
                return this.setRuntimeError(
                  this._('The field `$field` must be an array of strings', { field: condition.field }),
                )
              }
            }
          } else if (
            condition.operator === 'includes' ||
            condition.operator === 'includesAny' ||
            condition.operator === 'excludes' ||
            condition.operator === 'excludesAny' ||
            condition.operator === 'like' ||
            condition.operator === 'notLike' ||
            condition.operator === 'ilike' ||
            condition.operator === 'notIlike'
          ) {
            if (dataType !== 'text') {
              return this.setRuntimeError(
                this._('The operator `$operator` is not supported for the field `$field`', {
                  operator: condition.operator,
                  field: condition.field,
                }),
              )
            }
          } else if (condition.operator === 'between' || condition.operator === 'notBetween') {
            if (dataType === 'bigint' || dataType === 'numeric') {
              if (
                !isArray(condition.value) ||
                condition.value.length !== 2 ||
                !condition.value.every((v) => isRealNumber(v) || isNumericString(v))
              ) {
                return this.setRuntimeError(
                  this._('The `$field` field must be an array containing exactly two numbers', {
                    field: condition.field,
                  }),
                )
              }
            } else {
              return this.setRuntimeError(
                this._('The operator `$operator` is not supported for the field `$field`', {
                  operator: condition.operator,
                  field: condition.field,
                }),
              )
            }
          }
        } else if ('or' in condition) {
          for (const orGroup of condition.or) {
            this.validateWhereCondition(orGroup)

            if (isDefined(this.runtimeError)) {
              return
            }
          }
        }
      }
    }
  }

  /**
   * Traverses the `whereCondition` array and executes a `callback` for each condition.
   *
   * The `callback` function receives the following arguments:
   *
   * - `condition` - The current condition being traversed.
   * - `parent` - The parent condition array of the current `condition`.
   * - `index` - The index of the current `condition` in the `parent` array.
   *
   * The `whereCondition` parameter is optional and defaults to the root `whereCondition` property.
   */
  traverseWhereCondition(
    callback: (condition: WhereCondition, parent: WhereCondition[], index: number) => void,
    whereCondition?: WhereCondition[],
  ) {
    const parent = whereCondition ?? this.whereCondition

    for (const [index, condition] of parent.entries()) {
      callback(condition, parent, index)

      if ('or' in condition) {
        for (const orGroup of condition.or) {
          this.traverseWhereCondition(callback, orGroup)
        }
      }
    }
  }

  /**
   * Generates the SQL string and its corresponding parameters for the WHERE clause.
   *
   * - The `index` argument is used for parameterization in the SQL query.
   * - The `whereCondition` parameter is optional and defaults to the root `whereCondition` property.
   */
  protected whereConditionToSQL(index: number, whereCondition?: WhereCondition[]) {
    const sql: string[] = []
    const params: Record<string, any> = {}

    for (const condition of whereCondition ?? this.whereCondition) {
      if ('field' in condition) {
        const columnName = condition.field
        const dataType = condition.field === 'id' ? 'bigint' : this.c().fields[condition.field].model.dataType

        if (condition.operator === 'in' || condition.operator === 'notIn') {
          const value = condition.value as (string | number | null)[]
          const sqlOperator = condition.operator === 'notIn' ? 'not in' : 'in'
          sql.push(
            `${this.escapeIdentifier(columnName)} ${sqlOperator} (${value
              .map((v) => {
                params[`p${index + 1}`] = v
                return `$p${++index}`
              })
              .join(', ')})`,
          )
        } else if (
          (condition.operator === 'ilike' || condition.operator === 'notIlike') &&
          (this.db.dialect === 'sqlite' || this.db.dialect === 'd1')
        ) {
          const compatibleOperator = condition.operator === 'ilike' ? 'like' : 'not like'
          sql.push(`lower(${this.escapeIdentifier(columnName)}) ${compatibleOperator} lower($p${++index})`)
          params[`p${index}`] = condition.value
        } else if (condition.operator === 'between' || condition.operator === 'notBetween') {
          const sqlOperator = condition.operator === 'notBetween' ? 'not between' : 'between'
          sql.push(`${this.escapeIdentifier(columnName)} ${sqlOperator} $p${++index} and $p${++index}`)
          params[`p${index - 1}`] = (condition.value as [number, number])[0]
          params[`p${index}`] = (condition.value as [number, number])[1]
        } else if (isNull(condition.value) && (condition.operator === '=' || condition.operator === '!=')) {
          const sqlOperator = condition.operator === '=' ? 'is' : 'is not'
          sql.push(`${this.escapeIdentifier(columnName)} ${sqlOperator} null`)
        } else if (condition.operator === 'includes' || condition.operator === 'excludesAny') {
          const sqlOperator = condition.operator === 'includes' ? 'like' : 'not like'
          for (const v of toArray(condition.value)) {
            sql.push(`${this.escapeIdentifier(columnName)} ${sqlOperator} $p${++index}`)
            params[`p${index}`] = isNumber(v) ? `%[${v}]%` : `%["${v}"]%`
          }
        } else if (condition.operator === 'includesAny' || condition.operator === 'excludes') {
          const sqlOperator = condition.operator === 'includesAny' ? 'like' : 'not like'
          const orGroupSQL: string[] = []
          for (const v of toArray(condition.value)) {
            orGroupSQL.push(`${this.escapeIdentifier(columnName)} ${sqlOperator} $p${++index}`)
            params[`p${index}`] = isNumber(v) ? `%[${v}]%` : `%["${v}"]%`
          }
          if (orGroupSQL.length) {
            sql.push(`(${orGroupSQL.join(' or ')})`)
          }
        } else {
          const sqlOperator =
            condition.operator === 'notLike'
              ? 'not like'
              : condition.operator === 'notIlike'
                ? 'not ilike'
                : condition.operator
          sql.push(`${this.escapeIdentifier(columnName)} ${sqlOperator} $p${++index}`)
          params[`p${index}`] =
            dataType === 'boolean' && (condition.operator === '=' || condition.operator === '!=')
              ? castToBoolean(condition.value)
                ? 1
                : 0
              : condition.value
        }
      } else if ('raw' in condition) {
        sql.push(condition.raw)
        Object.assign(params, condition.params)
      } else if ('or' in condition) {
        const orGroupSQL: string[] = []

        for (const orGroup of condition.or) {
          const parsedOrGroup = this.whereConditionToSQL(index, orGroup)
          index = parsedOrGroup.index
          orGroupSQL.push(parsedOrGroup.sql)
          Object.assign(params, parsedOrGroup.params)
        }

        sql.push(`(${orGroupSQL.join(' or ')})`)
      }
    }

    return {
      sql: sql.length ? (whereCondition ? '' : ' where ') + sql.join(' and ') : '',
      params,
      index,
    }
  }
}
