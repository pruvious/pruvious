import { defineCollection, isArray, isDefined, isObject } from '#pruvious'
import { fetchSubsetRecords } from '#pruvious/server'

export default defineCollection({
  name: 'operation-specific-guards',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  guards: [
    ({ allInputs, cache, definition, input, operation }) => {
      if (allInputs && (!isArray(allInputs) || operation !== 'create')) {
        throw new Error(`Parameter 'allInputs' is invalid: ${JSON.stringify(allInputs)}`)
      }

      if (!isObject(cache)) {
        throw new Error(`Parameter 'cache' is invalid: ${JSON.stringify(cache)}`)
      }

      if (definition.name !== 'operation-specific-guards') {
        throw new Error(`Parameter 'definition' is invalid: ${JSON.stringify(definition)}`)
      }

      if (input && !isObject(input)) {
        throw new Error(`Parameter 'input' is invalid: ${JSON.stringify(input)}`)
      }

      if (isDefined(input) && isDefined(allInputs)) {
        throw new Error("The parameters 'input' and 'allInput' cannot be defined at the same time")
      }

      if (!['create', 'read', 'update', 'delete'].includes(operation)) {
        throw new Error(`Parameter 'operation' is invalid: ${operation}`)
      }
    },
    {
      onCreate: true,
      guard: ({ allInputs, input }) => {
        if (input?.value === 'cc-bar' || allInputs?.some((entry) => entry.value === 'cc-bar')) {
          throw new Error('Cannot create cc-bar')
        }
      },
    },
    {
      onRead: true,
      guard: async ({ currentQuery }) => {
        const records = await fetchSubsetRecords<'operation-specific-guards'>(currentQuery as any, 'read')

        if (records.some(({ value }) => value === 'cr-bar')) {
          throw new Error('Cannot read cr-bar')
        }
      },
    },
    {
      onUpdate: true,
      guard: ({ allInputs, input }) => {
        if (input?.value === 'cu-bar' || allInputs?.some((entry) => entry.value === 'cu-bar')) {
          throw new Error('Cannot update cu-bar')
        }
      },
    },
    {
      onDelete: true,
      guard: async ({ currentQuery }) => {
        const records = await fetchSubsetRecords<'operation-specific-guards'>(currentQuery as any, 'delete')

        if (records.some(({ value }) => value === 'cd-bar')) {
          throw new Error('Cannot delete cd-bar')
        }
      },
    },
  ],
  fields: {
    value: {
      type: 'text',
      options: { label: 'foo' },
      additional: {
        guards: [
          ({ allInputs, cache, definition, input, name, operation, options, value }) => {
            if (allInputs && !isArray(allInputs)) {
              throw new Error(`Parameter 'allInputs' is invalid: ${JSON.stringify(allInputs)}`)
            }

            if (!isObject(cache)) {
              throw new Error(`Parameter 'cache' is invalid: ${JSON.stringify(cache)}`)
            }

            if (definition.name !== 'text') {
              throw new Error(`Parameter 'definition' is invalid: ${JSON.stringify(definition)}`)
            }

            if (!isObject(input)) {
              throw new Error(`Parameter 'input' is invalid: ${JSON.stringify(input)}`)
            }

            if (name !== 'value') {
              throw new Error(`Parameter 'name' is invalid: ${name}`)
            }

            if (options.label !== 'foo') {
              throw new Error(`Parameter 'options' is invalid: ${JSON.stringify(options)}`)
            }

            if (!['create', 'update'].includes(operation)) {
              throw new Error(`Parameter 'operation' is invalid: ${operation}`)
            }

            if (value === 'avada kedavra') {
              throw new Error('Unforgivable')
            }
          },
          {
            onCreate: true,
            guard: ({ value }) => {
              if (value === 'fc-bar') {
                throw new Error('Cannot create fc-bar')
              }
            },
          },
          {
            onUpdate: true,
            guard: ({ value }) => {
              if (value === 'fu-bar') {
                throw new Error('Cannot update fu-bar')
              }
            },
          },
        ],
      },
    },
  },
})
