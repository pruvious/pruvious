import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import { ConditionalLogic, Settings } from '@pruvious/shared'
import BaseValidator from 'App/Validators/BaseValidator'

export default class SettingValidator extends BaseValidator {
  constructor(public data: Record<string, any>, protected settingConfig: Settings) {
    super('update')
  }

  public schema = schema.create({
    fields: schema.object
      .optional([
        rules.fieldRecords(
          this.settingConfig.fields,
          new ConditionalLogic(this.data.fields, this.settingConfig.fields, []),
        ),
      ])
      .anyMembers(),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
  }
}
