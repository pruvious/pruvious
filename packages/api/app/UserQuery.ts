import { AuthContract } from '@ioc:Adonis/Addons/Auth'
import { ActionsAuthorizerContract } from '@ioc:Adonis/Addons/Bouncer'
import Env from '@ioc:Adonis/Core/Env'
import Hash from '@ioc:Adonis/Core/Hash'
import { validator } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import {
  CFields,
  OAT,
  QueryStringParameters,
  ReturnOptions,
  SFields,
  UFields,
  UpdateResult,
  ValidationError,
  ValidationResults,
  flattenFields,
  getDefaultFieldValue,
  getFieldValueType,
  standardUserColumns,
  standardUserFields,
} from '@pruvious/shared'
import { Pruvious } from '@pruvious/types'
import { sortNatural } from '@pruvious/utils'
import User from 'App/Models/User'
import UserValidator from 'App/Validators/UserValidator'
import { collectionsConfig, config, settingConfigs, userConfig } from 'App/imports'
import { populateUser } from 'App/populator'
import { createHash } from 'crypto'
import ms from 'ms'
import { BaseQuery, prepareFieldValue } from './BaseQuery'
import { getMetaFields } from './model-utils'
import { addInternalJob } from './worker'

type UserResult = SFields<
  Pruvious.User,
  Pruvious.UserInput,
  Pruvious.SelectableUserField | Pruvious.ComputedUserField
>

type QueryString = QueryStringParameters<{
  LanguageCode: never
  Model: Pruvious.UserInput
  SelectableField: Pruvious.SelectableUserField
  SortableField: Pruvious.SortableUserField
  FilterableField: Pruvious.FilterableUserField
  StringField: Pruvious.UserStringField
  NumberField: Pruvious.UserNumberField
  BooleanField: Pruvious.UserBooleanField
}>

type T = {
  Input: Pruvious.UserInput
  Result: UserResult
  PopulatedResult: Pruvious.User
  ComputedField: Pruvious.ComputedUserField
  SelectableField: Pruvious.SelectableUserField
  SortableField: Pruvious.SortableUserField
  FilterableField: Pruvious.FilterableUserField
  StringField: Pruvious.UserStringField
  NumberField: Pruvious.UserNumberField
  BooleanField: Pruvious.UserBooleanField
  LanguageCode: never
}

export class UserQuery extends BaseQuery<T> {
  constructor(params?: string | QueryString) {
    super()

    this.table = 'users'

    this.query = User.query()

    this.columns = standardUserColumns

    this.fields.push(...standardUserFields)

    this.translatable = false

    this.relations.push('combinedCapabilities')

    this.createHook = userConfig.onCreate
    this.readHook = userConfig.onRead
    this.populateHook = userConfig.onPopulate
    this.updateHook = userConfig.onUpdate
    this.deleteHook = userConfig.onDelete

    if (userConfig.fields) {
      flattenFields(userConfig.fields).forEach((field) => {
        this.metaColumns[field.name] = getFieldValueType(field)
        this.fields.push(field)
      })
    }

    if (userConfig.listing?.perPage) {
      this.perPage = userConfig.listing.perPage
    }

    if (userConfig.perPageLimit) {
      this.perPageLimit = userConfig.perPageLimit
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
   * await queryUsers().fromQueryString('sort=createdAt:desc&filters[email][$endsWith]=@gmail.com')
   *
   * // Alternative 1:
   * await queryUsers().apply({ sort: 'createdAt:desc', filters: { email: { $endsWith: '@gmail.com' } } })
   *
   * // Alternative 2:
   * await queryUsers().whereLike('email', '%@gmail.com').orderBy('createdAt', 'desc')
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
   * await queryUsers().apply({ sort: 'createdAt:desc', filters: { email: { $endsWith: '@gmail.com' } } })
   *
   * // Alternative 1:
   * await queryUsers().fromQueryString('sort=createdAt:desc&filters[email][$endsWith]=@gmail.com')
   *
   * // Alternative 2:
   * await queryUsers().whereLike('email', '%@gmail.com').orderBy('createdAt', 'desc')
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
   * await queryUsers().select('id', 'email').all()
   * // [{ id: 1, email: 'support@pruvious.com' }]
   * ```
   */
  select(...fields: (T['SelectableField'] | '*')[]): this {
    return super.select(...fields)
  }

  protected prepareSelect() {
    if (this.aliasedMetaColumns.size) {
      const select: any[] = ['users.*', 'user_meta.key', 'user_meta.value', ...this.keywordSelects]

      this.aliasedMetaColumns.forEach((column) => {
        const sql =
          this.metaColumns[column] === 'string'
            ? `max(case when user_meta.key = '${column}' then user_meta.value end) as \`${column}\``
            : `max(case when user_meta.key = '${column}' then cast(user_meta.value as numeric) end) as \`${column}\``

        select.push(Database.raw(sql))
      })

