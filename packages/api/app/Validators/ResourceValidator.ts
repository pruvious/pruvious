import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { CustomMessages, Rule, rules, schema } from '@ioc:Adonis/Core/Validator'
import { genericMessages } from 'App/Validators/genericMessages'

export default class ResourceValidator {
  constructor(protected ctx: HttpContextContract) {
    if (ctx.request.method() === 'POST') {
      this.requiredWhenCreating.push(rules.required())
    }
  }

  public requiredWhenCreating: Rule[] = []

  public refs = schema.refs({
    id: this.ctx.params.id ?? 0,
  })

  public genericMessages: CustomMessages = genericMessages
}
