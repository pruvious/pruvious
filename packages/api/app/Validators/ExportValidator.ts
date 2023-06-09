import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import ResourceValidator from 'App/Validators/ResourceValidator'

export default class ExportValidator extends ResourceValidator {
  constructor(protected ctx: HttpContextContract) {
    super(ctx)
  }

  public schema = schema.create({
    ids: schema.array([rules.distinct('*')]).members(schema.number()),
    relations: schema.boolean.optional(),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
  }
}