      this.query = this.query
        .leftJoin('user_meta', 'users.id', 'user_meta.user_id')
        .groupBy('users.id')
        .select(...select)
    } else {
      this.query = this.query.select('*', ...this.keywordSelects)
    }

    return this.query
  }

  protected async populateRecord(user: UserResult) {
    await populateUser(user as any, this._skipPopulate)
  }

  /**
   * Retrieve a user by its ID.
   *
   * @example
   * ```js
   * await queryUsers().find(1)
   * ```
   */
  async find(id: number): Promise<UserResult | null> {
    const user = await User.find(id)
    return user ? await this.serialize(user) : null
  }

  /**
   * Find a user based on a specific field-value pair.
   *
   * @example
   * ```js
   * await queryUsers().findBy('email', 'support@pruvious.com')
   * ```
   */
  async findBy<FieldName extends Pruvious.FilterableUserField>(
    field: FieldName,
    value: Exclude<Pruvious.UserInput[FieldName], null>,
  ): Promise<UserResult | null> {
    const users = await this.$where('', 'and', field, value, User.query())
      .orderBy('id', 'desc')
      .limit(1)

    return users.length ? await this.serialize(users[0]) : null
  }

  /**
   * Define a `where` clause in SQL queries by specifying a field name and a corresponding value to filter the query results.
   *
   * @example
   * ```js
   * await queryUsers().where('email', 'support@pruvious.com').first()
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
   * await queryUsers().where('email', 'support@pruvious.com').andWhere('role', 1).first()
   * ```
   */
  andWhere<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    return super.andWhere(field, value)
  }

  protected async _create(
    fields: CFields<Pruvious.UserInput, Pruvious.CreatableUserField, Pruvious.RequiredUserField>,
  ): Promise<{ success: true; data: UserResult } | { success: false; errors: ValidationError[] }> {
    if (this.createHook) {
      await this.createHook(fields)
    }

    const validationResults = await validateUserFields(fields)

    if (validationResults.success) {
      const records = validationResults.data
      const metaEntries = validationResults.data.meta
        ? flattenFields(userConfig.fields ?? []).map((field) => ({
            key: field.name,
            value: prepareFieldValue(
              validationResults.data.meta[field.name],
              getDefaultFieldValue(field, 'meta'),
            ),
          }))
        : []

      const user = await User.create({
        email: records.email.trim(),
        password: records.password,
        dateFormat: prepareFieldValue(records.dateFormat, 'YYYY-MM-DD').trim(),
        timeFormat: prepareFieldValue(records.timeFormat, 'HH:mm:ss').trim(),
        role: prepareFieldValue(records.role, null),
        capabilities: prepareFieldValue(records.capabilities, []),
        isAdmin: prepareFieldValue(records.isAdmin, false),
      })

      await user.refresh()

      if (metaEntries.length) {
        await user.related('meta').updateOrCreateMany(metaEntries, 'key')
        await user.load('meta')
      }

      await user.safeRebuildRelations()
      await addInternalJob('flush', 'User', user.id)

      return { success: true, data: await this.serialize(user) }
    }

    return validationResults
  }

  /**
   * Update the selected users.
   *
   * @example
   * ```js
   * await queryUsers().where('id', 1).update({ email: 'new@pruvious.com' })
   * // [{ success: true; data: { id: 1 } }]
   * ```
   */
  async update(
    fields: UFields<Pruvious.UserInput, Pruvious.UpdateableUserField>,
  ): Promise<UpdateResult<UserResult>[]> {
    const results: UpdateResult<UserResult>[] = []
    const users: User[] = await this.prepare().exec()

    if (this.updateHook) {
      await this.updateHook(fields)
    }

    for (const user of users) {
      const fieldsToValidate: Record<string, any> = {
        ...(await getMetaFields(user, userConfig)),
        ...fields,
        id: user.id,
      }

      for (const column of Object.keys(this.columns)) {
        if (fieldsToValidate[column] === undefined) {
          fieldsToValidate[column] = user[column]
        }
      }

      const validationResults = await validateUserFields(fieldsToValidate, 'update')

      if (validationResults.success) {
        const records = validationResults.data
        const metaEntries = validationResults.data.meta
          ? Object.entries(validationResults.data.meta)
              .filter(([fieldName, _]) => {
                const field = this.fields.find((field) => field.name === fieldName)
                return field && !field.readonly
              })
              .map(([fieldName, value]: [string, any]) => ({ key: fieldName, value }))
          : []

        user.merge({
          email: prepareFieldValue(records.email, user.email).trim(),
          dateFormat: prepareFieldValue(records.dateFormat, user.dateFormat).trim(),
          timeFormat: prepareFieldValue(records.timeFormat, user.timeFormat).trim(),
          role: prepareFieldValue(fields.role, user.role),
          capabilities: prepareFieldValue(records.capabilities, user.capabilities),
          isAdmin: prepareFieldValue(records.isAdmin, user.isAdmin),
        })

        if (records.password) {
          user.password = records.password
        }

        await user.save()
        await user.refresh()

        for (const metaEntry of metaEntries) {
          await user.related('meta').updateOrCreate({ key: metaEntry.key }, metaEntry)
        }

        await user.load('meta')
        await user.safeRebuildRelations()
        await addInternalJob('flush', 'User', user.id)

        results.push({
          success: true,
          data: await this.serialize(user),
        })
      } else {
        results.push({
          success: false,
          data: await this.serialize(user),
          errors: validationResults.errors,
        })
      }
    }

    return results
  }

  /**
   * Delete the selected users.
   *
   * @example
   * ```js
   * await queryUsers().whereLt('createdAt', '2023-01-01').delete()
   * // Deletes all users created before the year 2023
   * ```
   */
  async delete(): Promise<number[]> {
    const deleted: number[] = []
    const users: User[] = await this.prepare().exec()

    for (const user of users) {
      if (this.deleteHook) {
        await this.deleteHook(user.id)
      }

      await user.delete()
      deleted.push(user.id)
    }

    return deleted
  }
}

