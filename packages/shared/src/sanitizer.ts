import { compareArrays, isObject, isUrl, isUrlPath, uniqueArray } from '@pruvious-test/utils'
import { ConditionalLogic } from './ConditionalLogic'
import { getDefaultFieldValue } from './fields'
import { Block, BlockRecord, Field, FieldGroup, Size, Validator } from './types'

/**
 * Sanitize page blocks.
 */
export async function sanitizeBlocks(
  blockRecords: BlockRecord[],
  blocks: Block[],
  conditionalLogic: ConditionalLogic,
  key: string = 'blocks',
  forbiddenBlocks: string[] = [],
  draft: boolean = false,
  validators: Record<string, Validator> = {},
): Promise<{ sanitizedBlockRecords: BlockRecord[]; errors: { field: string; message: string }[] }> {
  const errors: { field: string; message: string }[] = []
  const sanitized: BlockRecord[] = []

  for (const [index, blockRecord] of blockRecords.entries()) {
    if (typeof blockRecord !== 'object') {
      continue
    }

    const block = blocks.find((block) => block.name === blockRecord.name)

    if (!block || !blockRecord.id) {
      if (blockRecord.id) {
        errors.push({ field: blockRecord.id, message: 'Unknown block' })
      }

      continue
    }

    /*
    |--------------------------------------------------------------------------
    | Forbidden blocks
    |--------------------------------------------------------------------------
    |
    */

    if (forbiddenBlocks.includes(block.name)) {
      errors.push({ field: blockRecord.id, message: `The '${block.name}' block is not allowed` })
      continue
    }

    /*
    |--------------------------------------------------------------------------
    | Slots
    |--------------------------------------------------------------------------
    |
    */

    const slots = Object.keys(block.slots ?? {})

    if (slots.length && !blockRecord.children) {
      blockRecord.children = {}
      errors.push({
        field: blockRecord.id,
        message: 'Missing slots: ' + slots.join(', '),
      })
    } else if (!slots.length && blockRecord.children) {
      if (Object.keys(blockRecord.children).length) {
        errors.push({ field: blockRecord.id, message: 'This block has no slots' })
      }

      delete blockRecord.children
    }

    slots.forEach((slot) => {
      if (!blockRecord.children![slot]) {
        blockRecord.children![slot] = []
        errors.push({ field: blockRecord.id, message: `Missing slot: ${slot}` })
      }
    })

    Object.keys(blockRecord.children ?? {}).forEach((slot) => {
      if (!slots.includes(slot)) {
        delete blockRecord.children![slot]
        errors.push({ field: blockRecord.id, message: `Unknown slot: ${slot}` })
      }
    })

    /*
    |--------------------------------------------------------------------------
    | Props
    |--------------------------------------------------------------------------
    |
    */

    if (!blockRecord.props || typeof blockRecord !== 'object') {
      blockRecord.props = {}
    }

    const sanitizedFields = await sanitizeFields(
      blockRecord.props,
      block.fields,
      conditionalLogic,
      `${blockRecord.id}-`,
      `${key}.${index}#${block.name}`,
      draft,
      validators,
    )
    blockRecord.props = sanitizedFields.sanitizedFieldRecords
    errors.push(...sanitizedFields.errors)

    /*
    |--------------------------------------------------------------------------
    | Child blocks
    |--------------------------------------------------------------------------
    |
    */

    for (const slot of Object.keys(blockRecord.children ?? {})) {
      const sanitizedChildren = await sanitizeBlocks(
        blockRecord.children![slot],
        blocks,
        conditionalLogic,
        `${key}.${index}#${block.name}:${slot}`,
        forbiddenBlocks,
        draft,
        validators,
      )
      blockRecord.children![slot] = sanitizedChildren.sanitizedBlockRecords
      errors.push(...sanitizedChildren.errors)
    }

    /*
    |--------------------------------------------------------------------------
    | Append
    |--------------------------------------------------------------------------
    |
    */

    sanitized.push(blockRecord)
  }

  return { sanitizedBlockRecords: sanitized, errors }
}

/**
 * Sanitize fields.
 */
