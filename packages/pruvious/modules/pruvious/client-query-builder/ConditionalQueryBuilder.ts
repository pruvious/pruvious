import type { Collection, Operator, WhereCondition, WhereOperator, WhereValue } from '@pruvious/orm'
import { deepClone } from '@pruvious/utils'

export type DerivedExpressionBuilder<
  TCollections extends Record<string, Collection<Record<string, any>, Record<string, any>>>,
  TCollectionName extends keyof TCollections & string,
  TCollection extends TCollections[TCollectionName],
> = Pick<ConditionalQueryBuilder<TCollections, TCollectionName, TCollection>, 'where' | 'orGroup'>

export class ConditionalQueryBuilder<
  TCollections extends Record<string, Collection<Record<string, any>, Record<string, any>>>,
  const TCollectionName extends keyof TCollections & string,
  TCollection extends TCollections[TCollectionName],
> {
  protected whereCondition: WhereCondition[] = []

  constructor(protected collectionName: TCollectionName) {}

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
      eb: DerivedExpressionBuilder<TCollections, TCollectionName, TCollection>,
    ) => DerivedExpressionBuilder<TCollections, TCollectionName, TCollection>)[],
  ): this {
    const or: WhereCondition[][] = []

    for (const callback of callbacks) {
      const eb = callback(new ConditionalQueryBuilder(this.collectionName)) as ConditionalQueryBuilder<
        TCollections,
        TCollectionName,
        TCollection
      >

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
}
