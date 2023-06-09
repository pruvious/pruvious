import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import ResourceValidator from 'App/Validators/ResourceValidator'

export default class DestroyManyValidator extends ResourceValidator {
  constructor(protected ctx: HttpContextContract) {
    super(ctx)
  }

  public schema = schema.create({
    ids: schema.array([rules.distinct('*'), rules.minLength(1), rules.destroyMany()]).anyMembers(),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
  }
}