export async function sanitizeFields(
  fieldRecords: Record<string, any>,
  fields: (Field | FieldGroup)[],
  conditionalLogic: ConditionalLogic,
  idPrefix: string = '',
  key: string = '',
  draft: boolean = false,
  validators: Record<string, Validator> = {},
): Promise<{
  sanitizedFieldRecords: Record<string, any>
  errors: { field: string; message: string }[]
}> {
  const sanitized: Record<string, any> = JSON.parse(JSON.stringify(fieldRecords))
  const errors: { field: string; message: string }[] = []
  const flattenedFields = flattenFields(fields)

  for (const field of flattenedFields) {
    //
    // Conditional logic
    //
    if (!conditionalLogic.matches[key ? `${key}.${field.name}` : field.name]) {
      fieldRecords[field.name] = null
      sanitized[field.name] = null
      continue
    }
    //
    // Editor, Text, and Textarea field validation
    //
    if (field.type === 'editor' || field.type === 'text' || field.type === 'textArea') {
      const isString = typeof fieldRecords[field.name] === 'string'

      if (
        (field.type === 'text' || field.type === 'textArea') &&
        (field.trim || field.trim === undefined) &&
        isString
      ) {
        fieldRecords[field.name] = fieldRecords[field.name].trim()
        sanitized[field.name] = fieldRecords[field.name]
      }

      if (!isString) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'The value must be a string',
        })
      } else if (
        field.required &&
        (!fieldRecords[field.name].trim() ||
          (field.type === 'editor' && fieldRecords[field.name] === '<p></p>'))
      ) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      } else if (
        typeof field.min === 'number' &&
        fieldRecords[field.name].trim().length < field.min
      ) {
        errors.push({
          field: idPrefix + field.name,
          message: `The field must have at least ${field.min} ${
            field.min === 1 ? 'character' : 'characters'
          }`,
        })
      } else if (
        typeof field.max === 'number' &&
        fieldRecords[field.name].trim().length > field.max
      ) {
        errors.push({
          field: idPrefix + field.name,
          message: `The field can be up to ${field.max} ${
            field.max === 1 ? 'character' : 'characters'
          } long`,
        })
      }
    }
    //
    // Image field validation
    //
    else if (field.type === 'image') {
      if (typeof fieldRecords[field.name] !== 'number' && fieldRecords[field.name] !== null) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'The value must be a number',
        })
      } else if (field.required && !fieldRecords[field.name]) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      }
    }
    //
    // Repeater field validation
    //
    else if (field.type === 'repeater') {
      const isArray = Array.isArray(fieldRecords[field.name])

      if (!isArray) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'The value must be an array',
        })
      } else if (
        field.required &&
        (!fieldRecords[field.name] || !fieldRecords[field.name].length)
      ) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      } else if (typeof field.min === 'number' && fieldRecords[field.name].length < field.min) {
        errors.push({
          field: idPrefix + field.name,
          message: `The repeater must have at least ${field.min} ${
            field.min === 1 ? 'item' : 'items'
          }`,
        })
      } else if (typeof field.max === 'number' && fieldRecords[field.name].length > field.max) {
        errors.push({
          field: idPrefix + field.name,
          message: `The repeater can have up to ${field.max} ${field.max === 1 ? 'item' : 'items'}`,
        })
      }

      if (field.distinct && isArray) {
        const strigified = fieldRecords[field.name].map((v: any) => JSON.stringify(v))

        if (strigified.length !== uniqueArray(strigified).length) {
          errors.push({
            field: idPrefix + field.name,
            message: `Each ${field.itemLabel ?? 'item'} must be unique`,
          })
        }
      }

      if (Array.isArray(fieldRecords[field.name])) {
        for (const [index, subFields] of (
          fieldRecords[field.name] as Record<string, any>[]
        ).entries()) {
          const sanitizedItems = await sanitizeFields(
            subFields,
            field.subFields,
            conditionalLogic,
            `${idPrefix}${field.name}.${index}.`,
            key ? `${key}.${field.name}.${index}` : `${field.name}.${index}`,
            draft,
            validators,
          )
          sanitized[field.name][index] = sanitizedItems.sanitizedFieldRecords
          errors.push(...sanitizedItems.errors)
        }
      }
    }
    //
    // Link field validation
    //
    else if (field.type === 'link') {
      const isLinkObject = !(
        (!isObject(fieldRecords[field.name]) && fieldRecords[field.name] !== null) ||
        (fieldRecords[field.name] !== null &&
          (typeof fieldRecords[field.name].url !== 'string' ||
            typeof fieldRecords[field.name].label !== 'string' ||
            (typeof fieldRecords[field.name].target !== 'string' &&
              fieldRecords[field.name].target !== null)))
      )

      if (isLinkObject && fieldRecords[field.name]) {
        sanitized[field.name].url = sanitized[field.name].url.trim()
        sanitized[field.name].label = sanitized[field.name].label.trim()
      }

      if (!isLinkObject) {
        sanitized[field.name] = field.required ? getDefaultFieldValue(field) : null
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'The value must be a link object',
          })
        }
      } else if (
        field.required &&
        (!fieldRecords[field.name] || !fieldRecords[field.name].url.trim())
      ) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      } else if (
        fieldRecords[field.name] !== null &&
        !isUrl(fieldRecords[field.name].url.trim()) &&
        !isUrlPath(fieldRecords[field.name].url.trim(), true)
      ) {
        sanitized[field.name].url = ''
        errors.push({
          field: idPrefix + field.name,
          message: fieldRecords[field.name].url.startsWith('http')
            ? 'Invalid URL'
            : 'Invalid URL path',
        })
      }
    }
    //
    // Url field validation
    //
    else if (field.type === 'url') {
      const isString = typeof fieldRecords[field.name] === 'string'

      if (isString) {
        fieldRecords[field.name] = fieldRecords[field.name].trim()
        sanitized[field.name] = fieldRecords[field.name]
      }

      if (!isString) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'The value must be a string',
        })
      } else if (field.required && !fieldRecords[field.name].trim()) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      } else if (
        !isUrl(fieldRecords[field.name].trim()) &&
        !isUrlPath(fieldRecords[field.name].trim(), true)
      ) {
        sanitized[field.name] = ''
        errors.push({
          field: idPrefix + field.name,
          message: fieldRecords[field.name].startsWith('http') ? 'Invalid URL' : 'Invalid URL path',
        })
      }
    }
    //
    // Datetime and date field validation
    //
    else if (field.type === 'dateTime' || field.type === 'date') {
      if (
        (typeof fieldRecords[field.name] !== 'number' ||
          !Number.isInteger(fieldRecords[field.name])) &&
        fieldRecords[field.name] !== null
      ) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'The value must be an integer',
        })
      } else if (field.required && !fieldRecords[field.name]) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      } else if (
        fieldRecords[field.name] &&
        new Date(fieldRecords[field.name]).getTime() !== fieldRecords[field.name]
      ) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'Invalid date',
        })
      } else {
        let reported: boolean = false

        if (fieldRecords[field.name] && field.minDate) {
          try {
            const minDate = new Date(field.minDate)

            if (fieldRecords[field.name] < minDate.getTime()) {
              errors.push({
                field: idPrefix + field.name,
                message: `The minimum date is ${minDate.toUTCString()}`,
              })
              reported = true
            }
          } catch (_) {}
        }

        if (fieldRecords[field.name] && field.maxDate && !reported) {
          try {
            const maxDate = new Date(field.maxDate)

            if (fieldRecords[field.name] > maxDate.getTime()) {
              errors.push({
                field: idPrefix + field.name,
                message: `The maximum date is ${maxDate.toUTCString()}`,
              })
            }
          } catch (_) {}
        }
      }
    }
    //
    // Time field validation
    //
    else if (field.type === 'time') {
      if (
        (typeof fieldRecords[field.name] !== 'number' ||
          !Number.isInteger(fieldRecords[field.name])) &&
        fieldRecords[field.name] !== null
      ) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'The value must be an integer',
        })
      } else if (field.required && !fieldRecords[field.name]) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      } else if (fieldRecords[field.name] && fieldRecords[field.name] >= 86400000) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'Invalid time',
        })
      }
    }
    //
    // Role field validation
    //
    else if (
      field.type === 'page' ||
      field.type === 'preset' ||
      field.type === 'file' ||
      field.type === 'post' ||
      field.type === 'role' ||
      field.type === 'user'
    ) {
      if (
        (typeof fieldRecords[field.name] !== 'number' ||
          fieldRecords[field.name] <= 0 ||
          !Number.isInteger(fieldRecords[field.name])) &&
        fieldRecords[field.name] !== null
      ) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'The value must be a positive integer',
        })
      } else if (field.required && !fieldRecords[field.name]) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      }
    }
    //
    // Number and slider field validation
    //
    else if (field.type === 'number' || field.type === 'slider') {
      const isNumber = typeof fieldRecords[field.name] === 'number'
      const min = field.min ?? (field.type === 'slider' ? 0 : undefined)
      const max = field.max ?? (field.type === 'slider' ? 100 : undefined)
      const decimals = field.decimals ?? 0

      if (!isNumber && fieldRecords[field.name] !== null) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'The value must be a number',
        })
      } else if (field.required && fieldRecords[field.name] === null) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      } else if (isNumber && min !== undefined && fieldRecords[field.name] < min) {
        sanitized[field.name] = min
        errors.push({
          field: idPrefix + field.name,
          message: `The value must be greater than or equal to ${min}`,
        })
      } else if (isNumber && max !== undefined && fieldRecords[field.name] > max) {
        sanitized[field.name] = max
        errors.push({
          field: idPrefix + field.name,
          message: `The value must be less than or equal to ${max}`,
        })
      } else if (
        isNumber &&
        (fieldRecords[field.name].toString().split('.')[1]?.length ?? 0) > decimals
      ) {
        errors.push({
          field: idPrefix + field.name,
          message: decimals
            ? `The maximum number of allowed decimal places is ${decimals}`
            : `The value must be an integer`,
        })
      }
    }
    //
    // Buttons and select field validation
    //
    else if (field.type === 'buttons' || field.type === 'select') {
      const isString = typeof fieldRecords[field.name] === 'string'

      if (isString) {
        fieldRecords[field.name] = fieldRecords[field.name].trim()
        sanitized[field.name] = fieldRecords[field.name]
      }

      if (!isString && fieldRecords[field.name] !== null) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'The value must be a string',
        })
      } else if (
        field.required &&
        (!fieldRecords[field.name] || !fieldRecords[field.name].trim())
      ) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      } else if (
        isString &&
        (field.choices ?? []).every((choice) => choice.value !== fieldRecords[field.name])
      ) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'Invalid value',
        })
      }
    }
    //
    // Switch and checkbox field validation
    //
    else if (field.type === 'checkbox' || field.type === 'switch') {
      if (typeof fieldRecords[field.name] !== 'boolean' && fieldRecords[field.name] !== null) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'The value must be a boolean',
        })
      } else if (field.required && !fieldRecords[field.name]) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      }
    }
    //
    // Checkboxes field validation
    //
    else if (field.type === 'checkboxes') {
      const isArray = Array.isArray(fieldRecords[field.name])

      if (!isArray && fieldRecords[field.name] !== null) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'The value must be an array',
        })
      } else if (
        field.required &&
        (!fieldRecords[field.name] || !fieldRecords[field.name].length)
      ) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      }

      if (isArray) {
        sanitized[field.name] = []
        for (const checkboxValue of fieldRecords[field.name]) {
          if ((field.choices ?? []).some((choice) => choice.value === checkboxValue)) {
            sanitized[field.name].push(checkboxValue)
          } else {
            errors.push({
              field: idPrefix + field.name,
              message: `Invalid value: '${checkboxValue}'`,
            })
          }
        }
      }
    }
    //
    // Icon field validation
    //
    else if (field.type === 'icon') {
      const isString = typeof fieldRecords[field.name] === 'string'

      if (!isString && fieldRecords[field.name] !== null) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'The value must be a string',
        })
      } else if (field.required && !fieldRecords[field.name]) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      } else if (
        (field.allow && isString && !field.allow.includes(fieldRecords[field.name])) ||
        (field.forbid && isString && field.forbid.includes(fieldRecords[field.name]))
      ) {
        errors.push({
          field: idPrefix + field.name,
          message: 'The icon is not allowed',
        })
      }
    }
    //
    // Size field validation
    //
    else if (field.type === 'size') {
      const isObj = isObject(fieldRecords[field.name])
      const sizeNames: string[] = field.names ?? ['width', 'height']
      const hasCorrectNames =
        isObj && compareArrays(Object.keys(fieldRecords[field.name]), sizeNames)
      const hasCorrectValues =
        isObj &&
        hasCorrectNames &&
        Object.values(fieldRecords[field.name]).every(
          (size: Size) => typeof size.value === 'number',
        )
      const hasCorrectUnits =
        isObj &&
        hasCorrectNames &&
        Object.values(fieldRecords[field.name]).every((size: Size) => {
          if (field.units?.length) {
            return size.unit && field.units.includes(size.unit)
          } else {
            return size.unit === undefined
          }
        })
      const min = Object.fromEntries(
        sizeNames.map((name) => [
          name,
          typeof field.min === 'number'
            ? field.min
            : field.min && field.min[name]
            ? field.min[name]
            : null,
        ]),
      )
      const max = Object.fromEntries(
        sizeNames.map((name) => [
          name,
          typeof field.max === 'number'
            ? field.max
            : field.max && field.max[name]
            ? field.max[name]
            : null,
        ]),
      )

      if (!isObj) {
        sanitized[field.name] = getDefaultFieldValue(field)
        errors.push({
          field: idPrefix + field.name,
          message: 'The value must be an object',
        })
      } else if (field.required && !fieldRecords[field.name]) {
        sanitized[field.name] = getDefaultFieldValue(field)
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'This field is required',
          })
        }
      } else if (!hasCorrectNames) {
        for (const name of Object.keys(fieldRecords[field.name])) {
          if (!sizeNames.includes(name)) {
            delete sanitized[field.name][name]
          }
        }
        for (const name of sizeNames) {
          if (!fieldRecords[field.name][name]) {
            sanitized[field.name][name] = { value: 0 }
          }
        }
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'The size names must be equal to: ' + sizeNames.join(', '),
          })
        }
      } else if (!hasCorrectValues) {
        for (const name of sizeNames) {
          if (typeof fieldRecords[field.name][name].value !== 'number') {
            sanitized[field.name][name].value = 0
          }
        }
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: 'The field values must be numeric',
          })
        }
      } else if (!hasCorrectUnits) {
        for (const name of sizeNames) {
          if (
            field.units?.length &&
            (!fieldRecords[field.name][name].unit ||
              !field.units.includes(fieldRecords[field.name][name].unit))
          ) {
            sanitized[field.name][name].unit = field.units[0]
          } else if (!field.units?.length && fieldRecords[field.name][name].unit) {
            delete sanitized[field.name][name].unit
          }
        }
        if (!draft) {
          errors.push({
            field: idPrefix + field.name,
            message: field.units?.length
              ? 'The size units can only be: ' + field.units.join(', ')
              : 'The sizes cannot have units',
          })
        }
      } else {
        for (const name of sizeNames) {
          const label =
            field.inputLabels && field.inputLabels[name] ? field.inputLabels[name] : name

          if (min[name] !== null && fieldRecords[field.name][name].value < min[name]!) {
            sanitized[field.name][name].value = min[name]
            errors.push({
              field: idPrefix + field.name,
              message: `The ${label} value must be greater than or equal to ${min[name]}`,
            })
          } else if (max[name] !== null && fieldRecords[field.name][name].value > max[name]!) {
            sanitized[field.name][name].value = max[name]
            errors.push({
              field: idPrefix + field.name,
              message: `The ${label} value must be less than or equal to ${max[name]}`,
            })
          }
        }
      }
    }
    //
    // Regex validation
    //
    if (
      (field.type === 'editor' ||
        field.type === 'text' ||
        field.type === 'textArea' ||
        field.type === 'number' ||
        field.type === 'slider') &&
      field.regex &&
      !new RegExp(field.regex, field.regexFlags).test(fieldRecords[field.name].toString())
    ) {
      errors.push({
        field: idPrefix + field.name,
        message:
          field.regexError ??
          `The value must match the pattern /${field.regex.toString()}/${field.regexFlags ?? ''}`,
      })
    }
    //
    // Custom validators
    //
    if (field.validate && Array.isArray(field.validate)) {
      for (const validator of field.validate) {
        if (validators[validator]) {
          try {
            await validators[validator].callback({
              data: fieldRecords,
              field,
              value: fieldRecords[field.name],
            })
          } catch (e) {
            errors.push({ field: idPrefix + field.name, message: e.message })
          }
        }
      }
    }
  }

  Object.keys(fieldRecords).forEach((name) => {
    if (flattenedFields.every((field) => field.name !== name)) {
      delete fieldRecords[name]
      delete sanitized[name]
      errors.push({
        field: idPrefix + name,
        message: `Unknown field name: ${name}`,
      })
    }
  })

  return { sanitizedFieldRecords: sanitized, errors }
}

export function flattenFields(fields: (Field | FieldGroup)[]): Field[] {
  const flattened: Field[] = []

  fields.forEach((field) => {
    if (field.type === 'stack') {
      flattened.push(...flattenFields(field.fields))
    } else if (field.type === 'tabs') {
      field.tabs.forEach((tab) => {
        flattened.push(...flattenFields(tab.fields))
      })
    } else {
      flattened.push(field)
    }
  })

  return flattened
}
