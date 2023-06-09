import { validator } from '@ioc:Adonis/Core/Validator'
import {
  CFields,
  QueryStringParameters,
  ReturnOptions,
  SFields,
  UFields,
  UpdateResult,
  ValidationError,
  ValidationResults,
  standardRoleColumns,
  standardRoleFields,
} from '@pruvious-test/shared'
import { Pruvious } from '@pruvious-test/types'
import Role from 'App/Models/Role'
import RoleValidator from 'App/Validators/RoleValidator'
import { roleConfig } from 'App/imports'
import { BaseQuery, prepareFieldValue } from './BaseQuery'
import { addInternalJob } from './worker'

type RoleResult = SFields<
  Pruvious.Role,
  Pruvious.RoleInput,
  Pruvious.SelectableRoleField | Pruvious.ComputedRoleField
>

type QueryString = QueryStringParameters<{
  LanguageCode: never
  Model: Pruvious.RoleInput
  SelectableField: Pruvious.SelectableRoleField
  SortableField: Pruvious.SortableRoleField
  FilterableField: Pruvious.FilterableRoleField
  StringField: Pruvious.RoleStringField
  NumberField: Pruvious.RoleNumberField
  BooleanField: Pruvious.RoleBooleanField
}>

type T = {
  Input: Pruvious.RoleInput
  Result: RoleResult
  PopulatedResult: Pruvious.Role
  ComputedField: Pruvious.ComputedRoleField
  SelectableField: Pruvious.SelectableRoleField
  SortableField: Pruvious.SortableRoleField
  FilterableField: Pruvious.FilterableRoleField
  StringField: Pruvious.RoleStringField
  NumberField: Pruvious.RoleNumberField
  BooleanField: Pruvious.RoleBooleanField
  LanguageCode: never
}

export class RoleQuery extends BaseQuery<T> {
  constructor(params?: string | QueryString) {
    super()

    this.table = 'roles'

    this.query = Role.query()

    this.columns = standardRoleColumns

    this.fields.push(...standardRoleFields)

    this.translatable = false

    this.relations.push('users')

    this.createHook = roleConfig.onCreate
    this.readHook = roleConfig.onRead
    this.populateHook = roleConfig.onPopulate
    this.updateHook = roleConfig.onUpdate
    this.deleteHook = roleConfig.onDelete

    if (roleConfig.listing?.perPage) {
      this.perPage = roleConfig.listing.perPage
    }

    if (roleConfig.perPageLimit) {
      this.perPageLimit = roleConfig.perPageLimit
    }

    if (typeof params === 'string') {
      this.fromQueryString(params)
    } else if (typeof params === 'object') {
      this.apply(params)
    }
  }

  /**
   * Apply filters, selected fields, and sort and pagination parameters from a query string `value`.
   *
   * @example
   * ```js
   * await queryRoles().fromQueryString('sort=createdAt:desc&filters[name][$contains]=admin')
   *
   * // Alternative 1:
   * await queryRoles().apply({ sort: 'createdAt:desc', filters: { name: { $contains: 'admin' } } })
   *
   * // Alternative 2:
   * await queryRoles().whereLike('name', '%admin%').orderBy('createdAt', 'desc')
   * ```
   */
  fromQueryString(value: string): this {
    return super.fromQueryString(value)
  }

  /**
   * Apply filters, selected fields, locales, and sort and pagination parameters from parsed query string `params`.
   *
   * @example
   * ```js
   * await queryRoles().apply({ sort: 'createdAt:desc', filters: { name: { $contains: 'admin' } } })
   *
   * // Alternative 1:
   * await queryRoles().fromQueryString('sort=createdAt:desc&filters[name][$contains]=admin')
   *
   * // Alternative 2:
   * await queryRoles().whereLike('name', '%admin%').orderBy('createdAt', 'desc')
   * ```
   */
  apply(
    params: QueryStringParameters<{
      LanguageCode: T['LanguageCode']
      Model: T['Input']
      SelectableField: T['SelectableField']
      SortableField: T['SortableField']
      FilterableField: T['FilterableField']
      StringField: T['StringField']
      NumberField: T['NumberField']
      BooleanField: T['BooleanField']
    }>,
  ): this {
    return super.apply(params)
  }

