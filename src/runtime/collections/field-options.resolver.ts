import type { FieldOptions, ResolvedFieldDefinition } from '#pruvious'

const resolvedCollectionFieldOptions: Record<string, any> = {}

export function resolveCollectionFieldOptions<T extends keyof FieldOptions>(
  cacheKey: string,
  field: T,
  name: string,
  options: Record<string, any>,
  fields: Record<string, ResolvedFieldDefinition>,
): Required<FieldOptions[T]> {
  if (!resolvedCollectionFieldOptions[cacheKey]) {
    resolvedCollectionFieldOptions[cacheKey] = {}
  }

  if (!resolvedCollectionFieldOptions[cacheKey][name]) {
    resolvedCollectionFieldOptions[cacheKey][name] = resolveFieldOptions(field, name, options, fields)
  }

  return resolvedCollectionFieldOptions[cacheKey][name]
}

export function resolveFieldOptions<T extends keyof FieldOptions>(
  field: T,
  name: string,
  options: Record<string, any>,
  fields: Record<string, ResolvedFieldDefinition>,
): Required<FieldOptions[T]> {
  const resolvedOptions: Record<string, any> = {}

  for (const [optionName, optionDefinition] of Object.entries(fields[field].options)) {
    resolvedOptions[optionName] =
      options[optionName] ??
      (optionDefinition.default ? optionDefinition.default({ definition: fields[field], options, name }) : undefined)
  }

  if (field === 'repeater') {
    resolvedOptions.subfields = {}

    for (const [subfieldName, subfieldDefinition] of Object.entries<any>(options.subfields)) {
      resolvedOptions.subfields[subfieldName] = {
        ...subfieldDefinition,
        options: resolveFieldOptions(subfieldDefinition.type, subfieldName, subfieldDefinition.options, fields),
      }
    }
  }

  return resolvedOptions as Required<FieldOptions[T]>
}
