import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import { ConditionalLogic, standardUserFields } from '@pruvious/shared'
import { isObject } from '@pruvious/utils'
import { userConfig } from 'App/imports'
import BaseValidator from 'App/Validators/BaseValidator'

export default class UserValidator extends BaseValidator {
  constructor(
    public data: Record<string, any>,
    protected mode: 'create' | 'update',
    protected id?: number,
  ) {
    super(mode, id)
  }

  public schema = schema.create({
    email: schema.string.optional([
      rules.trim(),
      ...this.requiredWhenCreating,
      rules.maxLength(255),
      rules.email(),
      rules.unique({
        table: 'users',
        column: 'email',
        caseInsensitive: true,
        whereNot: {
          id: this.refs.id,
        },
      }),
    ]),
    password: schema.string.optional([
      ...this.requiredWhenCreating,
      rules.requiredIfExists('updatePassword'),
      rules.minLength(8),
      rules.maxLength(255),
    ]),
    role: schema.number.optional([rules.exists({ table: 'roles', column: 'id' })]),
    capabilities: schema.array
      .optional([rules.distinct('*')])
      .members(schema.string([rules.capability()])),
    isAdmin: schema.boolean.optional(),
    dateFormat: schema.string.optional([rules.maxLength(255)]),
    timeFormat: schema.string.optional([rules.maxLength(255)]),
    meta: schema
      .object([
        rules.fieldRecords(
          userConfig.fields ?? [],
          new ConditionalLogic(
            { ...this.data, ...(isObject(this.data.meta) ? this.data.meta : {}), meta: undefined },
            [...standardUserFields, ...(userConfig.fields ?? [])],
            [],
          ),
          'user',
          this.id,
        ),
      ])
      .anyMembers(),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
    'email.unique': 'The email is already taken',
    'password.minLength': 'The password must have at least 8 characters',
    'password.requiredIfExists': 'This field is required',
  }
}
