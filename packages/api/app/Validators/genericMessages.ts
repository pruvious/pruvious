import { CustomMessages } from '@ioc:Adonis/Core/Validator'

export const genericMessages: CustomMessages = {
  alpha: 'The field can contain only alphabetic characters',
  alphaNum: 'The field can contain only alphanumeric characters',
  array: 'This field must be an array',
  distinct: 'The list must contain unique values',
  email: 'The entered email address is not valid',
  enum: 'Valid options are: {{ options.choices }}',
  exists: 'The selected option does not exist',
  maxLength: 'The field can be up to {{ options.maxLength }} characters long',
  minLength: 'The field must have at least {{ options.minLength }} characters',
  number: 'This field must be a number',
  object: 'This field must be an object',
  required: 'This field is required',
  requiredWhen: 'This field is required',
  string: 'This field must be a string',
  boolean: 'This field must be a boolean value',
  unique: 'The field is already taken',
}
