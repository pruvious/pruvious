import { CustomMessages, Rule, rules, schema } from '@ioc:Adonis/Core/Validator'
import { genericMessages } from 'App/Validators/genericMessages'

export default class BaseValidator {
  constructor(protected mode: 'create' | 'update', protected id?: number) {
    if (mode === 'create') {
      this.requiredWhenCreating.push(rules.required())
    }
  }

  public requiredWhenCreating: Rule[] = []

  public refs = schema.refs({
    id: this.id ?? 0,
  })

  public genericMessages: CustomMessages = genericMessages
}
