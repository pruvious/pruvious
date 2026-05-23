import { createPattern, defineTranslation } from '#pruvious/server'

export default defineTranslation({
  'A page cannot canonicalize to itself': 'A page cannot canonicalize to itself',
  'A translation for this language already exists': 'A translation for this language already exists',

  'Collection not found': 'Collection not found',

  'Directory': 'Directory',

  'External links are not allowed in this field': 'External links are not allowed in this field',

  'Failed to abort multipart upload': 'Failed to abort multipart upload',
  'Failed to create image variant': 'Failed to create image variant',
  'Failed to create multipart upload': 'Failed to create multipart upload',
  'Failed to fetch image': 'Failed to fetch image',
  'Failed to resume multipart upload': 'Failed to resume multipart upload',
  'Failed to upload file': 'Failed to upload file',
  'Failed to verify existence of ID `$id` in collection `$collection`': createPattern(
    'Failed to verify existence of ID `$id` in collection `$collection`',
    { id: 'number', collection: 'string' },
  ),
  'File': 'File',
  'File not found': 'File not found',

  'Hash fragments are not allowed in this field': 'Hash fragments are not allowed in this field',

  'Image variant not found': 'Image variant not found',
  'Incorrect credentials': 'Incorrect credentials',
  'Invalid `$param` value. Must be one of: $values': createPattern('Invalid `$param` value. Must be one of: $values', {
    param: 'string',
    values: 'string',
  }),
  'Invalid input': 'Invalid input',
  'Invalid language code': 'Invalid language code',
  'Invalid link target': 'Invalid link target',
  'Invalid path': 'Invalid path',
  'Invalid RegExp pattern': 'Invalid RegExp pattern',

  'Linking to `$reference` is not allowed in this field': createPattern(
    'Linking to `$reference` is not allowed in this field',
    { reference: 'string' },
  ),
  'Linking to drafts is not allowed in this field': 'Linking to drafts is not allowed in this field',

  'Missing file parts: $parts': createPattern('Missing file parts: $parts', { parts: 'string' }),
  'Missing image optimization parameters': 'Missing image optimization parameters',
  'Missing property for language code `$code`': createPattern('Missing property for language code `$code`', {
    code: 'string',
  }),

  'No': 'No',
  'No file parts uploaded': 'No file parts uploaded',
  'No files uploaded': 'No files uploaded',
  'No file parts have been uploaded': 'No file parts have been uploaded',
  'None': 'None',

  'Only internal and external links are allowed': 'Only internal and external links are allowed',
  'Only one file part can be uploaded at a time': 'Only one file part can be uploaded at a time',

  'Pruvious is already installed': 'Pruvious is already installed',

  'Query strings are not allowed in this field': 'Query strings are not allowed in this field',

  'Record does not exist': 'Record does not exist',
  'Request content type must be `$type`': createPattern('Request content type must be `$type`', { type: 'string' }),
  'Resource not found': 'Resource not found',
  'Route is not available in the specified language': 'Route is not available in the specified language',
  'Route reference not found': 'Route reference not found',

  'Singleton not found': 'Singleton not found',

  'The `$param` parameter is invalid': createPattern('The `$param` parameter is invalid', { param: 'string' }),
  'The `$param` parameter is required': createPattern('The `$param` parameter is required', { param: 'string' }),
  'The `$param` parameter must be a boolean': createPattern('The `$param` parameter must be a boolean', {
    param: 'string',
  }),
  'The `$param` parameter must be a number between $min and $max': createPattern(
    'The `$param` parameter must be a number between $min and $max',
    { param: 'string', min: 'number', max: 'number' },
  ),
  "The `$param` parameter must be a positive integer or 'auto'": createPattern(
    "The `$param` parameter must be a positive integer or 'auto'",
    { param: 'string' },
  ),
  'The `$param` parameter must be a positive number': createPattern(
    'The `$param` parameter must be a positive number',
    { param: 'string' },
  ),
  'The `$param` parameter must be a string': createPattern('The `$param` parameter must be a string', {
    param: 'string',
  }),
  'The `$param` parameter must be an integer between $min and $max': createPattern(
    'The `$param` parameter must be an integer between $min and $max',
    { param: 'string', min: 'number', max: 'number' },
  ),
  'The $subject must be an image': createPattern('The $subject must be an image', { subject: 'string' }),
  'The collection `$collection` cannot be linked to': createPattern(
    'The collection `$collection` cannot be linked to',
    { collection: 'string' },
  ),
  'The difference between the values must be greater than or equal to `$minRange`': createPattern(
    'The difference between the values must be greater than or equal to `$minRange`',
    { minRange: 'string' },
  ),
  'The difference between the values must be less than or equal to `$maxRange`': createPattern(
    'The difference between the values must be less than or equal to `$maxRange`',
    { maxRange: 'string' },
  ),
  'The email address is already in use': 'The email address is already in use',
  'The field `$field` cannot be used for filtering': createPattern('The field `$field` cannot be used for filtering', {
    field: 'string',
  }),
  'The field `$field` cannot be used for grouping': createPattern('The field `$field` cannot be used for grouping', {
    field: 'string',
  }),
  'The field `$field` cannot be used for sorting': createPattern('The field `$field` cannot be used for sorting', {
    field: 'string',
  }),
  'The ID must be a positive integer': 'The ID must be a positive integer',
  'The language `$language` is not supported': createPattern('The language `$language` is not supported', {
    language: 'string',
  }),
  'The linked record is not available in the language `$language`': createPattern(
    'The linked record is not available in the language `$language`',
    { language: 'string' },
  ),
  'The new path cannot be a subdirectory of the current path':
    'The new path cannot be a subdirectory of the current path',
  'The target of this canonical URL canonicalizes back to this page':
    'The target of this canonical URL canonicalizes back to this page',
  'The new path cannot be the root directory': 'The new path cannot be the root directory',
  'The new path must be different from the current path': 'The new path must be different from the current path',
  'The file part has already been uploaded': 'The file part has already been uploaded',
  'The image height must not be less than $minHeight': createPattern(
    'The image height must not be less than $minHeight',
    { minHeight: 'string' },
  ),
  'The image height must not exceed $maxHeight': createPattern('The image height must not exceed $maxHeight', {
    maxHeight: 'string',
  }),
  'The image variant has already been registered': 'The image variant has already been registered',
  'The image variant has not been registered': 'The image variant has not been registered',
  'The image width must not be less than $minWidth': createPattern('The image width must not be less than $minWidth', {
    minWidth: 'string',
  }),
  'The image width must not exceed $maxWidth': createPattern('The image width must not exceed $maxWidth', {
    maxWidth: 'string',
  }),
  'The path must be unique': 'The path must be unique',
  'The singleton `$singleton` does not exist': createPattern('The singleton `$singleton` does not exist', {
    singleton: 'string',
  }),
  'The singleton `$singleton` is not translatable': createPattern('The singleton `$singleton` is not translatable', {
    singleton: 'string',
  }),
  'The source and target languages must be different': 'The source and target languages must be different',
  'The value must be rounded to seconds': 'The value must be rounded to seconds',
  'The value must be rounded to the nearest UTC day': 'The value must be rounded to the nearest UTC day',
  'The values must be greater than or equal to `$min`': createPattern(
    'The values must be greater than or equal to `$min`',
    { min: 'number' },
  ),
  'The values must be integers': 'The values must be integers',
  'The values must be less than or equal to `$max`': createPattern('The values must be less than or equal to `$max`', {
    max: 'number',
  }),
  'The values must be rounded to seconds': 'The values must be rounded to seconds',
  'The values must be rounded to the nearest UTC day': 'The values must be rounded to the nearest UTC day',
  'The file exceeds the maximum allowed size of $size': createPattern(
    'The file exceeds the maximum allowed size of $size',
    { size: 'string' },
  ),
  'The file is smaller than the minimum allowed size of $size': createPattern(
    'The file is smaller than the minimum allowed size of $size',
    { size: 'string' },
  ),
  'This file type is not allowed': 'This file type is not allowed',
  'This directory contains nested files or directories that cannot be deleted':
    'This directory contains nested files or directories that cannot be deleted',
  'This directory contains nested files or directories that cannot be moved':
    'This directory contains nested files or directories that cannot be moved',
  'This field contains non-existent records': 'This field contains non-existent records',
  'This is not a valid external URL': 'This is not a valid external URL',
  'This link is not formatted correctly': 'This link is not formatted correctly',
  'This query parameter is required': 'This query parameter is required',

  'Yes': 'Yes',
  'You do not have permission to change administrator email addresses':
    'You do not have permission to change administrator email addresses',
  'You do not have permission to change administrator passwords':
    'You do not have permission to change administrator passwords',
  'You do not have permission to change the active status of administrators':
    'You do not have permission to change the active status of administrators',
  'You do not have permission to delete administrators': 'You do not have permission to delete administrators',
  'You do not have permission to manage administrators': 'You do not have permission to manage administrators',
  'You do not have permission to sign out other users': 'You do not have permission to sign out other users',
})