  /**
   * An array of field names that will be returned in the query results.
   * Use a wildcard (*) to select all fields.
   *
   * @example
   * ```js
   * await queryRoles().select('id', 'name').all()
   * // [{ id: 1, name: 'Administrator' }]
   * ```
   */
  select(...fields: (T['SelectableField'] | '*')[]): this {
    return super.select(...fields)
  }

  /**
   * Retrieve a role by its ID.
   *
   * @example
   * ```js
   * await queryRoles().find(1)
   * ```
   */
  async find(id: number): Promise<RoleResult | null> {
    const role = await Role.find(id)
    return role ? await this.serialize(role) : null
  }

  /**
   * Find a role based on a specific field-value pair.
   *
   * @example
   * ```js
   * await queryRoles().findBy('name', 'Administrator')
   * ```
   */
  async findBy<FieldName extends Pruvious.FilterableRoleField>(
    field: FieldName,
    value: Exclude<Pruvious.RoleInput[FieldName], null>,
  ): Promise<RoleResult | null> {
    const roles = await this.$where('', 'and', field, value, Role.query())
      .orderBy('id', 'desc')
      .limit(1)

    return roles.length ? await this.serialize(roles[0]) : null
  }

  /**
   * Define a `where` clause in SQL queries by specifying a field name and a corresponding value to filter the query results.
   *
   * @example
   * ```js
   * await queryRoles().where('name', 'Administrator').first()
   * ```
   */
  where<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    return super.where(field, value)
  }

  /**
   * Refine the `where` clause in SQL queries using the `AND` operator by specifying a field name and a corresponding value to filter the query results.
   *
   * @alias where
   * @example
   * ```js
   * await queryRoles().where('name', 'Administrator').andWhere('updatedAt', '2023-01-01').first()
   * ```
   */
  andWhere<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    return super.andWhere(field, value)
  }

  protected async _create(
    fields: CFields<Pruvious.RoleInput, Pruvious.CreatableRoleField, Pruvious.RequiredRoleField>,
  ): Promise<{ success: true; data: RoleResult } | { success: false; errors: ValidationError[] }> {
    if (this.createHook) {
      await this.createHook(fields)
    }

    const validationResults = await validateRoleFields(fields)

    if (validationResults.success) {
      const records = validationResults.data

      const role = await Role.create({
        name: records.name.trim(),
        capabilities: prepareFieldValue(records.capabilities, []),
      })

      await role.refresh()
      await addInternalJob('flush', 'Role', role.id)

      return { success: true, data: await this.serialize(role) }
    }

    return validationResults
  }

  /**
   * Update the selected roles.
   *
   * @example
   * ```js
   * await queryRoles().where('id', 1).update({ name: 'Author' })
   * // [{ success: true; data: { id: 1 } }]
   * ```
   */
  async update(
    fields: UFields<Pruvious.RoleInput, Pruvious.UpdateableRoleField>,
  ): Promise<UpdateResult<RoleResult>[]> {
    const results: UpdateResult<RoleResult>[] = []
    const roles: Role[] = await this.prepare().exec()

    if (this.updateHook) {
      await this.updateHook(fields)
    }

    for (const role of roles) {
      const fieldsToValidate = { ...fields, id: role.id }

      for (const column of Object.keys(this.columns)) {
        if (fieldsToValidate[column] === undefined) {
          fieldsToValidate[column] = role[column]
        }
      }

      const validationResults = await validateRoleFields(fieldsToValidate, 'update')

      if (validationResults.success) {
        const records = validationResults.data

        role.merge({
          name: prepareFieldValue(records.name, role.name).trim(),
          capabilities: prepareFieldValue(records.capabilities, role.capabilities),
        })

        await role.save()
        await role.refresh()

        await addInternalJob('flush', 'Role', role.id)

        results.push({
          success: true,
          data: await this.serialize(role),
        })
      } else {
        results.push({
          success: false,
          data: await this.serialize(role),
          errors: validationResults.errors,
        })
      }
    }

    return results
  }

  /**
   * Delete the selected roles.
   *
   * @example
   * ```js
   * await queryRoles().whereLt('createdAt', '2023-01-01').delete()
   * // Deletes all roles created before the year 2023
   * ```
   */
  async delete(): Promise<number[]> {
    const deleted: number[] = []
    const roles: Role[] = await this.prepare().exec()

    for (const role of roles) {
      if (this.deleteHook) {
        await this.deleteHook(role.id)
      }

      await role.delete()
      deleted.push(role.id)
    }

    return deleted
  }
}

