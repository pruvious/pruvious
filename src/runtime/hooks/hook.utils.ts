import type { CollectionName, MultiCollectionName } from '#pruvious'
import { hooks } from '#pruvious/server'
import type { HookAction, HookContext } from './hook.definition'

/**
 * Apply hooks before creating a record in the specified `collection`.
 * Hooks are registered custom actions that allow intercepting and modifying data during specific stages of API operations.
 *
 * The second argument of this function is a `context` object containing data and parameters relevant to the hook action.
 */
export async function applyHooksBeforeCreate<T extends MultiCollectionName>(
  collection: T,
  context: Pick<HookContext<T>, 'currentQuery' | 'input' | 'query' | 'user'>,
): Promise<void> {
  await applyHooks(collection, 'beforeCreate', context)
}

/**
 * Apply hooks after creating a record in the specified `collection`.
 * Hooks are registered custom actions that allow intercepting and modifying data during specific stages of API operations.
 *
 * The second argument of this function is a `context` object containing data and parameters relevant to the hook action.
 */
export async function applyHooksAfterCreate<T extends MultiCollectionName>(
  collection: T,
  context: Pick<HookContext<T>, 'query' | 'record' | 'recordId' | 'user'>,
): Promise<void> {
  await applyHooks(collection, 'afterCreate', context)
}

/**
 * Apply hooks before reading one or more records from the specified `collection`.
 * Hooks are registered custom actions that allow intercepting and modifying data during specific stages of API operations.
 *
 * The second argument of this function is a `context` object containing data and parameters relevant to the hook action.
 */
export async function applyHooksBeforeRead<T extends CollectionName>(
  collection: T,
  context: Pick<HookContext<T>, 'currentQuery' | 'query' | 'user'>,
): Promise<void> {
  await applyHooks(collection, 'beforeRead', context)
}

/**
 * Apply hooks after reading a record from the specified `collection`.
 * Hooks are registered custom actions that allow intercepting and modifying data during specific stages of API operations.
 *
 * The second argument of this function is a `context` object containing data and parameters relevant to the hook action.
 */
export async function applyHooksAfterRead<T extends CollectionName>(
  collection: T,
  context: Pick<HookContext<T>, 'query' | 'record' | 'recordId' | 'user'>,
): Promise<void> {
  await applyHooks(collection, 'afterRead', context)
}

/**
 * Apply hooks before updating one or more records in the specified `collection`.
 * Hooks are registered custom actions that allow intercepting and modifying data during specific stages of API operations.
 *
 * The second argument of this function is a `context` object containing data and parameters relevant to the hook action.
 */
export async function applyHooksBeforeUpdate<T extends CollectionName>(
  collection: T,
  context: Pick<HookContext<T>, 'currentQuery' | 'input' | 'query' | 'user'>,
): Promise<void> {
  await applyHooks(collection, 'beforeUpdate', context)
}

/**
 * Apply hooks after updating a record in the specified `collection`.
 * Hooks are registered custom actions that allow intercepting and modifying data during specific stages of API operations.
 *
 * The second argument of this function is a `context` object containing data and parameters relevant to the hook action.
 */
export async function applyHooksAfterUpdate<T extends CollectionName>(
  collection: T,
  context: Pick<HookContext<T>, 'query' | 'record' | 'recordId' | 'user'>,
): Promise<void> {
  await applyHooks(collection, 'afterUpdate', context)
}

/**
 * Apply hooks before deleting one or more records from the specified `collection`.
 * Hooks are registered custom actions that allow intercepting and modifying data during specific stages of API operations.
 *
 * The second argument of this function is a `context` object containing data and parameters relevant to the hook action.
 */
export async function applyHooksBeforeDelete<T extends MultiCollectionName>(
  collection: T,
  context: Pick<HookContext<T>, 'currentQuery' | 'query' | 'user'>,
): Promise<void> {
  await applyHooks(collection, 'beforeDelete', context)
}

/**
 * Apply hooks after deleting a record from the specified `collection`.
 * Hooks are registered custom actions that allow intercepting and modifying data during specific stages of API operations.
 *
 * The second argument of this function is a `context` object containing data and parameters relevant to the hook action.
 */
export async function applyHooksAfterDelete<T extends MultiCollectionName>(
  collection: T,
  context: Pick<HookContext<T>, 'query' | 'record' | 'recordId' | 'user'>,
): Promise<void> {
  await applyHooks(collection, 'afterDelete', context)
}

/**
 * Apply hooks before returning a record from the specified `collection`.
 * Hooks are registered custom actions that allow intercepting and modifying data during specific stages of API operations.
 *
 * The second argument of this function is a `context` object containing data and parameters relevant to the hook action.
 *
 * @example
 * ```typescript
 * // Omit the 'secret' field from the 'products' collection's output
 * defineHook('products', 'beforeReturnRecord', ({ record }) => delete record.secret)
 *
 * // Trigger 'beforeReturnRecord' hooks in './server/api/products/[id].get.ts'
 * export default defineEventHandler(async (event) => {
 *   const record = await query('records').where('id', +event.context.params!.id).first()
 *
 *   if (record) {
 *     await applyHooksBeforeReturnRecord('products', ({ record, user: event.context.auth.user }))
 *   }
 *
 *   return record
 * })
 * ```
 */
export async function applyHooksBeforeReturnRecord<T extends CollectionName>(
  collection: T,
  context: Pick<HookContext<T>, 'query' | 'record' | 'user'>,
): Promise<void> {
  await applyHooks(collection, 'beforeReturnRecord', context)
}

async function applyHooks(collection: CollectionName, action: HookAction, context: any) {
  if ((hooks as any)[collection] && (hooks as any)[collection][action]) {
    for (const { callback } of (hooks as any)[collection][action]) {
      await callback(context)
    }
  }
}
