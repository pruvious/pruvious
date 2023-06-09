import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { CustomMessages, rules, schema } from '@ioc:Adonis/Core/Validator'
import Directory from 'App/Models/Directory'
import ResourceValidator from 'App/Validators/ResourceValidator'

export default class DirectoryValidator extends ResourceValidator {
  constructor(protected ctx: HttpContextContract, protected directory?: Directory) {
    super(ctx)
  }

  public refs = schema.refs({
    id: this.ctx.params.id ?? 0,
    directoryId: this.ctx.request.input('directoryId', null) ?? this.directory?.directoryId ?? null,
  })

  public schema = schema.create({
    name: schema.string.optional([
      rules.trim(),
      ...this.requiredWhenCreating,
      rules.maxLength(255),
      rules.pathPart(),
      rules.regex(/^[^\.]+$/),
      rules.unique({
        table: 'directories',
        column: 'name',
        where: {
          directory_id: this.refs.directoryId,
        },
        whereNot: {
          id: +this.refs.directoryId.value === this.directory?.id ? 0 : this.refs.id,
        },
      }),
    ]),
    directoryId: schema.number.optional([
      rules.exists({
        table: 'directories',
        column: 'id',
        whereNot: {
          id: this.refs.id,
        },
      }),
    ]),
  })

  public messages: CustomMessages = {
    ...this.genericMessages,
    'name.pathPart': 'The name must be a URL-friendly lowercase string',
    'name.regex': 'The name cannot contain periods',
    'name.unique': 'A folder with this name already exists',
  }
}
