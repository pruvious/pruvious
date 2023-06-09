import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import { ConditionalLogic, standardPageFields } from '@pruvious-test/shared'
import { isObject } from '@pruvious-test/utils'
import { blocks, pageConfig } from 'App/imports'
import BaseValidator from 'App/Validators/BaseValidator'

export default class PageValidator extends BaseValidator {
  constructor(
    public data: Record<string, any>,
    protected mode: 'create' | 'update',
    protected type: string,
    protected id?: number,
  ) {
    super(mode, id)
  }

  public schema = schema.create({
    public: schema.boolean.optional(),
    path: schema.string.optional([
      rules.trim(),
      ...this.requiredWhenCreating,
      rules.maxLength(1024),
      rules.pagePath(+this.refs.id.value),
    ]),
    language: schema.string.optional([rules.trim(), rules.maxLength(16), rules.language()]),
    translationOf: schema.number.optional([
      rules.exists({
        table: 'pages',
        column: 'id',
        whereNot: {
          id: this.refs.id,
        },
      }),
      ...(this.mode === 'create' ? [rules.translationOf('pages', this.data.language)] : []),
    ]),
    title: schema.string.optional([rules.trim()]),
    baseTitle: schema.boolean.optional(),
    description: schema.string.optional([rules.trim()]),
    visible: schema.boolean.optional(),
    sharingImage: schema.number.nullable([rules.exists({ table: 'uploads', column: 'id' })]),
    metaTags: schema.array
      .optional()
      .members(schema.object().members({ name: schema.string(), content: schema.string() })),
    type: schema.string.optional([
      rules.trim(),
      rules.requiredIfExists('layout'),
      rules.maxLength(255),
      rules.pageType(),
    ]),
    layout: schema.string.optional([
      rules.trim(),
      rules.requiredIfExists('blocks'),
      rules.maxLength(255),
      rules.pageLayout(this.type),
    ]),
    blocks: schema.array
      .optional([
        rules.blockRecords(
          new ConditionalLogic(
            { ...this.data, ...(isObject(this.data.meta) ? this.data.meta : {}), meta: undefined },
            [...standardPageFields, ...(pageConfig.fields ?? [])],
            blocks,
          ),
          [],
          !this.data.public,
        ),
        rules.allowedPageBlocks(this.data),
      ])
      .anyMembers(),
    publishDate: schema.date.optional(),
    meta: schema
      .object([
        rules.fieldRecords(
          pageConfig.fields ?? [],
          new ConditionalLogic(
            { ...this.data, ...(isObject(this.data.meta) ? this.data.meta : {}), meta: undefined },
            [...standardPageFields, ...(pageConfig.fields ?? [])],
            blocks,
          ),
          'page',
          this.id,
          this.data.language,
          !this.data.public,
        ),
      ])
      .anyMembers(),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
    'sharingImage.exists': 'The image does not exist',
  }
}