/**
 * Create a query builder instance for users.
 *
 * @todo example
 */
export function queryUsers(params?: string | QueryString): UserQuery {
  return new UserQuery(params)
}

/**
 * Validate user field inputs.
 *
 * Default mode is `create`.
 *
 * @example
 * ```js
 * await validateUserFields({ email: 'user-1' })
 * // { success: false, errors: [{ field: 'email', message: 'The entered email address is not valid' }] }
 *
 * await validateUserFields({ email: 'user-1@pruvious.com' })
 * // { success: true }
 *
 * await validateUserFields({ id: 2, email: 'user-1@pruvious.com' }, 'update')
 * // { success: false, errors: [{ field: 'email', message: 'The email is already taken' }] }
 * ```
 */
export async function validateUserFields(
  fields: Partial<Pruvious.UserInput> & { updatePassword?: boolean },
  mode: 'create' | 'update' = 'create',
): Promise<ValidationResults> {
  const data: Record<string, any> = { meta: {} }

  standardUserFields.forEach((field) => {
    if (fields[field.name] !== undefined) {
      data[field.name] = fields[field.name]
    }
  })

  if (fields.password !== undefined) {
    data.password = fields.password
  }

  if (fields.updatePassword !== undefined) {
    data.updatePassword = fields.updatePassword
  }

  if (userConfig.fields) {
    flattenFields(userConfig.fields).forEach((field) => {
      data.meta[field.name] =
        fields[field.name] === undefined ? getDefaultFieldValue(field) : fields[field.name]
    })
  }

  try {
    return {
      success: true,
      data: await validator.validate(
        new UserValidator(data, mode, mode === 'update' ? data.id : undefined),
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
 * Create a new user.
 *
 * @example
 * ```js
 * await createUser({}) @todo
 * ```
 */
export async function createUser(
  fields: CFields<Pruvious.UserInput, Pruvious.CreatableUserField, Pruvious.RequiredUserField>,
  returnOptions?: ReturnOptions<Pruvious.ComputedUserField>,
): Promise<{ success: true; data: UserResult } | { success: false; errors: ValidationError[] }> {
  const query = queryUsers()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))

  if (returnOptions?.populate !== false) {
    query.populate()
  }

  return (query as any)._create(fields)
}

/**
 * Fetch a user based on their ID.
 *
 * @example
 * ```js
 * await getUser(1) @todo
 * ```
 */
export async function getUser(
  userId: number,
  returnOptions?: ReturnOptions<Pruvious.ComputedUserField>,
): Promise<UserResult | null> {
  const query = queryUsers()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))
    .where('id', userId)

  if (returnOptions?.populate !== false) {
    query.populate()

    if ((returnOptions as any)?._skipPopulate) {
      ;(query as any)._skipPopulate = (returnOptions as any)._skipPopulate
    }
  }

  return query.first()
}

