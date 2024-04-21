import type { AuthUser, CastedFieldType, CollectionName, MultiCollectionName, PopulatedFieldType } from '#pruvious'
import { query } from '../collections/query'
import type { QueryBuilderInstance } from '../utility-types'

export interface HookDefinition {
  collection: CollectionName
  action: HookAction
  callback: (context: any) => any | Promise<any>
}

export type HookAction =
  | 'beforeCreate'
  | 'afterCreate'
  | 'beforeRead'
  | 'afterRead'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeDelete'
  | 'afterDelete'
  | 'beforeReturnRecord'

export interface HookContext<T extends CollectionName> {
  /**
   * The input values used for creating or updating a record.
   * It is a regular key-value object, where the key represents the field name, and the value represents the field's value.
   */
  input: Record<string, any>

  /**
   * The current query builder instance.
   * Utilize `query.clone()` to execute custom queries, such as data retrieval.
   */
  currentQuery: QueryBuilderInstance<T>

  /**
   * Utility function for creating a new query builder.
   */
  query: typeof query

  /**
   * The collection record processed by the `currentQuery`.
   */
  record: Partial<CastedFieldType[T] | PopulatedFieldType[T]>

  /**
   * The ID of the collection record processed by the `currentQuery`.
   */
  recordId: number

  /**
   * The current logged-in user associated with the request or `null` if no user is authenticated.
   */
  user: AuthUser | null
}

/**
 * Register a hook for the specified collection's default API routes.
 * Hooks are used to perform custom actions at specific stages during API operations.
 *
 * It takes the `collection` and `action` names as the first two arguments and a `callback` function as the third argument.
 *
 * The `callback` function accepts a `context` argument that contains various parameters specific to the hook `action`.
 *
 * @see https://pruvious.com/docs/hooks
 *
 * @example
 * ```typescript
 * // Omit the 'secret' field from the 'products' collection's output
 * defineHook('products', 'beforeReturnRecord', ({ record }) => delete record.secret)
 *
 * // Trigger a webhook when new products are created
 * defineHook('products', 'afterCreate', ({ record }) => ...)
 * ```
 */
export function defineHook<T extends MultiCollectionName>(
  collection: T,
  action: 'beforeCreate',
  callback: (context: Pick<HookContext<T>, 'currentQuery' | 'input' | 'query' | 'user'>) => any | Promise<any>,
): Required<HookDefinition>

export function defineHook<T extends MultiCollectionName>(
  collection: T,
  action: 'afterCreate',
  callback: (context: Pick<HookContext<T>, 'query' | 'record' | 'recordId' | 'user'>) => any | Promise<any>,
): Required<HookDefinition>

export function defineHook<T extends CollectionName>(
  collection: T,
  action: 'beforeRead',
  callback: (context: Pick<HookContext<T>, 'currentQuery' | 'query' | 'user'>) => any | Promise<any>,
): Required<HookDefinition>

export function defineHook<T extends CollectionName>(
  collection: T,
  action: 'afterRead',
  callback: (context: Pick<HookContext<T>, 'query' | 'record' | 'recordId' | 'user'>) => any | Promise<any>,
): Required<HookDefinition>

export function defineHook<T extends CollectionName>(
  collection: T,
  action: 'beforeUpdate',
  callback: (context: Pick<HookContext<T>, 'currentQuery' | 'input' | 'query' | 'user'>) => any | Promise<any>,
): Required<HookDefinition>

export function defineHook<T extends CollectionName>(
  collection: T,
  action: 'afterUpdate',
  callback: (context: Pick<HookContext<T>, 'query' | 'record' | 'recordId' | 'user'>) => any | Promise<any>,
): Required<HookDefinition>

export function defineHook<T extends MultiCollectionName>(
  collection: T,
  action: 'beforeDelete',
  callback: (context: Pick<HookContext<T>, 'currentQuery' | 'query' | 'user'>) => any | Promise<any>,
): Required<HookDefinition>

export function defineHook<T extends MultiCollectionName>(
  collection: T,
  action: 'afterDelete',
  callback: (context: Pick<HookContext<T>, 'query' | 'record' | 'recordId' | 'user'>) => any | Promise<any>,
): Required<HookDefinition>

export function defineHook<T extends CollectionName>(
  collection: T,
  action: 'beforeReturnRecord',
  callback: (context: Pick<HookContext<T>, 'query' | 'record' | 'user'>) => any | Promise<any>,
): Required<HookDefinition>

export function defineHook(
  collection: CollectionName,
  action: HookAction,
  callback: (context: any) => any | Promise<any>,
): HookDefinition {
  return { collection, action, callback }
}
