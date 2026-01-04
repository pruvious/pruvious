import {
  defineField,
  limitPopulation,
  type CombinedFieldOptions,
  type DynamicCollectionFieldTypes,
  type GenericDatabase,
  type OptimizableImageType,
  type ResolveFieldUIOptions,
  type TranslatableStringCallbackContext,
} from '#pruvious/server'
import {
  bigIntFieldModel,
  type BigIntFieldModelOptions,
  type ConditionalLogic,
  type Field,
  type FieldModel,
} from '@pruvious/orm'
import { formatBytes, isNull, parseBytes, toArray, type DefaultFalse, type NonEmptyArray } from '@pruvious/utils'
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
     * Text for the select button that opens the media library.
     *
     * You can either provide a string or a function that returns a string.
     * The function receives an object with `_` and `__` properties to access the translation functions.
     *
     * Important: When using a function, only use simple anonymous functions without context binding,
     * since the option needs to be serialized for client-side use.
     *
     * @example
     * ```ts
     * // String (non-translatable)
     * label: 'Select background'
     *
     * // Function (translatable)
     * label: ({ __ }) => __('pruvious-dashboard', 'Select background')
     * ```
     *
     * @default
     * ({ __ }) => __('pruvious-dashboard', 'Select image')
     */
    selectLabel?: string | ((context: TranslatableStringCallbackContext) => string)

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
     *   showThumbnail: true,
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
           * Whether to show a thumbnail preview of the image in the data table.
           *
           * @default true
           */
          showThumbnail?: boolean
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
  ui: {
    selectLabel: ({ __ }) => __('pruvious-dashboard', 'Select image'),
  },
}

