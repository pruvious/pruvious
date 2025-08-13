import {
  blocksField,
  buttonGroupField,
  checkboxField,
  chipsField,
  dateField,
  dateRangeField,
  dateTimeField,
  dateTimeRangeField,
  defineCollection,
  nullableObjectField,
  nullableSelectField,
  nullableTextField,
  numberField,
  objectField,
  recordField,
  recordsField,
  repeaterField,
  selectField,
  structureField,
  subpathField,
  switchField,
  textField,
  timeField,
  timeRangeField,
  timestampField,
  trueFalseField,
} from '#pruvious/server'
import { repeaterTestField } from '#shared/repeaterTestField'

export default defineCollection({
  fields: {
    // blocks
    blocks: blocksField({}),
    blocksMinMax: blocksField({
      minItems: 2,
      maxItems: 3,
      default: [
        { $key: 'Button', label: 'Foo' },
        { $key: 'Button', label: 'Bar' },
      ],
      ui: { label: 'Blocks (min/max)' },
    }),
    blocksUnique: blocksField({
      enforceUniqueItems: true,
      ui: { label: 'Blocks (unique items)' },
    }),
    blocksDeduplicate: blocksField({
      deduplicateItems: true,
      ui: { label: 'Blocks (deduplicate items)' },
    }),
    blocksAllowedRoot: blocksField({
      allowRootBlocks: ['Container', 'Nesting'],
    }),

    // buttonGroup
    buttonGroup: buttonGroupField({
      choices: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
        { label: 'Option 3', value: 'option3' },
      ],
      default: 'option2',
      ui: { description: 'Description' },
    }),

    // checkbox
    checkbox: checkboxField({
      requireTrue: true,
      ui: { fieldLabel: 'Checkbox', description: 'Description' },
    }),
    checkboxRequireTrue: checkboxField({
      required: true,
      requireTrue: true,
      default: true,
      conditionalLogic: { checkbox: { '=': true } },
      ui: { label: 'Checkbox (required, true)' },
    }),
    checkboxRequireAny: checkboxField({
      required: true,
      requireTrue: false,
      default: true,
      conditionalLogic: { checkbox: { '=': true } },
      ui: { label: 'Checkbox (required, any)' },
    }),

    // chips
    chips: chipsField({
      ui: { label: 'Chips', description: 'Description', placeholder: 'Placeholder' },
    }),
    chipsChoices: chipsField({
      choices: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
        { label: 'Option 3', value: 'option3' },
      ],
      default: ['option2'],
      ui: { label: 'Chips (choices)' },
    }),
    chipsMinMax: chipsField({
      minItems: 2,
      maxItems: 3,
      default: ['foo', 'bar'],
      ui: { label: 'Chips (min/max)' },
    }),
    chipsAllowDuplicates: chipsField({
      enforceUniqueItems: false,
      ui: { label: 'Chips (allow duplicates)' },
    }),
    chipsChoicesAllowDuplicates: chipsField({
      choices: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
        { label: 'Option 3', value: 'option3' },
      ],
      enforceUniqueItems: false,
      ui: { label: 'Chips (choices, allow duplicates)' },
    }),
    chipsDeduplicate: chipsField({
      deduplicateItems: true,
      ui: { label: 'Chips (deduplicate items)' },
    }),

    // date
    date: dateField({ ui: { label: 'Date', placeholder: 'Select a date' } }),
    dateMinMax: dateField({ min: Date.parse('2025-03-01'), max: '2025-03-31', ui: { label: 'Date (min/max)' } }),

    // dateRange
    dateRange: dateRangeField({ ui: { label: 'Date range' } }),
    dateRangeMinMax: dateRangeField({
      min: Date.parse('2025-03-01'),
      max: '2025-03-31',
      ui: { label: 'Date range (min/max)' },
    }),
    dateRangeBounded: dateRangeField({
      minRange: { days: 1 },
      maxRange: '10 days',
      ui: { label: 'Date range (bounded)' },
    }),

    // dateTime
    dateTimeUTC: dateTimeField({ ui: { timezone: 'UTC', label: 'Date-time (UTC)' } }),
    dateTimeLocal: dateTimeField({ ui: { timezone: 'local', label: 'Date-time (Local)' } }),
    dateTimeBerlin: dateTimeField({ ui: { timezone: 'Europe/Berlin', label: 'Date-time (Europe/Berlin)' } }),
    dateTimeNewYork: dateTimeField({ ui: { timezone: 'America/New_York', label: 'Date-time (America/New_York)' } }),
    dateTimeBerlinMinMax: dateTimeField({
      min: Date.parse('2025-03-01 GMT+1'),
      max: '2025-03-31 GMT+2',
      ui: { timezone: 'Europe/Berlin', label: 'Date-time (Europe/Berlin, min/max)' },
    }),

    // dateTimeRange
    dateTimeRangeUTC: dateTimeRangeField({ ui: { timezone: 'UTC', label: 'Date-time range (UTC)' } }),
    dateTimeRangeLocal: dateTimeRangeField({ ui: { timezone: 'local', label: 'Date-time range (Local)' } }),
    dateTimeRangeBerlin: dateTimeRangeField({
      ui: { timezone: 'Europe/Berlin', label: 'Date-time range (Europe/Berlin)' },
    }),
    dateTimeRangeNewYork: dateTimeRangeField({
      ui: { timezone: 'America/New_York', label: 'Date-time range (America/New_York)' },
    }),
    dateTimeRangeBerlinMinMax: dateTimeRangeField({
      min: Date.parse('2025-03-01 GMT+1'),
      max: '2025-03-31 GMT+2',
      ui: { timezone: 'Europe/Berlin', label: 'Date-time range (Europe/Berlin, min/max)' },
    }),
    dateTimeRangeBerlinBounded: dateTimeRangeField({
      minRange: { days: 1 },
      maxRange: '10 days',
      ui: { timezone: 'Europe/Berlin', label: 'Date-time range (Europe/Berlin, bounded)' },
    }),

    // nullableObject
    nullableObject: nullableObjectField({
      subfields: {
        type: selectField({
          choices: [
            { label: 'Text', value: 'text' },
            { label: 'Number', value: 'number' },
          ],
          default: 'text',
        }),
        text: textField({
          conditionalLogic: { type: { '=': 'text' } },
          validators: [
            (value) => {
              if (value === 'FOO') throw new Error('Invalid value')
            },
          ],
        }),
        number: numberField({ required: true, default: 1337, conditionalLogic: { type: { '=': 'number' } } }),
      },
      ui: { subfieldsLayout: [{ row: ['type', 'text', 'number'] }], description: 'Test description' },
    }),
    nullableObjectNested: nullableObjectField({
      subfields: {
        foo: textField({}),
        nested: nullableObjectField({
          subfields: {
            type: selectField({
              choices: [
                { label: 'Text', value: 'text' },
                { label: 'Number', value: 'number' },
              ],
              default: 'text',
            }),
            text: textField({
              conditionalLogic: { type: { '=': 'text' } },
              validators: [
                (value) => {
                  if (value === 'FOO') throw new Error('Invalid value')
                },
              ],
            }),
            number: numberField({ required: true, default: 1337, conditionalLogic: { type: { '=': 'number' } } }),
          },
          ui: {
            label: 'Nullable object (nested)',
            subfieldsLayout: [{ row: ['type', 'text', 'number'] }],
          },
        }),
        nestedDefault: nullableObjectField({
          subfields: {
            foo: textField({}),
          },
          default: { foo: 'BAR' },
          ui: { label: 'Object (nested with default)' },
        }),
      },
    }),

    // nullableSelect
    nullableSelect: nullableSelectField({
      choices: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
        { label: 'Option 3', value: 'option3' },
      ],
      default: 'option2',
      ui: { nullChoiceLabel: 'Select an option', nullChoiceMuted: false, description: 'Description' },
    }),

    // nullableText
    nullableText: nullableTextField({
      default: 'Default',
      ui: {
        switch: { onLabel: 'ON', offLabel: 'OFF' },
        placeholder: 'Enter text...',
        description: 'Description',
      },
    }),
    nullableTextMinMax: nullableTextField({
      minLength: 6,
      maxLength: 8,
      ui: { label: 'Nullable text (min/max)' },
    }),
    nullableTextAllowEmptyString: nullableTextField({
      allowEmptyString: true,
      ui: { label: 'Nullable text (allow empty string)' },
    }),
    nullableTextNoTrim: nullableTextField({
      trim: false,
      ui: { label: 'Nullable text (no trim)' },
    }),

    // number
    number: numberField({
      ui: {
        description: 'Description',
        placeholder: 'Enter a number...',
        autoWidth: true,
        showDragButton: true,
        suffix: 'px',
        dragDirection: 'vertical',
        padZeros: 3,
        increment: 2,
      },
    }),
    numberMinMax: numberField({
      min: 1,
      max: 100,
      default: 50,
      ui: { label: 'Number (min/max)', showSteppers: true, increment: 2 },
    }),
    numberDecimals: numberField({
      decimalPlaces: 2,
      ui: { label: 'Number (decimals)', increment: 0.1 },
    }),

    // object
    object: objectField({
      subfields: {
        type: selectField({
          choices: [
            { label: 'Text', value: 'text' },
            { label: 'Number', value: 'number' },
          ],
          default: 'text',
        }),
        text: textField({
          conditionalLogic: { type: { '=': 'text' } },
          validators: [
            (value) => {
              if (value === 'FOO') throw new Error('Invalid value')
            },
          ],
        }),
        number: numberField({ required: true, default: 1337, conditionalLogic: { type: { '=': 'number' } } }),
      },
      ui: { subfieldsLayout: [{ row: ['type', 'text', 'number'] }], description: 'Test description' },
    }),
    objectNested: objectField({
      subfields: {
        foo: textField({}),
        nested: objectField({
          subfields: {
            type: selectField({
              choices: [
                { label: 'Text', value: 'text' },
                { label: 'Number', value: 'number' },
              ],
              default: 'text',
            }),
            text: textField({
              conditionalLogic: { type: { '=': 'text' } },
              validators: [
                (value) => {
                  if (value === 'FOO') throw new Error('Invalid value')
                },
              ],
            }),
            number: numberField({ required: true, default: 1337, conditionalLogic: { type: { '=': 'number' } } }),
          },
          ui: {
            label: 'Object (nested)',
            subfieldsLayout: [{ row: ['type', 'text', 'number'] }],
          },
        }),
      },
    }),

    // record
    record: recordField({
      collection: 'Users',
      ui: {
        description: 'Select a user',
        placeholder: 'Select a user',
        displayFields: [['firstName', ' ', 'lastName'], 'email'],
        searchFields: ['firstName', 'lastName', 'email'],
      },
    }),
    recordPopulate: recordField({
      collection: 'Users',
      fields: ['id', 'email', 'roles'],
      populate: true,
      ui: {
        label: 'Record (populate)',
        displayFields: 'lastName',
        searchFields: 'lastName',
      },
    }),

    // records
    records: recordsField({
      collection: 'Users',
      fields: ['id', 'email', 'roles'],
      ui: {
        description: 'Select users',
        placeholder: 'Select users',
        displayFields: [['firstName', ' ', 'lastName'], 'email'],
        searchFields: ['firstName', 'lastName', 'email'],
      },
    }),
    recordsMinMax: recordsField({
      collection: 'Users',
      minItems: 2,
      maxItems: 3,
      default: [1, 2],
      ui: {
        label: 'Records (min/max)',
        displayFields: 'lastName',
        searchFields: 'lastName',
      },
    }),
    recordsAllowDuplicates: recordsField({
      collection: 'Users',
      enforceUniqueItems: false,
      ui: {
        label: 'Records (allow duplicates)',
        displayFields: ['firstName', 'email'],
        searchFields: 'email',
      },
    }),
    recordsDeduplicate: recordsField({
      collection: 'Users',
      deduplicateItems: true,
      ui: { label: 'Records (deduplicate)' },
    }),
    recordsPopulate: recordsField({
      collection: 'Users',
      fields: ['id', 'email', 'roles'],
      populate: true,
      ui: { label: 'Records (populate)' },
    }),

    // repeater
    repeater: repeaterTestField(),
    repeaterMinMax: repeaterField({
      subfields: { foo: textField({}) },
      minItems: 2,
      maxItems: 3,
      default: [{ foo: 'FOO' }, { foo: 'BAR' }],
      ui: { label: 'Repeater (min/max)', itemLabelConfiguration: { subfieldValue: 'foo' } },
    }),
    repeaterUnique: repeaterField({
      subfields: { foo: textField({}) },
      enforceUniqueItems: true,
      ui: { label: 'Repeater (unique items)' },
    }),
    repeaterDeduplicate: repeaterField({
      subfields: { foo: textField({}) },
      deduplicateItems: true,
      ui: { label: 'Repeater (deduplicate items)' },
    }),
    repeaterNested: repeaterField({
      subfields: { foo: textField({ required: true }), nested: repeaterTestField() },
      ui: { label: 'Repeater (nested)' },
    }),

    // select
    select: selectField({
      choices: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
        { label: 'Option 3', value: 'option3' },
      ],
      default: 'option2',
      ui: { label: 'Select', description: 'Description', placeholder: 'Placeholder' },
    }),

    // structure
    structure: structureField({
      structure: {
        image: {
          src: textField({ required: true }),
          alt: textField({}),
        },
        video: {
          src: textField({ required: true }),
          autoplay: switchField({}),
        },
      },
      ui: {
        subfieldsLayout: {
          image: [{ row: ['src', 'alt'] }],
          video: [{ row: ['src', 'autoplay | auto'] }],
        },
      },
    }),
    structureMinMax: structureField({
      structure: {
        foo: { bar: textField({}) },
        baz: { qux: numberField({}) },
      },
      minItems: 2,
      maxItems: 3,
      default: [
        { $key: 'foo', bar: 'BAR' },
        { $key: 'baz', qux: 1337 },
      ],
      ui: {
        label: 'Structure (min/max)',
        itemLabelConfiguration: { foo: { subfieldValue: 'bar' }, baz: { subfieldValue: 'qux' } },
      },
    }),
    structureUnique: structureField({
      structure: { foo: { bar: textField({}) } },
      enforceUniqueItems: true,
      ui: { label: 'Structure (unique items)' },
    }),
    structureDeduplicate: structureField({
      structure: { foo: { bar: textField({}) } },
      deduplicateItems: true,
      ui: { label: 'Structure (deduplicate items)' },
    }),
    structureNested: structureField({
      structure: {
        foo: {
          nested: structureField({
            structure: {
              repeater: {
                repeater: repeaterTestField(),
              },
            },
          }),
        },
      },
      ui: { label: 'Structure (nested)' },
    }),

    // subpath
    subpath: subpathField({
      ui: {
        description: 'Description',
        placeholder: 'enter/subpath',
        switch: { onLabel: 'Public', offLabel: 'Private' },
      },
    }),
    subpathAllowNesting: subpathField({
      allowNesting: true,
      ui: { label: 'Subpath (allow nesting)' },
    }),
    subpathForceLowercase: subpathField({
      forceLowercase: true,
      ui: { label: 'Subpath (force lowercase)' },
    }),
    subpathMinMax: subpathField({
      minLength: 3,
      maxLength: 6,
      ui: { label: 'Subpath (min/max)' },
    }),

    // switch
    switch: switchField({
      requireTrue: true,
      ui: { fieldLabel: 'Switch', description: 'Description' },
    }),
    switchRequireTrue: switchField({
      required: true,
      requireTrue: true,
      default: true,
      conditionalLogic: { switch: { '=': true } },
      ui: { label: 'Switch (required, true)' },
    }),

    // text
    text: textField({
      default: 'Default',
      ui: { placeholder: 'Enter text...', description: 'Description' },
    }),
    textMinMax: textField({
      minLength: 6,
      maxLength: 8,
      default: 'foobar',
      ui: { label: 'Text (min/max)' },
    }),
    textAllowEmptyString: textField({
      allowEmptyString: true,
      ui: { label: 'Text (allow empty string)' },
    }),
    textNoTrim: textField({
      trim: false,
      ui: { label: 'Text (no trim)' },
    }),

    // time
    time: timeField({ ui: { label: 'Time' } }),
    timeMinMax: timeField({ min: 3600000, max: '23:00', ui: { label: 'Time (min/max)' }, default: 3600000 }),

    // timeRange
    timeRange: timeRangeField({ ui: { label: 'Time range' } }),
    timeRangeMinMax: timeRangeField({
      min: 3600000,
      max: '23:00',
      ui: { label: 'Time range (min/max)' },
      default: [3600000, 82800000],
    }),
    timeRangeBounded: timeRangeField({
      minRange: { hours: 1 },
      maxRange: '10 hours',
      default: [0, 3600000],
      ui: { label: 'Time range (bounded)' },
    }),

    // timestamp
    timestamp: timestampField({ ui: { label: 'Timestamp' } }),
    timestampMinMax: timestampField({
      min: Date.parse('2025-03-01'),
      max: Date.parse('2025-03-31'),
      default: Date.parse('2025-03-01'),
      ui: { label: 'Timestamp (min/max)' },
    }),

    // trueFalse
    trueFalse: trueFalseField({
      requireTrue: true,
      ui: { label: 'True/false', description: 'Description', yesLabel: 'True', noLabel: 'False' },
    }),
    trueFalseRequireTrue: trueFalseField({
      required: true,
      requireTrue: true,
      default: true,
      conditionalLogic: { trueFalse: { '=': true } },
      ui: { label: 'True/false (required, true)' },
    }),
    trueFalseRequireAny: trueFalseField({
      required: true,
      requireTrue: false,
      default: true,
      conditionalLogic: { trueFalse: { '=': true } },
      ui: { label: 'True/false (required, any)' },
    }),
  },
  translatable: false,
  createdAt: false,
  updatedAt: false,
  ui: {
    createPage: {
      fieldsLayout: [
        {
          tabs: [
            {
              label: 'Blocks',
              fields: ['blocks', 'blocksMinMax', 'blocksUnique', 'blocksDeduplicate', 'blocksAllowedRoot'],
            },
            {
              label: 'Button Group',
              fields: ['buttonGroup'],
            },
            {
              label: 'Checkbox',
              fields: ['checkbox', 'checkboxRequireTrue', 'checkboxRequireAny'],
            },
            {
              label: 'Chips',
              fields: [
                'chips',
                'chipsChoices',
                'chipsMinMax',
                'chipsAllowDuplicates',
                'chipsChoicesAllowDuplicates',
                'chipsDeduplicate',
              ],
            },
            {
              label: 'Date',
              fields: ['date', 'dateMinMax'],
            },
            {
              label: 'Date range',
              fields: ['dateRange', 'dateRangeMinMax', 'dateRangeBounded'],
            },
            {
              label: 'Date-time',
              fields: ['dateTimeUTC', 'dateTimeLocal', 'dateTimeBerlin', 'dateTimeNewYork', 'dateTimeBerlinMinMax'],
            },
            {
              label: 'Date-time range',
              fields: [
                'dateTimeRangeUTC',
                'dateTimeRangeLocal',
                'dateTimeRangeBerlin',
                'dateTimeRangeNewYork',
                'dateTimeRangeBerlinMinMax',
                'dateTimeRangeBerlinBounded',
              ],
            },
            {
              label: 'Nullable object',
              fields: ['nullableObject', 'nullableObjectNested'],
            },
            {
              label: 'Nullable select',
              fields: ['nullableSelect'],
            },
            {
              label: 'Nullable text',
              fields: ['nullableText', 'nullableTextMinMax', 'nullableTextAllowEmptyString', 'nullableTextNoTrim'],
            },
            {
              label: 'Number',
              fields: ['number', 'numberMinMax', 'numberDecimals'],
            },
            {
              label: 'Object',
              fields: ['object', 'objectNested'],
            },
            {
              label: 'Repeater',
              fields: ['repeater', 'repeaterMinMax', 'repeaterUnique', 'repeaterDeduplicate', 'repeaterNested'],
            },
            {
              label: 'Record',
              fields: ['record', 'recordPopulate'],
            },
            {
              label: 'Records',
              fields: ['records', 'recordsMinMax', 'recordsAllowDuplicates', 'recordsDeduplicate', 'recordsPopulate'],
            },
            {
              label: 'Select',
              fields: ['select'],
            },
            {
              label: 'Structure',
              fields: ['structure', 'structureMinMax', 'structureUnique', 'structureDeduplicate', 'structureNested'],
            },
            {
              label: 'Subpath',
              fields: ['subpath', 'subpathAllowNesting', 'subpathForceLowercase', 'subpathMinMax'],
            },
            {
              label: 'Switch',
              fields: ['switch', 'switchRequireTrue'],
            },
            {
              label: 'Text',
              fields: ['text', 'textMinMax', 'textAllowEmptyString', 'textNoTrim'],
            },
            {
              label: 'Time',
              fields: ['time', 'timeMinMax'],
            },
            {
              label: 'Time range',
              fields: ['timeRange', 'timeRangeMinMax', 'timeRangeBounded'],
            },
            {
              label: 'Timestamp',
              fields: ['timestamp', 'timestampMinMax'],
            },
            {
              label: 'True/false',
              fields: ['trueFalse', 'trueFalseRequireTrue', 'trueFalseRequireAny'],
            },
          ],
        },
      ],
    },
    updatePage: { fieldsLayout: 'mirror' },
  },
})