/**
 * Update a user based on their ID.
 *
 * Returns `null` if the user does not exist.
 *
 * @example
 * ```js
 * await updateUser(1, {}) @todo
 * ```
 */
export async function updateUser(
  userId: number,
  fields: UFields<Pruvious.UserInput, Pruvious.UpdateableUserField>,
  returnOptions?: ReturnOptions<Pruvious.ComputedUserField>,
): Promise<UpdateResult<UserResult> | null> {
  const query = queryUsers()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))
    .where('id', userId)

  if (returnOptions?.populate !== false) {
    query.populate()
  }

  const results = await query.update(fields)

  return results[0] ?? null
}

/**
 * Delete a user based on their ID.
 *
 * @example
 * ```js
 * await deleteUser(1) @todo
 * ```
 */
export async function deleteUser(userId: number): Promise<boolean> {
  const results = await queryUsers().where('id', userId).delete()
  return !!results.length
}

/**
 * Get the user role.
 *
 * @example
 * ```js
 * await getUserRole(1)
 * // Returns the role object for the user with ID=1
 * ```
 */
export async function getUserRole(userId: number): Promise<Pruvious.User['role'] | null> {
  const user = await User.find(userId)
  return user ? ((await user.$relation('roleRelation')) as any)?.serialize() ?? null : null
}

/**
 * Obtain a merged list of capabilities from both the user and the role
 * assigned to them.
 */
export async function getCombinedCapabilities(
  userId: number,
): Promise<Pruvious.User['combinedCapabilities']> {
  const user = await User.find(userId)
  return user ? ((await user.getCombinedCapabilities()) as any) : []
}

/**
 * Get a list of all available capability names.
 */
export function listCapabilities(): Pruvious.Role['capabilities'] {
  const capabilities: string[] = [
    'login',
    'accessDashboard',
    'updateProfile',
    'clearCache',

    'listCollections',

    'createRoles',
    'readRoles',
    'updateRoles',
    'deleteRoles',

    'createUsers',
    'readUsers',
    'updateUsers',
    'deleteUsers',

    'listSettings',
  ]

  if (config.pages !== false) {
    capabilities.push(
      'readRedirects',
      'updateRedirects',
      'createPages',
      'readPages',
      'updatePages',
      'deletePages',
    )
  }

  if (config.presets !== false) {
    capabilities.push('createPresets', 'readPresets', 'updatePresets', 'deletePresets')
  }

  if (config.uploads !== false) {
    capabilities.push('createMedia', 'readMedia', 'updateMedia', 'deleteMedia')
  }

  if (config.seo !== false) {
    capabilities.push('readSEOSettings', 'updateSEOSettings')
  }

  Object.values(collectionsConfig).forEach((collection) => {
    capabilities.push(
      `createPosts:${collection.name}`,
      `readPosts:${collection.name}`,
      `updatePosts:${collection.name}`,
      `deletePosts:${collection.name}`,
    )
  })

  settingConfigs.forEach((settingConfig) => {
    capabilities.push(
      `readSettings:${settingConfig.group}`,
      `updateSettings:${settingConfig.group}`,
    )
  })

  return sortNatural(capabilities) as any
}

/**
 * Log a user out of all devices by deleting their currently active access
 * tokens from the database.
 *
 * Use the `except` parameter to omit deleting specific access tokens.
 *
 * @example
 * ```js
 * // Returns the number of revoked tokens of user with ID=1
 * await revokeAllAccessToken(1, 'XXXX.YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY')
 * ```
 */
export async function revokeAllAccessToken(userId: number, ...except: string[]): Promise<number> {
  const user = await getUser(userId)

  if (user) {
    return (await Database.from('api_tokens')
      .where('user_id', userId)
      .whereNotIn(
        'token',
        except.map((token) => {
          return createHash('sha256')
            .update(token.split('.')[1] ?? '')
            .digest('hex')
        }),
      )
      .delete()
      .exec()) as any
  }

  return 0
}

/**
 * A method to verify the user credentials.
 *
 * @example
 * ```js
 * await verifyCredentials('support@pruvious.com', '12345678') // true
 * ```
 */
export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  const result = await Database.from('users').select('password').where('email', email).first()
  return result ? await Hash.verify(result.password, password) : false
}

