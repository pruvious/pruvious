import {
  defineField,
  limitPopulation,
  type CombinedFieldOptions,
  type DynamicCollectionFieldTypes,
  type GenericDatabase,
  type OptimizableImageType,
  type ResolveFieldUIOptions,
} from '#pruvious/server'
import {
  junctionFieldModel,
  matrixFieldModel,
  type ConditionalLogic,
  type Field,
  type FieldModel,
  type MatrixFieldModelOptions,
  type Populator,
  type Validator,
} from '@pruvious/orm'
import {
  formatBytes,
  isArray,
  isEmpty,
  isPositiveInteger,
  parseBytes,
  promiseAllInBatches,
  toArray,
  uniqueArray,
  type DefaultFalse,
  type NonEmptyArray,
} from '@pruvious/utils'
import type { PropType } from 'vue'

interface CustomOptions<
  TFields extends keyof DynamicCollectionFieldTypes['Casted' | 'Populated']['Uploads'],
  TPopulate extends boolean | undefined,
> {
  /**
   * Fields to return from the `Uploads` collection when populating this field.
   *
   * @default
   * ['id', 'path', 'mime', 'size', 'description', 'imageWidth', 'imageHeight']
   */
  fields?: NonEmptyArray<TFields & string>

  /**
   * Controls whether to populate the selected `fields` from the `Uploads` collection.
   *
   * @default true
   */
  populate?: TPopulate

  /**
   * Specifies which file types are allowed.
   *
   * You can provide:
   *
   * - A single string or an array of strings with specific MIME types (e.g., `['image/png', 'image/jpeg']`)
   * - The wildcard `'*'` to allow all file types
   *
   * @default
   * [
   *   'image/jpeg',
   *   'image/png',
   *   'image/gif',
   *   'image/webp',
   *   'image/svg+xml',
   *   'image/avif',
   * ]
   */
  allowedTypes?: OptimizableImageType | (string & {}) | (OptimizableImageType | (string & {}))[] | '*'

  /**
   * Minimum allowed file size.
   * You can provide a number (in bytes) or a human-readable string (e.g. '1 KB', '5 MB', '2 GB').
   * By default, no minimum size is enforced (`0`).
   *
   * @default 0
   *
   * @example
   * ```ts
   * // 1 KB
   * minSize: 1024
   *
   * // 5 MB
   * minSize: '5 MB'
   * ```
   */
  minSize?: number | string

  /**
   * Maximum allowed file size.
   * You can provide a number (in bytes) or a human-readable string (e.g. '1 KB', '5 MB', '2 GB').
   * By default, there is no size limit (`0`).
   *
   * @default 0
   *
   * @example
   * ```ts
   * // 1 MB
   * maxSize: 1048576
   *
   * // 5 MB
   * maxSize: '5 MB'
   *
   * // No limit
   * maxSize: 0
   * ```
   */
  maxSize?: number | string

  /**
   * Minimum allowed image width in pixels.
   * By default, no minimum width is enforced (`0`).
   *
   * @default 0
   */
  minWidth?: number

  /**
   * Maximum allowed image width in pixels.
   * By default, there is no width limit (`0`).
   *
   * @default 0
   */
  maxWidth?: number

  /**
   * Minimum allowed image height in pixels.
   * By default, no minimum height is enforced (`0`).
   *
   * @default 0
   */
  minHeight?: number

  /**
   * Maximum allowed image height in pixels.
   * By default, there is no height limit (`0`).
   *
   * @default 0
   */
  maxHeight?: number

  ui?: {
    /**
     * Configuration options for how this field behaves when displayed in a data table.
     * Controls visibility, sorting, and filtering capabilities.
     *
     * You can provide either an object with specific settings or a boolean to enable/disable all options at once.
     *
     * @default
     * {
     *   visible: true,
     *   sortable: true,
     *   filterable: true,
     *   showThumbnails: true,
     * }
     */
    dataTable?:
      | {
          /**
           * Whether this field should be visible as a column in the data table.
           *
           * @default true
           */
          visible?: boolean

          /**
           * Whether this field can be sorted in the data table.
           *
           * @default true
           */
          sortable?: boolean

          /**
           * Whether this field can be filtered in the data table.
           *
           * @default true
           */
          filterable?: boolean

          /**
           * Controls whether small image previews (thumbnails) appear in the data table.
           *
           * @default true
           */
          showThumbnails?: boolean
        }
      | boolean
      | undefined
  }
}