export default {
  /**
   * Creates a new `Field` instance.
   *
   * This function is intended for server-side use in collection definitions.
   * For client-side usage, import the equivalent function from `#pruvious/client`.
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
    options: Omit<
      CombinedFieldOptions<
        FieldModel<
          BigIntFieldModelOptions<number, TPopulatedType>,
          'bigint',
          number,
          TPopulatedType,
          number | string,
          undefined,
          undefined
        >,
        BigIntFieldModelOptions<number, TPopulatedType> &
          CustomOptions<TFields, TPopulate> &
          ResolveFieldUIOptions<{ dataTable: false }>,
        true,
        TRequired,
        TImmutable,
        TAutoGenerated,
        TConditionalLogic,
        GenericDatabase
      >,
      'min' | 'max'
    >,
  ): Field<
    FieldModel<
      BigIntFieldModelOptions<number, TPopulatedType>,
      'bigint',
      number,
      TPopulatedType,
      number | string,
      undefined,
      undefined
    >,
    BigIntFieldModelOptions<number, TPopulatedType> &
      CustomOptions<TFields, TPopulate> &
      ResolveFieldUIOptions<{ dataTable: false }>,
    true,
    TRequired,
    TImmutable,
    TAutoGenerated,
    TConditionalLogic,
    GenericDatabase
  > {
    const bound = defineField({
      model: bigIntFieldModel<number, TPopulatedType>(),
      nullable: true,
      default: null,
      customOptions: { ...customOptions, min: 1 },
      validators: [
        async (value, { context }) => {
          if (!isNull(value)) {
            const query = await context.database
              .queryBuilder()
              .selectFrom('Uploads')
              .select(['mime', 'size', 'imageWidth', 'imageHeight'])
              .where('id', '=', value)
              .useCache(context.cache)
              .first()

            if (!query.success) {
              throw new Error(
                context.__('pruvious-api', `Failed to verify existence of ID \`$id\` in collection \`$collection\``, {
                  id: value,
                  collection: 'Uploads',
                }),
              )
            } else if (!query.data) {
              throw new Error(context.__('pruvious-api', 'Record does not exist'))
            }
          }
        },
        async (value, { definition, context }) => {
          if (!isNull(value)) {
            const allowedMimes = toArray(definition.options.allowedTypes)

            if (allowedMimes.includes('*')) {
              return
            }

            const query = await context.database
              .queryBuilder()
              .selectFrom('Uploads')
              .select(['mime', 'size', 'imageWidth', 'imageHeight'])
              .where('id', '=', value)
              .useCache(context.cache)
              .first()

            if (query.success && query.data && !allowedMimes.includes(query.data.mime)) {
              throw new Error(context.__('pruvious-api', 'This file type is not allowed'))
            }
          }
        },
        async (value, { definition, context }) => {
          if (!isNull(value)) {
            const minBytes = parseBytes(definition.options.minSize)
            const maxBytes = parseBytes(definition.options.maxSize)

            if (minBytes > 0 || maxBytes > 0) {
              const query = await context.database
                .queryBuilder()
                .selectFrom('Uploads')
                .select(['mime', 'size', 'imageWidth', 'imageHeight'])
                .where('id', '=', value)
                .useCache(context.cache)
                .first()

              if (query.success && query.data) {
                if (minBytes > 0 && query.data.size < minBytes) {
                  throw new Error(
                    context.__('pruvious-api', 'The file is smaller than the minimum allowed size of $size', {
                      size: formatBytes(minBytes)!,
                    }),
                  )
                } else if (maxBytes > 0 && query.data.size > maxBytes) {
                  throw new Error(
                    context.__('pruvious-api', 'The file exceeds the maximum allowed size of $size', {
                      size: formatBytes(maxBytes)!,
                    }),
                  )
                }
              }
            }
          }
        },
        async (value, { definition, context }) => {
          if (!isNull(value)) {
            const { minWidth, maxWidth, minHeight, maxHeight } = definition.options

            if (minWidth > 0 || maxWidth > 0 || minHeight > 0 || maxHeight > 0) {
              const query = await context.database
                .queryBuilder()
                .selectFrom('Uploads')
                .select(['mime', 'size', 'imageWidth', 'imageHeight'])
                .where('id', '=', value)
                .useCache(context.cache)
                .first()

              if (query.success && query.data) {
                const { imageWidth, imageHeight } = query.data

                if (minWidth > 0 && imageWidth < minWidth) {
                  throw new Error(
                    context.__('pruvious-api', 'The image width must not be less than $minWidth', {
                      minWidth: `${minWidth}px`,
                    }),
                  )
                } else if (maxWidth > 0 && imageWidth > maxWidth) {
                  throw new Error(
                    context.__('pruvious-api', 'The image width must not exceed $maxWidth', {
                      maxWidth: `${maxWidth}px`,
                    }),
                  )
                }

                if (minHeight > 0 && imageHeight < minHeight) {
                  throw new Error(
                    context.__('pruvious-api', 'The image height must not be less than $minHeight', {
                      minHeight: `${minHeight}px`,
                    }),
                  )
                } else if (maxHeight > 0 && imageHeight > maxHeight) {
                  throw new Error(
                    context.__('pruvious-api', 'The image height must not exceed $maxHeight', {
                      maxHeight: `${maxHeight}px`,
                    }),
                  )
                }
              }
            }
          }
        },
      ],
      populator: async (value, contextField) => {
        if (isNull(value)) {
          return null
        }

        const { definition, context } = contextField
        const deepPopulate = definition.options.populate

        if (deepPopulate) {
          limitPopulation(value, contextField)
        }

        const queryBuilder = context.database
          .queryBuilder()
          .selectFrom('Uploads')
          .where('id', '=', value)
          .select(definition.options.fields)
          .useCache(context.cache)

        if (deepPopulate) {
          queryBuilder.populate()
        }

        const query = await queryBuilder.first()

        return (query.success ? query.data : null) as any
      },
      omitOptions: ['min', 'max'],
      populatedTypeFn: ({ field }) =>
        `Pick<DynamicCollectionFieldTypes[${field.options.populate ? "'Populated'" : "'Casted'"}]['Uploads'], ${(field.options.fields ?? ['id']).map((fieldName: string) => `'${fieldName}'`).join(' | ')}> | null`,
    }).serverFn.bind(this)
    return bound(options as any) as any
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
    options: Omit<
      CombinedFieldOptions<
        FieldModel<
          BigIntFieldModelOptions<number, TPopulatedType>,
          'bigint',
          number,
          TPopulatedType,
          number | string,
          undefined,
          undefined
        >,
        BigIntFieldModelOptions<number, TPopulatedType> &
          CustomOptions<TFields, TPopulate> &
          ResolveFieldUIOptions<{ dataTable: false }>,
        true,
        TRequired,
        TImmutable,
        TAutoGenerated,
        TConditionalLogic,
        GenericDatabase
      >,
      'min' | 'max'
    >,
  ): { type: PropType<TPopulatedType>; required: true } & {
    field: Field<
      FieldModel<
        BigIntFieldModelOptions<number, TPopulatedType>,
        'bigint',
        number,
        TPopulatedType,
        number | string,
        undefined,
        undefined
      >,
      BigIntFieldModelOptions<number, TPopulatedType> &
        CustomOptions<TFields, TPopulate> &
        ResolveFieldUIOptions<{ dataTable: false }>,
      true,
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
  TOptions: undefined as unknown as Omit<
    CombinedFieldOptions<
      FieldModel<
        BigIntFieldModelOptions<number, Record<string, any>>,
        'bigint',
        number,
        Record<string, any>,
        number | string,
        undefined,
        undefined
      >,
      BigIntFieldModelOptions<number, Record<string, any>> &
        CustomOptions<any, boolean | undefined> &
        ResolveFieldUIOptions<{ dataTable: false }>,
      true,
      boolean,
      boolean,
      boolean,
      ConditionalLogic | undefined,
      GenericDatabase
    >,
    'min' | 'max'
  >,
}
