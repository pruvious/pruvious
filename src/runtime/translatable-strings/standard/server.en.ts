import { defineTranslatableStrings } from '../translatable-strings.definition'

export default defineTranslatableStrings({
  domain: 'pruvious-server',
  language: 'en',
  api: false,
  strings: {
    '$item #$id does not exist and cannot be linked': {
      pattern: '$item #$id does not exist and cannot be linked',
      input: { item: 'string', id: 'number' },
    },
    'A page with this path already exists': 'A page with this path already exists',
    'A preset with this name already exists': 'A preset with this name already exists',
    'A preview with this token already exists': 'A preview with this token already exists',
    "At least one field must be included in the 'select' parameter":
      "At least one field must be included in the 'select' parameter",
    "Cannot use operator '$operator' on field $field": {
      pattern: "Cannot use operator '$operator' on field $field",
      input: { operator: 'string', field: 'string' },
    },
    "Cannot use value '$value' for operation '$operation' on field '$field'": {
      pattern: "Cannot use value '$value' for operation '$operation' on field '$field'",
      input: { value: 'string', operation: 'string', field: 'string' },
    },
    'create': 'create',
    'delete': 'delete',
    'DRAFT': 'DRAFT',
    'Forbidden due to insufficient permissions': 'Forbidden due to insufficient permissions',
    'Incorrect credentials': 'Incorrect credentials',
    'Invalid collection': 'Invalid collection',
    'Invalid email address': 'Invalid email address',
    'Invalid JSON': 'Invalid JSON',
    'Invalid input': 'Invalid input',
    'Invalid input name': 'Invalid input name',
    'Invalid input type': 'Invalid input type',
    "Invalid '$name' unit": { pattern: "Invalid '$name' unit", input: { name: 'string' } },
    'Invalid token': 'Invalid token',
    'Invalid URL': 'Invalid URL',
    'Invalid URL path': 'Invalid URL path',
    'Invalid user ID': 'Invalid user ID',
    'Invalid value': 'Invalid value',
    "Invalid value: '$value'": { pattern: "Invalid value: '$value'", input: { value: 'string' } },
    'manage': 'manage',
    "Missing 'from' language parameter": "Missing 'from' language parameter",
    "Missing 'to' language parameter": "Missing 'to' language parameter",
    "Missing 'to' parameter": "Missing 'to' parameter",
    'PREVIEW': 'PREVIEW',
    'Page not found': 'Page not found',
    'Pruvious is already installed': 'Pruvious is already installed',
    'read': 'read',
    'Resource not found': 'Resource not found',
    'Selected values must be strings': 'Selected values must be strings',
    'Source and target language cannot be the same': 'Source and target language cannot be the same',
    'The $item does not exist': { pattern: 'The $item does not exist', input: { item: 'string' } },
    "The block '$block' is not allowed as a root block in the layout '$layout'": {
      pattern: "The block '$block' is not allowed as a root block in the layout '$layout'",
      input: { block: 'string', layout: 'string' },
    },
    "The block '$block' is not allowed in the layout '$layout'": {
      pattern: "The block '$block' is not allowed in the layout '$layout'",
      input: { block: 'string', layout: 'string' },
    },
    'The directory must be a URL-safe string': 'The directory must be a URL-safe string',
    "The field '$field' cannot be queried": {
      pattern: "The field '$field' cannot be queried",
      input: { field: 'string' },
    },
    "The field '$field' does not exist": {
      pattern: "The field '$field' does not exist",
      input: { field: 'string' },
    },
    'The file extension cannot be changed': 'The file extension cannot be changed',
    'The file path must be unique': 'The file path must be unique',
    'The file type must be one of the following: $types': {
      pattern: 'The file type must be one of the following: $types',
      input: { types: 'string' },
    },
    'The filename must be a URL-safe string': 'The filename must be a URL-safe string',
    'The filename must not end with a period': 'The filename must not end with a period',
    'The icon does not exist': 'The icon does not exist',
    'The icon is not allowed for this field': 'The icon is not allowed for this field',
    'The image type must be one of the following: $types': {
      pattern: 'The image type must be one of the following: $types',
      input: { types: 'string' },
    },
    "The '$name' value must be greater than or equal to $min": {
      pattern: "The '$name' value must be greater than or equal to $min",
      input: { name: 'string', min: 'number' },
    },
    "The '$name' value must be less than or equal to $max": {
      pattern: "The '$name' value must be less than or equal to $max",
      input: { name: 'string', max: 'number' },
    },
    'The input cannot have more than $count $decimals': {
      pattern: 'The input cannot have more than $count $decimals',
      input: { count: 'number' },
      replacements: { decimals: [{ conditions: [{ count: 1 }], output: 'decimal' }, 'decimals'] },
    },
    'The input must be a multiple of $interval between $min and $max': {
      pattern: 'The input must be a multiple of $interval between $min and $max',
      input: { interval: 'number', min: 'number', max: 'number' },
    },
    'The input must be an integer': 'The input must be an integer',
    'The input must be greater than or equal to $min': {
      pattern: 'The input must be greater than or equal to $min',
      input: { min: 'number' },
    },
    'The input must be less than or equal to $max': {
      pattern: 'The input must be less than or equal to $max',
      input: { max: 'number' },
    },
    'The inputs cannot have more than $count $decimals': {
      pattern: 'The inputs cannot have more than $count $decimals',
      input: { count: 'number' },
      replacements: { decimals: [{ conditions: [{ count: 1 }], output: 'decimal' }, 'decimals'] },
    },
    'The inputs must be a multiple of $interval between $min and $max': {
      pattern: 'The inputs must be a multiple of $interval between $min and $max',
      input: { interval: 'number', min: 'number', max: 'number' },
    },
    'The inputs must be greater than or equal to $min': {
      pattern: 'The inputs must be greater than or equal to $min',
      input: { min: 'number' },
    },
    'The inputs must be integers': 'The inputs must be integers',
    'The inputs must be less than or equal to $max': {
      pattern: 'The inputs must be less than or equal to $max',
      input: { max: 'number' },
    },
    "The language code '$language' is not supported": {
      pattern: "The language code '$language' is not supported",
      input: { language: 'string' },
    },
    "The 'limit' parameter must be a non-negative integer": "The 'limit' parameter must be a non-negative integer",
    'The minimum allowed image height is $min pixels': {
      pattern: 'The minimum image allowed height is $min pixels',
      input: { min: 'number' },
    },
    'The minimum allowed image width is $min pixels': {
      pattern: 'The minimum allowed image width is $min pixels',
      input: { min: 'number' },
    },
    'The minimum range between the inputs is $minRange': {
      pattern: 'The minimum range between the inputs is $minRange',
      input: { minRange: 'number' },
    },
    'The maximum allowable file size is $size': {
      pattern: 'The maximum allowable file size is $size',
      input: { size: 'string' },
    },
    'The maximum range between the inputs is $maxRange': {
      pattern: 'The maximum range between the inputs is $maxRange',
      input: { maxRange: 'number' },
    },
    "The 'offset' parameter must be a non-negative integer": "The 'offset' parameter must be a non-negative integer",
    "The operator '$operator' is not valid": {
      pattern: "The operator '$operator' is not valid",
      input: { operator: 'string' },
    },
    "The order direction '$direction' is not valid": {
      pattern: "The order direction '$direction' is not valid",
      input: { direction: 'string' },
    },
    'The job is not defined': 'The job is not defined',
    "The 'page' parameter must be a positive integer": "The 'page' parameter must be a positive integer",
    "The 'page' parameter requires either 'perPage' or 'limit' to be present":
      "The 'page' parameter requires either 'perPage' or 'limit' to be present",
    'The page path must be a URL-safe string': 'The page path must be a URL-safe string',
    'The password must be at least 8 characters long': 'The password must be at least 8 characters long',
    "The path must start with a slash ('/')": "The path must start with a slash ('/')",
    "The 'perPage' parameter must be a positive integer": "The 'perPage' parameter must be a positive integer",
    "The 'populate' parameter must be a booleanish value": "The 'populate' parameter must be a booleanish value",
    'The preview token must be a URL-safe string': 'The preview token must be a URL-safe string',
    'The request body must be an object with key-value pairs':
      'The request body must be an object with key-value pairs',
    'The repeater must have at least $count $entries': {
      pattern: 'The repeater must have at least $count $entries',
      input: { count: 'number' },
      replacements: { entries: [{ conditions: [{ count: 1 }], output: 'entry' }, 'entries'] },
    },
    'The repeater must not exceed $count $entries': {
      pattern: 'The repeater must not exceed $count $entries',
      input: { count: 'number' },
      replacements: { entries: [{ conditions: [{ count: 1 }], output: 'entry' }, 'entries'] },
    },
    'The request body must be either an object with key-value pairs or an array containing key-value objects':
      'The request body must be either an object with key-value pairs or an array containing key-value objects',
    'The requested job does not exist': 'The requested job does not exist',
    'The requested job no longer exists': 'The requested job no longer exists',
    "The search structure '$structure' does not exist": {
      pattern: "The search structure '$structure' does not exist",
      input: { structure: 'string' },
    },
    'The second value cannot be less than the first value': 'The second value cannot be less than the first value',
    "The target must be a path starting with a slash ('/') or a URL starting with 'http'":
      "The target must be a path starting with a slash ('/') or a URL starting with 'http'",
    'The translation already exists': 'The translation already exists',
    'The upload is not an image': 'The upload is not an image',
    'The value must be a lowercase string': 'The value must be a lowercase string',
    "The '$name' value must be numeric": { pattern: "The '$name' value must be numeric", input: { name: 'string' } },
    "The 'where' parameter is not valid": "The 'where' parameter is not valid",
    "This block is not allowed in the slot '$slot'": {
      pattern: "This block is not allowed in the slot '$slot'",
      input: { slot: 'string' },
    },
    'This collection cannot be previewed': 'This collection cannot be previewed',
    'This collection does not support translations': 'This collection does not support translations',
    'This collection is not searchable': 'This collection is not searchable',
    'This field is read-only': 'This field is read-only',
    'This field is required': 'This field is required',
    'This field must be present': 'This field must be present',
    'This field must be unique': 'This field must be unique',
    'This method is not supported': 'This method is not supported',
    'Unable to determine the request operation': 'Unable to determine the request operation',
    'Unauthorized': 'Unauthorized',
    'Unauthorized due to either invalid credentials or missing authentication':
      'Unauthorized due to either invalid credentials or missing authentication',
    "Unknown collection name: '$collection'": {
      pattern: "Unknown collection name: '$collection'",
      input: { collection: 'string' },
    },
    'Unrecognized block name': 'Unrecognized block name',
    'Unrecognized field name': 'Unrecognized field name',
    'Unrecognized slot name': 'Unrecognized slot name',
    'update': 'update',
    "Using both 'page' and 'offset' parameters simultaneously is not permitted":
      "Using both 'page' and 'offset' parameters simultaneously is not permitted",
    "Using both 'perPage' and 'limit' parameters simultaneously is not permitted":
      "Using both 'perPage' and 'limit' parameters simultaneously is not permitted",
    'validate': 'validate',
    'You are not authorized to change passwords for admin users':
      'You are not authorized to change passwords for admin users',
    'You are not authorized to create admin users': 'You are not authorized to create admin users',
    'You are not authorized to deactivate admin users': 'You are not authorized to deactivate admin users',
    'You are not authorized to delete admin users': 'You are not authorized to delete admin users',
    'You are not authorized to demote admin users': 'You are not authorized to demote admin users',
    'You are not authorized to modify the email addresses of admin users':
      'You are not authorized to modify the email addresses of admin users',
    'You are not authorized to promote users to admin status':
      'You are not authorized to promote users to admin status',
    'You cannot delete your own user account': 'You cannot delete your own user account',
    "You don't have the necessary permissions to $operate $record": {
      pattern: "You don't have the necessary permissions to $operate $record",
      input: { operate: 'string', record: 'string' },
    },
  },
})
