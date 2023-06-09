import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import ResourceValidator from 'App/Validators/ResourceValidator'

export default class ChoicesValidator extends ResourceValidator {
  constructor(protected ctx: HttpContextContract) {
    super(ctx)
  }

  public schema = schema.create({
    field: schema.string([rules.trim(), rules.maxLength(255)]),
    keywords: schema.string.optional([rules.trim()]),
    page: schema.number([rules.range(1, 999999999)]),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
  }
}