/**
 * Create a query builder instance for roles.
 *
 * @todo example
 */
export function queryRoles(params?: string | QueryString): RoleQuery {
  return new RoleQuery(params)
}

/**
 * Validate role field inputs.
 *
 * Default mode is `create`.
 *
 * @example
 * ```js
 * await validateRoleFields({})
 * // { success: false, errors: [{ field: 'name', message: 'This field is required' }] }
 *
 * await validateRoleFields({ name: 'Subscriber' })
 * // { success: true }
 *
 * await validateRoleFields({ id: 1, capabilities: ['login', 'updateProfile'] }, 'update')
 * // { success: true }
 * ```
 */
export async function validateRoleFields(
  fields: Partial<Pruvious.RoleInput>,
  mode: 'create' | 'update' = 'create',
): Promise<ValidationResults> {
  const data: Record<string, any> = { meta: {} }

  standardRoleFields.forEach((field) => {
    if (fields[field.name] !== undefined) {
      data[field.name] = fields[field.name]
    }
  })

  try {
    return {
      success: true,
      data: await validator.validate(
        new RoleValidator(data, mode, mode === 'update' ? data.id : undefined),
      ),
    }
  } catch (e) {
    return {
      success: false,
      errors: Object.entries(e.messages).map(([field, messages]: [string, string[]]) => ({
        field,
        message: messages[0],
      })),
    }
  }
}

/**
 * Create a new role.
 *
 * @example
 * ```js
 * await createRole({ name: 'editor', capabilities: ['login', 'accessDashboard', 'updateProfile', 'createRoles', 'readRoles', 'updateRoles', 'deleteRoles', 'createPresets', 'readPresets', 'updatePresets', 'deletePresets', 'createMedia', 'readMedia', 'updateMedia', 'deleteMedia'] })
 * ```
 */
export async function createRole(
  fields: CFields<Pruvious.RoleInput, Pruvious.CreatableRoleField, Pruvious.RequiredRoleField>,
  returnOptions?: ReturnOptions<Pruvious.ComputedRoleField>,
): Promise<{ success: true; data: RoleResult } | { success: false; errors: ValidationError[] }> {
  const query = queryRoles()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))

  if (returnOptions?.populate !== false) {
    query.populate()
  }

  return (query as any)._create(fields)
}

/**
 * Fetch a role based on its ID.
 *
 * @example
 * ```js
 * await getRole(1) @todo
 * ```
 */
export async function getRole(
  roleId: number,
  returnOptions?: ReturnOptions<Pruvious.ComputedRoleField>,
): Promise<RoleResult | null> {
  const query = queryRoles()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))
    .where('id', roleId)

  if (returnOptions?.populate !== false) {
    query.populate()
  }

  return query.first()
}

/**
 * Update a role based on its ID.
 *
 * Returns `null` if the role does not exist.
 *
 * @example
 * ```js
 * await updateRole(1, {}) @todo
 * ```
 */
export async function updateRole(
  roleId: number,
  fields: UFields<Pruvious.RoleInput, Pruvious.UpdateableRoleField>,
  returnOptions?: ReturnOptions<Pruvious.ComputedRoleField>,
): Promise<UpdateResult<RoleResult> | null> {
  const query = queryRoles()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))
    .where('id', roleId)

  if (returnOptions?.populate !== false) {
    query.populate()
  }

  const results = await query.update(fields)

  return results[0] ?? null
}

/**
 * Delete a role based on its ID.
 *
 * @example
 * ```js
 * await deleteRole(1) @todo
 * ```
 */
export async function deleteRole(roleId: number): Promise<boolean> {
  const results = await queryRoles().where('id', roleId).delete()
  return !!results.length
}

/**
 * Get users associated with this role.
 *
 * @example
 * ```js
 * await getRoleUsers(1)
 * // Returns user IDs and emails { id: number, email: string }[] for the role with ID=1
 * ```
 */
export async function getRoleUsers(roleId: number): Promise<{ id: number; name: string }[] | null> {
  const role = await Role.find(roleId)
  return role ? ((await role.$relation('users')) as any)?.serialize() : null
}
