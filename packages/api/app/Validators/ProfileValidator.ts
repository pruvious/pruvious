import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import ResourceValidator from './ResourceValidator'

export default class ProfileValidator extends ResourceValidator {
  constructor(protected ctx: HttpContextContract) {
    super(ctx)
  }

  public schema = schema.create({
    password: schema.string.optional([
      rules.requiredIfExists('updatePassword'),
      rules.minLength(8),
      rules.maxLength(255),
    ]),
    dateFormat: schema.string.optional([rules.maxLength(255)]),
    timeFormat: schema.string.optional([rules.maxLength(255)]),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
    'password.minLength': 'The password must have at least 8 characters',
    'password.requiredIfExists': 'This field is required',
  }
}
