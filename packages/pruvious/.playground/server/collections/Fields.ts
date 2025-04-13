import {
  dateField,
  dateRangeField,
  dateTimeField,
  dateTimeRangeField,
  defineCollection,
  numberField,
  repeaterField,
  selectField,
  structureField,
  switchField,
  textField,
  timeField,
  timeRangeField,
  timestampField,
} from '#pruvious/server'
import { repeaterTestField } from '~/shared/repeaterTestField'

export default defineCollection({
  fields: {
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

    // dependent fields
    typeDependency: selectField({
      ui: { label: 'Type (dependency)' },
      choices: [
        { label: 'Text', value: 'text' },
        { label: 'Number', value: 'number' },
      ],
      default: 'text',
    }),
    sizeDependency: selectField({
      ui: { label: 'Size (dependency)' },
      choices: [
        { label: 'Small', value: 'small' },
        { label: 'Medium', value: 'medium' },
        { label: 'Large', value: 'large' },
      ],
      default: 'medium',
    }),
    textDependent: textField({
      ui: { label: 'Text (dependent)' },
      required: true,
      conditionalLogic: { '../../typeDependency': { '=': 'text' } },
      dependencies: ['sizeDependency'],
    }),
    numberDependent: numberField({
      ui: { label: 'Number (dependent)' },
      required: true,
      conditionalLogic: { '../../typeDependency': { '=': 'number' } },
      dependencies: ['sizeDependency'],
    }),
    repeaterDependent: repeaterField({
      ui: { label: 'Repeater (dependent)' },
      subfields: {
        text: textField({
          required: true,
          conditionalLogic: { '../../typeDependency': { '=': 'text' } },
          dependencies: ['/sizeDependency'],
        }),
        number: numberField({
          required: true,
          conditionalLogic: { '../../typeDependency': { '=': 'number' } },
          dependencies: ['/sizeDependency'],
        }),
      },
    }),
    structureDependent: structureField({
      ui: { label: 'Structure (dependent)' },
      structure: {
        foo: {
          text: textField({
            required: true,
            conditionalLogic: { '../../typeDependency': { '=': 'text' } },
            dependencies: ['/sizeDependency'],
          }),
          number: numberField({
            required: true,
            conditionalLogic: { '../../typeDependency': { '=': 'number' } },
            dependencies: ['/sizeDependency'],
          }),
        },
      },
    }),
  },
  createdAt: false,
  updatedAt: false,
  ui: {
    createPage: {
      fieldsLayout: [
        {
          tabs: [
            {
              label: 'Structure',
              fields: ['structure', 'structureMinMax', 'structureUnique', 'structureDeduplicate', 'structureNested'],
            },
            {
              label: 'Repeater',
              fields: ['repeater', 'repeaterMinMax', 'repeaterUnique', 'repeaterDeduplicate', 'repeaterNested'],
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
              label: 'Dependent fields',
              fields: [
                'textDependent',
                'numberDependent',
                'typeDependency',
                'sizeDependency',
                'repeaterDependent',
                'structureDependent',
              ],
            },
          ],
        },
      ],
    },
    updatePage: { fieldsLayout: 'mirror' },
  },
})
