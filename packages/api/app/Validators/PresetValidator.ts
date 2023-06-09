import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import { ConditionalLogic, standardPresetFields } from '@pruvious/shared'
import { blocks, config } from 'App/imports'
import BaseValidator from 'App/Validators/BaseValidator'

export default class PresetValidator extends BaseValidator {
  constructor(
    public data: Record<string, any>,
    protected mode: 'create' | 'update',
    protected id?: number,
  ) {
    super(mode, id)
  }

  public schema = schema.create({
    language: schema.string.optional([rules.trim(), rules.maxLength(16), rules.language()]),
    translationOf: schema.number.optional([
      rules.exists({
        table: 'presets',
        column: 'id',
        whereNot: {
          id: this.refs.id,
        },
      }),
      ...(this.mode === 'create' ? [rules.translationOf('presets', this.data.language)] : []),
    ]),
    title: schema.string.optional([
      rules.trim(),
      ...this.requiredWhenCreating,
      rules.unique({
        table: 'presets',
        column: 'title',
        caseInsensitive: true,
        where: {
          language: this.data.language || config.defaultLanguage,
        },
        whereNot: {
          id: this.refs.id,
        },
      }),
    ]),
    blocks: schema.array
      .optional([
        rules.blockRecords(new ConditionalLogic(this.data, standardPresetFields, blocks), [
          'Preset',
        ]),
        rules.allowedPresetBlocks(),
      ])
      .anyMembers(),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
    'title.unique': 'A preset with this title already exists',
  }
}
