import { createPattern, I18n } from '@pruvious/i18n'

/**
 * Default translatable strings for the query builder in English.
 */
export const translatableStrings = {
  'All items in the array must be of type `object`': 'All items in the array must be of type `object`',

  'An unknown error occurred': 'An unknown error occurred',

  'At least one field must be returned': 'At least one field must be returned',
  'At least one field must be selected': 'At least one field must be selected',
  'At least one row must be inserted': 'At least one row must be inserted',

  'Each item in this field must be unique': 'Each item in this field must be unique',

  'Invalid email address': 'Invalid email address',
  'Invalid input': 'Invalid input',
  'Invalid nulls order `$order`': createPattern('Invalid nulls order `$order`', { order: 'string' }),
  'Invalid order direction `$direction`': createPattern('Invalid order direction `$direction`', {
    direction: 'string',
  }),
  'Invalid path': 'Invalid path',
  'Invalid timestamp': 'Invalid timestamp',
  'Invalid URL': 'Invalid URL',
  'Invalid value': 'Invalid value',

  'The `$param` parameter must be a positive integer': createPattern(
    'The `$param` parameter must be a positive integer',
    { param: 'string' },
  ),
  'The `$param` parameter must be an integer': createPattern('The `$param` parameter must be an integer', {
    param: 'string',
  }),
  'The `$param` parameter must be greater than or equal to zero': createPattern(
    'The `$param` parameter must be greater than or equal to zero',
    { param: 'string' },
  ),

  'The collection `$collection` does not exist': createPattern('The collection `$collection` does not exist', {
    collection: 'string',
  }),

  'The field `$field` does not exist': createPattern('The field `$field` does not exist', { field: 'string' }),
  'The field `$field` is not nullable': createPattern('The field `$field` is not nullable', { field: 'string' }),
  'The field `$field` must be a boolean': createPattern('The field `$field` must be a boolean', { field: 'string' }),
  'The field `$field` must be a boolean or `null`': createPattern('The field `$field` must be a boolean or `null`', {
    field: 'string',
  }),
  'The field `$field` must be a number': createPattern('The field `$field` must be a number', { field: 'string' }),
  'The field `$field` must be a number or `null`': createPattern('The field `$field` must be a number or `null`', {
    field: 'string',
  }),
  'The `$field` field must be an array containing exactly two numbers': createPattern(
    'The `$field` field must be an array containing exactly two numbers',
    { field: 'string' },
  ),
  'The field `$field` must be an array of numbers': createPattern('The field `$field` must be an array of numbers', {
    field: 'string',
  }),
  'The field `$field` must be an array of strings': createPattern('The field `$field` must be an array of strings', {
    field: 'string',
  }),
  'This field must have a value that is not empty': 'This field must have a value that is not empty',

  'The input must be an object': 'The input must be an object',
  'The input must be an object or an array of objects': 'The input must be an object or an array of objects',

  'The operator `$operator` is not supported for the field `$field`': createPattern(
    'The operator `$operator` is not supported for the field `$field`',
    { operator: 'string', field: 'string' },
  ),

  "The value cannot be 'false'": "The value cannot be 'false'",
  'The value cannot have more than `$count` decimals': createPattern(
    'The value cannot have more than `$count` $decimals',
    { count: 'number' },
    { decimals: [{ conditions: [{ count: 1 }], output: 'decimal' }, 'decimals'] },
  ),
  'The value must be `null`': 'The value must be `null`',
  'The value must be a boolean': 'The value must be a boolean',
  'The value must be a boolean or `null`': 'The value must be a boolean or `null`',
  'The value must be a number': 'The value must be a number',
  'The value must be a number or `null`': 'The value must be a number or `null`',
  'The value must be a string': 'The value must be a string',
  'The value must be a string or `null`': 'The value must be a string or `null`',
  'The value must be an array': 'The value must be an array',
  'The value must be an array or `null`': 'The value must be an array or `null`',
  'The value must be an integer': 'The value must be an integer',
  'The value must be an integer or `null`': 'The value must be an integer or `null`',
  'The value must be an object': 'The value must be an object',
  'The value must be an object or `null`': 'The value must be an object or `null`',
  'The value must be at least `$min` characters long': createPattern(
    'The value must be at least `$min` $characters long',
    { min: 'number' },
    { characters: [{ conditions: [{ min: 1 }], output: 'character' }, 'characters'] },
  ),
  'The value must be at most `$max` characters long': createPattern(
    'The value must be at most `$max` $characters long',
    { max: 'number' },
    { characters: [{ conditions: [{ max: 1 }], output: 'character' }, 'characters'] },
  ),
  'The value must be exactly `$length` characters long': createPattern(
    'The value must be exactly `$length` $characters long',
    { length: 'number' },
    { characters: [{ conditions: [{ length: 1 }], output: 'character' }, 'characters'] },
  ),
  'The value must be greater than or equal to `$min`': createPattern(
    'The value must be greater than or equal to `$min`',
    { min: 'number' },
  ),
  'The value must be less than or equal to `$max`': createPattern('The value must be less than or equal to `$max`', {
    max: 'number',
  }),
  'The value must be one of the specified types: $types': createPattern(
    'The value must be one of the specified types: $types',
    { types: 'string' },
  ),
  'The value must be serializable': 'The value must be serializable',
  'The value must be unique': 'The value must be unique',

  'This field cannot be left empty': 'This field cannot be left empty',
  'This field contains invalid values': 'This field contains invalid values',
  'This field contains items of the wrong type': 'This field contains items of the wrong type',
  'This field is not nullable': 'This field is not nullable',
  'This field is required': 'This field is required',
  'This field must contain at least $min items': createPattern(
    'This field must contain at least $min $items',
    { min: 'number' },
    { items: [{ conditions: [{ min: 1 }], output: 'item' }, 'items'] },
  ),
  'This field must contain at least one item': 'This field must contain at least one item',
  'This field must contain at most $max items': createPattern(
    'This field must contain at most $max $items',
    { max: 'number' },
    { items: [{ conditions: [{ max: 1 }], output: 'item' }, 'items'] },
  ),
  'This field must contain exactly $exact items': createPattern(
    'This field must contain exactly $exact $items',
    { exact: 'number' },
    { items: [{ conditions: [{ exact: 1 }], output: 'item' }, 'items'] },
  ),
  'This field requires `$field` to be present in the input data': createPattern(
    'This field requires `$field` to be present in the input data',
    { field: 'string' },
  ),

  'Unique validation failed': 'Unique validation failed',
} as const