/**
 * @param offset In milliseconds
 */
export function oatOptions(remember: boolean = false) {
  return { expiresIn: remember ? Env.get('OAT_EXPIRES_IN_LONG') : Env.get('OAT_EXPIRES_IN') }
}

export class Auth {
  get userId(): number | null {
    return this._userId
  }
  protected _userId: number | null = null

  constructor(protected auth: AuthContract, protected bouncer: ActionsAuthorizerContract<User>) {
    this._userId = auth.user?.id ?? null
  }

  /**
   * Attempts a user login with the specified user credentials.
   * If successfull, an opaque access token (OAT) is returned.
   * You can define the expiration of this token by setting the environment variables `OAT_EXPIRES_IN` and `OAT_EXPIRES_IN_LONG` (used when the `remember` parameter is set to `true`).
   *
   * @throws An error if the user could not be logged in.
   *
   * @example
   * ```js
   * await attemptLogin('support@pruvious.com', '12345678')
   * // { type: 'bearer', token: 'XXXX.YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY', expires_at: '2023-01-01T00:000:00.0000+00:00' }
   * ```
   */
  async attemptLogin(email: string, password: string, remember: boolean = false): Promise<OAT> {
    try {
      const token = await this.auth.use('api').attempt(email, password, oatOptions(remember))
      const allowed = await this.bouncer
        .with('UserPolicy')
        .forUser(token.user)
        .allows('can', 'login')

      if (!allowed) {
        throw new Error('Login is disabled for this account')
      }

      return token.toJSON() as any
    } catch (error) {
      throw new Error('Incorrect credentials')
    }
  }

  /**
   * Revoke the active access token of the current user and return a new one.
   *
   * @throws An error if the access token cannot be renewed.
   *
   * @example
   * ```js
   * await refreshToken()
   * // { type: 'bearer', token: 'XXXX.YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY', expires_at: '2023-01-01T00:000:00.0000+00:00' }
   * ```
   */
  async refreshAccessToken(): Promise<OAT> {
    if (!this.auth.user) {
      throw new Error('User is not logged in')
    }

    const allowed = await this.bouncer
      .with('UserPolicy')
      .forUser(this.auth.user)
      .allows('can', 'login')

    if (!allowed) {
      throw new Error('Login is disabled for this account')
    }

    const user = this.auth.use('api').user!
    const token = this.auth.use('api').token!
    const long =
      new Date(token.expiresAt as any).getTime() - new Date(token.meta.created_at).getTime() >
      ms(Env.get('OAT_EXPIRES_IN'))

    await this.auth.use('api').revoke()

    const newToken = await this.auth.use('api').generate(user, oatOptions(long))

    return newToken.toJSON() as any
  }

  /**
   * A method to generate and return an opaque access token (OAT) for a user
   * with a specified `userId`. You can define the expiration of this token by
   * setting the environment variables `OAT_EXPIRES_IN` and
   * `OAT_EXPIRES_IN_LONG` (used when the `long` parameter is set to `true`).
   *
   * @throws An error if the user could not be logged in.
   *
   * @example
   * ```js
   * await attemptLogin(1)
   * // { type: 'bearer', token: 'XXXX.YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY', expires_at: '2023-01-01T00:000:00.0000+00:00' }
   * ```
   */
  async createAccessToken(userId: number, long: boolean = false): Promise<OAT> {
    const user = await User.find(userId)

    if (!user) {
      throw new Error('User does not exist')
    }

    const allowed = await this.bouncer.with('UserPolicy').forUser(user).allows('can', 'login')

    if (!allowed) {
      throw new Error('Login is disabled for this account')
    }

    const token = await this.auth.use('api').generate(user, oatOptions(long))

    return token.toJSON() as any
  }

  /**
   * Logs out the current user by revoking their active access token.
   */
  async revokeAccessToken(): Promise<void> {
    await this.auth.use('api').revoke()
  }

  /**
   * Logs the current user out of all other sessions except this one. The
   * logout process is accomplished by revoking the active access tokens.
   *
   * @returns The number of revoked tokens.
   *
   * @example
   * ```js
   * await logoutFromOtherDevices() // 2
   * ```
   */
  async logoutFromOtherDevices(): Promise<number> {
    if (!this.userId) {
      return 0
    }

    return (await Database.from('api_tokens')
      .where('user_id', this.userId)
      .andWhereNot('token', this.auth.use('api').token!.tokenHash)
      .delete()
      .exec()) as any
  }
}
