import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import { ConditionalLogic, standardUploadFields } from '@pruvious-test/shared'
import { isObject } from '@pruvious-test/utils'
import { uploadConfig } from 'App/imports'
import BaseValidator from 'App/Validators/BaseValidator'

export default class UploadValidator extends BaseValidator {
  constructor(
    public data: Record<string, any>,
    protected mode: 'create' | 'update',
    protected id?: number,
  ) {
    super(mode, id)
  }

  public refs = schema.refs({
    id: this.id ?? 0,
    directoryId: this.data.directoryId ?? null,
  })

  public schema = schema.create({
    file: schema.file.optional({ size: uploadConfig.uploadLimit }, [...this.requiredWhenCreating]),
    name: schema.string.optional([
      rules.trim(),
      rules.maxLength(255),
      rules.pathPart(),
      rules.regex(/^(?!.*--o--$).*$/),
      rules.unique({
        table: 'uploads',
        column: 'name',
        where: {
          directory_id: this.refs.directoryId,
        },
        whereNot: {
          id: +this.refs.directoryId.value === this.data.id ? 0 : this.refs.id,
        },
      }),
    ]),
    directoryId: schema.number.optional([
      rules.exists({
        table: 'directories',
        column: 'id',
      }),
    ]),
    description: schema.string.optional([rules.maxLength(255)]),
    meta: schema
      .object([
        rules.fieldRecords(
          uploadConfig.fields ?? [],
          new ConditionalLogic(
            { ...this.data, ...(isObject(this.data.meta) ? this.data.meta : {}), meta: undefined },
            [...standardUploadFields, ...(uploadConfig.fields ?? [])],
            [],
          ),
          'upload',
          this.id,
        ),
      ])
      .anyMembers(),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
    'name.pathPart': 'The name must be a URL-friendly lowercase string',
    'name.regex': 'The name cannot end with --o--',
    'name.unique': 'A file with this name already exists',
  }
}