/**
 * Default translatable strings for the query builder in German.
 */
export const translatableStringsDe = {
  'All items in the array must be of type `object`': 'Alle Elemente im Array müssen vom Typ `object` sein',

  'An unknown error occurred': 'Ein unbekannter Fehler ist aufgetreten',

  'At least one field must be returned': 'Mindestens ein Feld muss zurückgegeben werden',
  'At least one field must be selected': 'Mindestens ein Feld muss ausgewählt werden',
  'At least one row must be inserted': 'Mindestens eine Zeile muss eingefügt werden',

  'Each item in this field must be unique': 'Jedes Element in diesem Feld muss eindeutig sein',

  'Invalid email address': 'Ungültige E-Mail-Adresse',
  'Invalid input': 'Ungültige Eingabe',
  'Invalid nulls order `$order`': createPattern('Ungültige Null-Sortierung `$order`', { order: 'string' }),
  'Invalid order direction `$direction`': createPattern('Ungültige Sortierrichtung `$direction`', {
    direction: 'string',
  }),
  'Invalid path': 'Ungültiger Pfad',
  'Invalid timestamp': 'Ungültiger Zeitstempel',
  'Invalid URL': 'Ungültige URL',
  'Invalid value': 'Ungültiger Wert',

  'The `$param` parameter must be a positive integer': createPattern(
    'Der Parameter `$param` muss eine positive Ganzzahl sein',
    { param: 'string' },
  ),
  'The `$param` parameter must be an integer': createPattern('Der Parameter `$param` muss eine Ganzzahl sein', {
    param: 'string',
  }),
  'The `$param` parameter must be greater than or equal to zero': createPattern(
    'Der Parameter `$param` muss größer oder gleich Null sein',
    { param: 'string' },
  ),

  'The collection `$collection` does not exist': createPattern('Die Collection `$collection` existiert nicht', {
    collection: 'string',
  }),

  'The field `$field` does not exist': createPattern('Das Feld `$field` existiert nicht', { field: 'string' }),
  'The field `$field` is not nullable': createPattern('Das Feld `$field` darf nicht null sein', { field: 'string' }),
  'The field `$field` must be a boolean': createPattern('Das Feld `$field` muss ein Boolean sein', { field: 'string' }),
  'The field `$field` must be a boolean or `null`': createPattern(
    'Das Feld `$field` muss ein Boolean oder `null` sein',
    {
      field: 'string',
    },
  ),
  'The field `$field` must be a number': createPattern('Das Feld `$field` muss eine Zahl sein', { field: 'string' }),
  'The field `$field` must be a number or `null`': createPattern('Das Feld `$field` muss eine Zahl oder `null` sein', {
    field: 'string',
  }),
  'The `$field` field must be an array containing exactly two numbers': createPattern(
    'Das Feld `$field` muss ein Array mit genau zwei Zahlen sein',
    { field: 'string' },
  ),
  'The field `$field` must be an array of numbers': createPattern('Das Feld `$field` muss ein Array von Zahlen sein', {
    field: 'string',
  }),
  'The field `$field` must be an array of strings': createPattern(
    'Das Feld `$field` muss ein Array von Zeichenketten sein',
    {
      field: 'string',
    },
  ),
  'This field must have a value that is not empty': 'Dieses Feld muss einen Wert haben, der nicht leer ist',

  'The input must be an object': 'Die Eingabe muss ein Objekt sein',
  'The input must be an object or an array of objects': 'Die Eingabe muss ein Objekt oder ein Array von Objekten sein',

  'The operator `$operator` is not supported for the field `$field`': createPattern(
    'Der Operator `$operator` wird für das Feld `$field` nicht unterstützt',
    { operator: 'string', field: 'string' },
  ),

  "The value cannot be 'false'": "Der Wert darf nicht 'false' sein",
  'The value cannot have more than `$count` decimals': createPattern(
    'Der Wert darf nicht mehr als `$count` $decimals haben',
    { count: 'number' },
    { decimals: [{ conditions: [{ count: 1 }], output: 'Dezimalstelle' }, 'Dezimalstellen'] },
  ),
  'The value must be `null`': 'Der Wert muss `null` sein',
  'The value must be a boolean': 'Der Wert muss ein Boolean sein',
  'The value must be a boolean or `null`': 'Der Wert muss ein Boolean oder `null` sein',
  'The value must be a number': 'Der Wert muss eine Zahl sein',
  'The value must be a number or `null`': 'Der Wert muss eine Zahl oder `null` sein',
  'The value must be a string': 'Der Wert muss eine Zeichenkette sein',
  'The value must be a string or `null`': 'Der Wert muss eine Zeichenkette oder `null` sein',
  'The value must be an array': 'Der Wert muss ein Array sein',
  'The value must be an array or `null`': 'Der Wert muss ein Array oder `null` sein',
  'The value must be an integer': 'Der Wert muss eine Ganzzahl sein',
  'The value must be an integer or `null`': 'Der Wert muss eine Ganzzahl oder `null` sein',
  'The value must be an object': 'Der Wert muss ein Objekt sein',
  'The value must be an object or `null`': 'Der Wert muss ein Objekt oder `null` sein',
  'The value must be at least `$min` characters long': createPattern(
    'Der Wert muss mindestens `$min` $characters lang sein',
    { min: 'number' },
    { characters: [{ conditions: [{ min: 1 }], output: 'Zeichen' }, 'Zeichen'] },
  ),
  'The value must be at most `$max` characters long': createPattern(
    'Der Wert darf höchstens `$max` $characters lang sein',
    { max: 'number' },
    { characters: [{ conditions: [{ max: 1 }], output: 'Zeichen' }, 'Zeichen'] },
  ),
  'The value must be exactly `$length` characters long': createPattern(
    'Der Wert muss genau `$length` $characters lang sein',
    { length: 'number' },
    { characters: [{ conditions: [{ length: 1 }], output: 'Zeichen' }, 'Zeichen'] },
  ),
  'The value must be greater than or equal to `$min`': createPattern('Der Wert muss größer oder gleich `$min` sein', {
    min: 'number',
  }),
  'The value must be less than or equal to `$max`': createPattern('Der Wert muss kleiner oder gleich `$max` sein', {
    max: 'number',
  }),
  'The value must be one of the specified types: $types': createPattern(
    'Der Wert muss einer der angegebenen Typen sein: $types',
    { types: 'string' },
  ),
  'The value must be serializable': 'Der Wert muss serialisierbar sein',
  'The value must be unique': 'Der Wert muss eindeutig sein',

  'This field cannot be left empty': 'Dieses Feld darf nicht leer sein',
  'This field contains invalid values': 'Dieses Feld enthält ungültige Werte',
  'This field contains items of the wrong type': 'Dieses Feld enthält Elemente vom falschen Typ',
  'This field is not nullable': 'Dieses Feld darf nicht null sein',
  'This field is required': 'Dieses Feld ist erforderlich',
  'This field must contain at least $min items': createPattern(
    'Dieses Feld muss mindestens $min $items enthalten',
    { min: 'number' },
    { items: [{ conditions: [{ min: 1 }], output: 'Element' }, 'Elemente'] },
  ),
  'This field must contain at least one item': 'Dieses Feld muss mindestens ein Element enthalten',
  'This field must contain at most $max items': createPattern(
    'Dieses Feld darf höchstens $max $items enthalten',
    { max: 'number' },
    { items: [{ conditions: [{ max: 1 }], output: 'Element' }, 'Elemente'] },
  ),
  'This field must contain exactly $exact items': createPattern(
    'Dieses Feld muss genau $exact $items enthalten',
    { exact: 'number' },
    { items: [{ conditions: [{ exact: 1 }], output: 'Element' }, 'Elemente'] },
  ),
  'This field requires `$field` to be present in the input data': createPattern(
    'Dieses Feld erfordert, dass `$field` in den Eingabedaten vorhanden ist',
    { field: 'string' },
  ),

  'Unique validation failed': 'Eindeutigkeitsprüfung fehlgeschlagen',
} as const

/**
 * Default `I18n` instance for the query builder.
 *
 * - Domain: 'pruvious-orm'
 * - Language: 'en'
 */
export const i18n = new I18n()
  .defineTranslatableStrings({
    domain: 'pruvious-orm',
    language: 'en',
    strings: translatableStrings,
  })
  .defineTranslatableStrings({
    domain: 'pruvious-orm',
    language: 'de',
    strings: translatableStringsDe,
  })
