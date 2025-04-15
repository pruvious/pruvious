import { defineCollection, numberField, repeaterField, selectField, structureField, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
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
})
