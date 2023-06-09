import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import BaseValidator from 'App/Validators/BaseValidator'

export default class RoleValidator extends BaseValidator {
  constructor(
    public data: Record<string, any>,
    protected mode: 'create' | 'update',
    protected id?: number,
  ) {
    super(mode, id)
  }

  public schema = schema.create({
    name: schema.string.optional([
      rules.trim(),
      ...this.requiredWhenCreating,
      rules.unique({
        table: 'roles',
        column: 'name',
        caseInsensitive: true,
        whereNot: {
          id: this.refs.id,
        },
      }),
    ]),
    capabilities: schema.array
      .optional([rules.distinct('*')])
      .members(schema.string([rules.capability()])),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
    'name.unique': 'The name is already taken',
  }
}