const customOptions: CustomOptions<keyof DynamicCollectionFieldTypes['Casted' | 'Populated']['Uploads'], boolean> = {
  fields: ['id', 'path', 'mime', 'size', 'description', 'imageWidth', 'imageHeight'],
  populate: true,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'],
  minSize: 0,
  maxSize: 0,
  minWidth: 0,
  maxWidth: 0,
  minHeight: 0,
  maxHeight: 0,
}

export default {
  /**
   * Creates a new `Field` instance.
   *
   * This function is intended for server-side use in collection definitions.
   * For client-side usage, import the equivalent function from `#pruvious/app`.
   */
  serverFn: function <
    const TRequired extends boolean | undefined,
    const TImmutable extends boolean | undefined,
    const TAutoGenerated extends boolean | undefined,
    TConditionalLogic extends ConditionalLogic | undefined,
    TFields extends keyof DynamicCollectionFieldTypes['Casted' | 'Populated']['Uploads'],
    TPopulate extends boolean | undefined,
    TPopulatedType = Pick<
      DynamicCollectionFieldTypes[DefaultFalse<TPopulate> extends true ? 'Populated' : 'Casted']['Uploads'],
      TFields
    > | null,
  >(
    options: CombinedFieldOptions<
      FieldModel<
        MatrixFieldModelOptions<number[], TPopulatedType>,
        'matrix',
        number[],
        TPopulatedType,
        (number | string)[],
        undefined,
        undefined
      >,
      Omit<MatrixFieldModelOptions<number[], TPopulatedType>, 'deduplicateItems' | 'enforceUniqueItems'> &
        CustomOptions<TFields, TPopulate> &
        ResolveFieldUIOptions<{ placeholder: true; dataTable: false }>,
      false,
      TRequired,
      TImmutable,
      TAutoGenerated,
      TConditionalLogic,
      GenericDatabase
    >,
  ): Field<
    FieldModel<
      MatrixFieldModelOptions<number[], TPopulatedType>,
      'matrix',
      number[],
      TPopulatedType,
      (number | string)[],
      undefined,
      undefined
    >,
    Omit<MatrixFieldModelOptions<number[], TPopulatedType>, 'deduplicateItems' | 'enforceUniqueItems'> &
      CustomOptions<TFields, TPopulate> &
      ResolveFieldUIOptions<{ placeholder: true; dataTable: false }>,
    false,
    TRequired,
    TImmutable,
    TAutoGenerated,
    TConditionalLogic,
    GenericDatabase
  > {
    const uiOptions = { placeholder: true }

    const validators: Validator<
      FieldModel<
        MatrixFieldModelOptions<number[], TPopulatedType>,
        'matrix',
        number[],
        TPopulatedType,
        (number | string)[],
        undefined,
        undefined
      >,
      Omit<MatrixFieldModelOptions<number[], TPopulatedType>, 'deduplicateItems' | 'enforceUniqueItems'> &
        CustomOptions<TFields, TPopulate> &
        ResolveFieldUIOptions<{ placeholder: true; dataTable: false }>,
      false,
      boolean,
      boolean,
      boolean,
      ConditionalLogic | undefined,
      GenericDatabase
    >[] = [
      (value, { context, path }, errors) => {
        let hasErrors = false

        for (const [i, id] of value.entries()) {
          if (!isPositiveInteger(id)) {
            errors[`${path}.${i}`] = context.__('pruvious-api', 'The ID must be a positive integer')
            hasErrors = true
          }
        }

        if (hasErrors) {
          throw new Error(context.__('pruvious-orm', 'This field contains invalid values'))
        }
      },
      async (value, { context, path }, errors) => {
        let hasErrors = false

        if (!isEmpty(value)) {
          const chunks: number[][] = []

          for (let i = 0; i < value.length; i += 80) {
            chunks.push(value.slice(i, i + 80))
          }

          const queries = await promiseAllInBatches(
            chunks.map(
              (chunk) => () =>
                context.database
                  .queryBuilder()
                  .selectFrom('Uploads')
                  .select(['id', 'mime', 'size', 'imageWidth', 'imageHeight'])
                  .where('id', 'in', chunk)
                  .useCache(context.cache)
                  .all(),
            ),
            50,
          )

          if (queries.every((query) => query.success)) {
            const ids: number[] = queries.flatMap((query) => query.data.map((record) => (record as any).id))

            for (const [i, id] of value.entries()) {
              if (!ids.includes(id)) {
                errors[`${path}.${i}`] = context.__('pruvious-api', 'Record does not exist')
                hasErrors = true
              }
            }
          } else {
            const runtimeError = queries.find((query) => query.runtimeError)?.runtimeError

            if (runtimeError) {
              errors[path] = runtimeError
              hasErrors = true
            } else {
              errors[path] = context.__('pruvious-orm', 'An unknown error occurred')
              hasErrors = true
            }
          }
        }

        if (hasErrors) {
          throw new Error(context.__('pruvious-api', 'This field contains non-existent records'))
        }
      },
      async (value, { definition, context, path }, errors) => {
        let hasErrors = false

        if (!isEmpty(value)) {
          const allowedMimes = toArray(definition.options.allowedTypes)

          if (!allowedMimes.includes('*')) {
            const chunks: number[][] = []

            for (let i = 0; i < value.length; i += 80) {
              chunks.push(value.slice(i, i + 80))
            }

            const queries = await promiseAllInBatches(
              chunks.map(
                (chunk) => () =>
                  context.database
                    .queryBuilder()
                    .selectFrom('Uploads')
                    .select(['id', 'mime', 'size', 'imageWidth', 'imageHeight'])
                    .where('id', 'in', chunk)
                    .useCache(context.cache)
                    .all(),
              ),
              50,
            )

            if (queries.every((query) => query.success)) {
              const records: { id: number; mime: string }[] = queries.flatMap((query) =>
                query.data.map((record) => record as any),
              )

              for (const [i, id] of value.entries()) {
                const record = records.find((record) => record.id === id)

                if (record && !allowedMimes.includes(record.mime)) {
                  errors[`${path}.${i}`] = context.__('pruvious-api', 'This file type is not allowed')
                  hasErrors = true
                }
              }
            } else {
              const runtimeError = queries.find((query) => query.runtimeError)?.runtimeError

              if (runtimeError) {
                errors[path] = runtimeError
                hasErrors = true
              } else {
                errors[path] = context.__('pruvious-orm', 'An unknown error occurred')
                hasErrors = true
              }
            }
          }
        }

        if (hasErrors) {
          throw new Error(context.__('pruvious-api', 'Invalid input'))
        }
      },
      async (value, { definition, context, path }, errors) => {
        let hasErrors = false

        if (!isEmpty(value)) {
          const minBytes = parseBytes(definition.options.minSize)
          const maxBytes = parseBytes(definition.options.maxSize)

          if (minBytes > 0 || maxBytes > 0) {
            const chunks: number[][] = []

            for (let i = 0; i < value.length; i += 80) {
              chunks.push(value.slice(i, i + 80))
            }

            const queries = await promiseAllInBatches(
              chunks.map(
                (chunk) => () =>
                  context.database
                    .queryBuilder()
                    .selectFrom('Uploads')
                    .select(['id', 'mime', 'size', 'imageWidth', 'imageHeight'])
                    .where('id', 'in', chunk)
                    .useCache(context.cache)
                    .all(),
              ),
              50,
            )

            if (queries.every((query) => query.success)) {
              const records: { id: number; size: number }[] = queries.flatMap((query) =>
                query.data.map((record) => record as any),
              )

              for (const [i, id] of value.entries()) {
                const record = records.find((record) => record.id === id)

                if (record) {
                  if (minBytes > 0 && record.size < minBytes) {
                    errors[`${path}.${i}`] = context.__(
                      'pruvious-api',
                      'The file is smaller than the minimum allowed size of $size',
                      {
                        size: formatBytes(minBytes)!,
                      },
                    )
                    hasErrors = true
                  } else if (maxBytes > 0 && record.size > maxBytes) {
                    errors[`${path}.${i}`] = context.__(
                      'pruvious-api',
                      'The file exceeds the maximum allowed size of $size',
                      {
                        size: formatBytes(maxBytes)!,
                      },
                    )
                    hasErrors = true
                  }
                }
              }
            } else {
              const runtimeError = queries.find((query) => query.runtimeError)?.runtimeError

              if (runtimeError) {
                errors[path] = runtimeError
                hasErrors = true
              } else {
                errors[path] = context.__('pruvious-orm', 'An unknown error occurred')
                hasErrors = true
              }
            }

            if (hasErrors) {
              throw new Error(context.__('pruvious-api', 'Invalid input'))
            }
          }
        }
      },
      async (value, { definition, context, path }, errors) => {
        let hasErrors = false

        if (!isEmpty(value)) {
          const { minWidth, maxWidth, minHeight, maxHeight } = definition.options

          if (minWidth > 0 || maxWidth > 0 || minHeight > 0 || maxHeight > 0) {
            const chunks: number[][] = []

            for (let i = 0; i < value.length; i += 80) {
              chunks.push(value.slice(i, i + 80))
            }

            const queries = await promiseAllInBatches(
              chunks.map(
                (chunk) => () =>
                  context.database
                    .queryBuilder()
                    .selectFrom('Uploads')
                    .select(['id', 'mime', 'size', 'imageWidth', 'imageHeight'])
                    .where('id', 'in', chunk)
                    .useCache(context.cache)
                    .all(),
              ),
              50,
            )

            if (queries.every((query) => query.success)) {
              const records: { id: number; imageWidth: number; imageHeight: number }[] = queries.flatMap((query) =>
                query.data.map((record) => record as any),
              )

              for (const [i, id] of value.entries()) {
                const record = records.find((record) => record.id === id)

                if (record) {
                  const { imageWidth, imageHeight } = record

                  if (minWidth > 0 && imageWidth < minWidth) {
                    errors[`${path}.${i}`] = context.__(
                      'pruvious-api',
                      'The image width must not be less than $minWidth',
                      {
                        minWidth: `${minWidth}px`,
                      },
                    )
                    hasErrors = true
                  } else if (maxWidth > 0 && imageWidth > maxWidth) {
                    errors[`${path}.${i}`] = context.__('pruvious-api', 'The image width must not exceed $maxWidth', {
                      maxWidth: `${maxWidth}px`,
                    })
                    hasErrors = true
                  }

                  if (minHeight > 0 && imageHeight < minHeight) {
                    errors[`${path}.${i}`] = context.__(
                      'pruvious-api',
                      'The image height must not be less than $minHeight',
                      {
                        minHeight: `${minHeight}px`,
                      },
                    )
                    hasErrors = true
                  } else if (maxHeight > 0 && imageHeight > maxHeight) {
                    errors[`${path}.${i}`] = context.__('pruvious-api', 'The image height must not exceed $maxHeight', {
                      maxHeight: `${maxHeight}px`,
                    })
                    hasErrors = true
                  }
                }
              }
            } else {
              const runtimeError = queries.find((query) => query.runtimeError)?.runtimeError

              if (runtimeError) {
                errors[path] = runtimeError
                hasErrors = true
              } else {
                errors[path] = context.__('pruvious-orm', 'An unknown error occurred')
                hasErrors = true
              }
            }
          }
        }

        if (hasErrors) {
          throw new Error(context.__('pruvious-api', 'Invalid input'))
        }
      },
    ]

    const populator: Populator<number[], TPopulatedType> = async (value, contextField) => {
      if (!isEmpty(value)) {
        const { definition, context } = contextField
        const deepPopulate = definition.options.populate

        if (deepPopulate) {
          limitPopulation(value, contextField)
        }

        const chunks: number[][] = []

        for (let i = 0; i < value.length; i += 80) {
          chunks.push(value.slice(i, i + 80))
        }

        const queries = await promiseAllInBatches(
          chunks.map((chunk) => () => {
            const queryBuilder = context.database
              .queryBuilder()
              .selectFrom('Uploads')
              .select(definition.options.fields)
              .where('id', 'in', chunk)
              .useCache(context.cache)
            return deepPopulate ? queryBuilder.populate().all() : queryBuilder.all()
          }),
          50,
        )

        if (queries.every((query) => query.success)) {
          return queries.flatMap((query) => query.data) as any
        }
      }

      return []
    }

    const castedTypeFn = () => 'number[]'
    const populatedTypeFn = ({ field }: any) =>
      `Pick<DynamicCollectionFieldTypes[${field.options.populate ? "'Populated'" : "'Casted'"}]['Uploads'], ${(field.options.fields ?? ['id']).map((fieldName: string) => `'${fieldName}'`).join(' | ')}>[]`
    const inputTypeFn = () => '(number | string)[]'

    const bound = defineField({
      model: matrixFieldModel<'number', number, number[], TPopulatedType>(),
      customOptions: {
        ...customOptions,
        deduplicateItems: true,
        enforceUniqueItems: true,
        _collectionFieldTransformFn: undefined,
      },
      omitOptions: ['deduplicateItems', 'enforceUniqueItems'],
      uiOptions,
      validators,
      populator: populator as any,
      castedTypeFn,
      populatedTypeFn,
      inputTypeFn,
    }).serverFn.bind(this)
    return bound({
      ...(options as any),
      _collectionFieldTransformFn: () =>
        defineField({
          model: junctionFieldModel<'Uploads', number[], TPopulatedType, (string | number)[]>('Uploads'),
          sanitizers: [(value) => (isArray(value) ? uniqueArray(value) : value)],
          customOptions: { ...customOptions, referenceCollection: 'Uploads' },
          omitOptions: ['referencedCollection', 'inverseField'] as any,
          uiOptions,
          validators: validators as any,
          populator: populator as any,
          castedTypeFn,
          populatedTypeFn,
          inputTypeFn,
        }).serverFn.bind(this)(options as any),
    }) as any
  },

  /**
   * Creates a new `Field` instance.
   *
   * This function is intended for client-side use in Vue components.
   * For server-side usage, import the equivalent function from `#pruvious/server`.
   */
  clientFn: function <
    const TRequired extends boolean | undefined,
    const TImmutable extends boolean | undefined,
    const TAutoGenerated extends boolean | undefined,
    TConditionalLogic extends ConditionalLogic | undefined,
    TFields extends keyof DynamicCollectionFieldTypes['Casted' | 'Populated']['Uploads'],
    TPopulate extends boolean | undefined,
    TPopulatedType = Pick<
      DynamicCollectionFieldTypes[DefaultFalse<TPopulate> extends true ? 'Populated' : 'Casted']['Uploads'],
      TFields
    > | null,
  >(
    options: CombinedFieldOptions<
      FieldModel<
        MatrixFieldModelOptions<number[], TPopulatedType>,
        'matrix',
        number[],
        TPopulatedType,
        (number | string)[],
        undefined,
        undefined
      >,
      Omit<MatrixFieldModelOptions<number[], TPopulatedType>, 'deduplicateItems' | 'enforceUniqueItems'> &
        CustomOptions<TFields, TPopulate> &
        ResolveFieldUIOptions<{ placeholder: true; dataTable: false }>,
      false,
      TRequired,
      TImmutable,
      TAutoGenerated,
      TConditionalLogic,
      GenericDatabase
    >,
  ): { type: PropType<TPopulatedType>; required: true } & {
    field: Field<
      FieldModel<
        MatrixFieldModelOptions<number[], TPopulatedType>,
        'matrix',
        number[],
        TPopulatedType,
        (number | string)[],
        undefined,
        undefined
      >,
      Omit<MatrixFieldModelOptions<number[], TPopulatedType>, 'deduplicateItems' | 'enforceUniqueItems'> &
        CustomOptions<TFields, TPopulate> &
        ResolveFieldUIOptions<{ placeholder: true; dataTable: false }>,
      false,
      TRequired,
      TImmutable,
      TAutoGenerated,
      TConditionalLogic,
      GenericDatabase
    >
  } {
    return null as any
  },

  /**
   * Represents the type structure for this field's configuration options.
   *
   * Note: This is a TypeScript type assertion and does not involve any runtime logic or data.
   */
  TOptions: undefined as unknown as CombinedFieldOptions<
    FieldModel<
      MatrixFieldModelOptions<number[], Record<string, any>[]>,
      'matrix',
      number[],
      Record<string, any>[],
      (number | string)[],
      undefined,
      undefined
    >,
    Omit<MatrixFieldModelOptions<number[], Record<string, any>[]>, 'deduplicateItems' | 'enforceUniqueItems'> &
      CustomOptions<any, boolean | undefined> &
      ResolveFieldUIOptions<{ placeholder: true; dataTable: false }>,
    false,
    boolean,
    boolean,
    boolean,
    ConditionalLogic | undefined,
    GenericDatabase
  >,
}
