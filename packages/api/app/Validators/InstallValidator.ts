import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import ResourceValidator from './ResourceValidator'

export default class InstallValidator extends ResourceValidator {
  constructor(protected ctx: HttpContextContract) {
    super(ctx)
  }

  public schema = schema.create({
    email: schema.string([rules.trim(), rules.maxLength(255), rules.email()]),
    password: schema.string([rules.minLength(8), rules.maxLength(255)]),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
    'email.required': 'Please enter your email address',
    'password.required': 'Please enter a password',
    'password.minLength': 'The password must have at least 8 characters',
  }
}
