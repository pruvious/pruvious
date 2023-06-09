import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import { ConditionalLogic, standardCollectionFields } from '@pruvious-test/shared'
import { isObject } from '@pruvious-test/utils'
import { collectionsConfig } from 'App/imports'
import BaseValidator from 'App/Validators/BaseValidator'

export default class PostValidator extends BaseValidator {
  constructor(
    protected collection: string,
    public data: Record<string, any>,
    protected mode: 'create' | 'update',
    protected id?: number,
  ) {
    super(mode, id)
  }

  public schema = schema.create({
    public: schema.boolean.optional(),
    language: schema.string.optional([rules.trim(), rules.maxLength(16), rules.language()]),
    translationOf: schema.number.optional([
      rules.exists({
        table: 'posts',
        column: 'id',
        whereNot: {
          id: this.refs.id,
        },
      }),
      ...(this.mode === 'create' ? [rules.translationOf('posts', this.data.language)] : []),
    ]),
    publishDate: schema.date.optional(),
    meta: schema
      .object([
        rules.fieldRecords(
          collectionsConfig[this.collection].fields ?? [],
          new ConditionalLogic(
            { ...this.data, ...(isObject(this.data.meta) ? this.data.meta : {}), meta: undefined },
            [...standardCollectionFields, ...(collectionsConfig[this.collection].fields ?? [])],
          ),
          'post',
          this.id,
          this.data.language,
          !this.data.public,
          this.collection,
        ),
      ])
      .anyMembers(),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
  }
}
