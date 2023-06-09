import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import ResourceValidator from './ResourceValidator'

export default class LoginValidator extends ResourceValidator {
  constructor(protected ctx: HttpContextContract) {
    super(ctx)
  }

  public schema = schema.create({
    email: schema.string([rules.trim(), rules.email()]),
    password: schema.string(),
    remember: schema.boolean.optional(),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
    'email.required': 'Please enter your email address',
    'password.required': 'Please enter your password',
  }
}
