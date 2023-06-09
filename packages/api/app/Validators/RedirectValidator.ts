import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import ResourceValidator from './ResourceValidator'

export default class RedirectValidator extends ResourceValidator {
  constructor(protected ctx: HttpContextContract) {
    super(ctx)
  }

  public schema = schema.create({
    redirects: schema.array().members(schema.object([rules.redirect()]).anyMembers()),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
  }
}
