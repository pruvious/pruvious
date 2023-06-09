import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import ResourceValidator from 'App/Validators/ResourceValidator'

export default class MediaSelectionValidator extends ResourceValidator {
  constructor(protected ctx: HttpContextContract) {
    super(ctx)
  }

  public schema = schema.create({
    directories: schema
      .array([rules.distinct('*')])
      .members(schema.number([rules.exists({ table: 'directories', column: 'id' })])),
    uploads: schema
      .array([rules.distinct('*')])
      .members(schema.number([rules.exists({ table: 'uploads', column: 'id' })])),
    target: schema.number.optional([
      rules.exists({
        table: 'directories',
        column: 'id',
      }),
    ]),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
  }
}
