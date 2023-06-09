import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { CustomMessages, schema } from '@ioc:Adonis/Core/Validator'
import ResourceValidator from 'App/Validators/ResourceValidator'

export default class PreviewValidator extends ResourceValidator {
  constructor(protected ctx: HttpContextContract) {
    super(ctx)
  }

  public schema = schema.create({
    data: schema.object.optional().anyMembers(),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
  }
}
