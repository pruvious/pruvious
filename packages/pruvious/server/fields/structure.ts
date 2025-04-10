import {
  defineField,
  resolveCustomComponentPath,
  walkFieldLayoutItems,
  type CombinedFieldOptions,
  type FieldsLayout,
  type GenericDatabase,
  type ResolveFieldUIOptions,
  type TranslatableStringCallbackContext,
} from '#pruvious/server'
import {
  Field,
  structureFieldModel,
  type ArrayFieldModelOptions,
  type ConditionalLogic,
  type ExtractCastedStructureTypes,
  type ExtractPopulatedStructureTypes,
  type ExtractStructureInput,
  type FieldModel,
  type GenericField,
} from '@pruvious/orm'
import { isArray, isDefined, isObject, setProperty } from '@pruvious/utils'
import { hash } from 'ohash'
import type { PropType } from 'vue'
import type { ResolveFromLayersResult } from '../../modules/pruvious/utils/resolve'

interface CustomOptions<TStructure extends { [$key: string]: Record<string, GenericField> }> {
  /**
   * A map of key-value objects describing each item of this structure.
   *
   * - Map keys are unique item identifiers (keys).
   *   - These keys will be included in the field value (which is an array of objects).
   *   - Each object in the array will contain an additional `$key` property.
   * - Map values are subfield definition objects where:
   *   - Keys represent subfield names.
   *   - Values are `Field` class instances.
   *
   * @example
   * ```ts
   * {
   *   image: {
   *     src: textField({}),
   *     alt: textField({}),
   *   },
   *   video: {
   *     src: textField({}),
   *     autoplay: switchField({}),
   *   },
   * }
   *
   * // Example value:
   * [
   *   { $key: 'image', src: 'https://example.com/image-1.jpg', alt: 'Foo' },
   *   { $key: 'image', src: 'https://example.com/image-2.jpg', alt: 'Bar' },
   *   { $key: 'video', src: 'https://example.com/video.mp4', autoplay: true },
   * ]
   * ```
   */
  structure: TStructure

  ui?: {
    /**
     * Sets the label for the "Add item" button in the structure.
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
     * label: 'Add media item'
     *
     * // Function (translatable)
     * label: ({ __ }) => __('pruvious-dashboard', 'Add media item')
     * ```
     *
     * @default
     * ({ __ }) => __('pruvious-dashboard', 'Add media item')
     */
    addItemLabel?: string | ((context: TranslatableStringCallbackContext) => string)

    /**
     * Optional header configuration for each item in the structure.
     *
     * - Object keys are unique item identifiers (keys).
     * - Object values are header configuration objects.
     *
     * By default, the item order numbers and `itemLabels` are shown in the headers.
     *
     * @default undefined
     */
    header?:
      | {
          [K in keyof TStructure]?: {
            /**
             * Controls whether item order numbers appear in the structure item header.
             *
             * @default true
             */
            showItemNumber?: boolean

            /**
             * Controls whether to show `itemLabels` in the structure item header.
             *
             * @default true
             */
            showLabel?: boolean

            /**
             * Displays the value of a specified subfield in the structure item header.
             * Set to `false` to hide subfield values.
             *
             * @default false
             */
            subfieldValue?: (keyof TStructure[K] & string) | false
          }
        }
      | undefined

    /**
     * Sets the display label for each item in the structure by its key.
     *
     * If not specified, the item key will be automatically transformed to Title case and used as the label.
     * The resulting label is wrapped in the translation function `__('pruvious-dashboard', label)`.
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
     * {
     *   image: 'Image',
     *   video: 'Video',
     * }
     *
     * // Function (translatable)
     * {
     *   image: ({ __ }) => __('pruvious-dashboard', 'Image'),
     *   video: ({ __ }) => __('pruvious-dashboard', 'Video'),
     * }
     *
     * // Key transformation (default)
     * // Example: the item key `vimeoVideo` is transformed into `__('pruvious-dashboard', 'Vimeo video')`
     * itemLabels: {
     *   vimeoVideo: undefined,
     * }
     * ```
     */
    itemLabels?: {
      [K in keyof TStructure]?: string | ((context: TranslatableStringCallbackContext) => string)
    }

    /**
     * Customizes the layout of the structure's subfields in the dashboard.
     *
     * - Object keys are unique item identifiers (keys).
     * - Object values are layout configuration objects.
     *
     * If not specified, the subfields are stacked vertically in the order they are defined.
     *
     * @default undefined
     *
     * @example
     * ```ts
     * {
     *   myStructureItemKey: [
     *     // Single field
     *     'email',
     *
     *     // Half-width field (max-width: 50%)
     *     'firstName | 50%',
     *
     *     // Auto-width field { width: 'auto', flexShrink: 0 }
     *     'middleName | auto',
     *
     *     // Field with custom component styles
     *     {
     *       field: {
     *         name: 'lastName',
     *         style: { maxWidth: '50%' },
     *       },
     *     },
     *
     *     // Field group (row)
     *     {
     *       row: [
     *         // Has maximum width of 8rem
     *         'countryCode | 8rem',
     *
     *         // Takes up the remaining space
     *         'phone',
     *       ],
     *     },
     *
     *     // Horizontal rule
     *     '---',
     *
     *     // Field group (tabs)
     *     {
     *       tabs: [
     *         {
     *           label: ({ __ }) => __('pruvious-dashboard', 'Address'),
     *           fields: ['street | 40%', 'city | 40%', 'zipCode'],
     *         },
     *         {
     *           label: ({ __ }) => __('pruvious-dashboard', 'Contact'),
     *           fields: [
     *             {
     *               // Custom Vue component
     *               // - The component must be resolved using `resolvePruviousComponent()`
     *               //   or `resolveNamedPruviousComponent()`.
     *               // - The import path must be a literal string, not a variable.
     *               // - The import path can be an absolute or relative to the definition file.
     *               component: resolvePruviousComponent('>/components/Dashboard/ContactForm.vue'),
     *             },
     *           ],
     *         },
     *       ],
     *     },
     *
     *     // Card group
     *     {
     *       card: ['comments', 'assignedTo'],
     *     },
     *   ]
     * }
     * ```
     */
    subfieldsLayout?: { [K in keyof TStructure]?: FieldsLayout<keyof TStructure[K] & string> } | undefined
  }
}

type ExtractClientStructure<T extends { [$key: string]: Record<string, { field: GenericField }> }> = {
  [K1 in keyof T]: { [K2 in keyof T[K1]]: T[K1][K2]['field'] }
}

const customOptions: CustomOptions<{ [$key: string]: Record<string, GenericField> }> = {
  structure: {},
  ui: {
    addItemLabel: ({ __ }) => __('pruvious-dashboard', 'Add item'),
    header: undefined,
    itemLabels: undefined,
    subfieldsLayout: undefined,
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
    TStructure extends { [$key: string]: Record<string, GenericField> },
    TCastedType extends ExtractCastedStructureTypes<TStructure>[] = ExtractCastedStructureTypes<TStructure>[],
    TPopulatedType extends ExtractPopulatedStructureTypes<TStructure>[] = ExtractPopulatedStructureTypes<TStructure>[],
  >(
    options: CombinedFieldOptions<
      FieldModel<
        ArrayFieldModelOptions<TCastedType, TPopulatedType>,
        'text',
        TCastedType,
        TPopulatedType,
        ExtractStructureInput<TStructure>,
        undefined,
        TStructure
      >,
      ArrayFieldModelOptions<TCastedType, TPopulatedType> &
        CustomOptions<TStructure> &
        ResolveFieldUIOptions<undefined>,
      false,
      TRequired,
      TImmutable,
      TAutoGenerated,
      TConditionalLogic,
      GenericDatabase
    >,
  ): Field<
    FieldModel<
      ArrayFieldModelOptions<TCastedType, TPopulatedType>,
      'text',
      TCastedType,
      TPopulatedType,
      ExtractStructureInput<TStructure>,
      undefined,
      TStructure
    >,
    ArrayFieldModelOptions<TCastedType, TPopulatedType> & CustomOptions<TStructure> & ResolveFieldUIOptions<undefined>,
    false,
    TRequired,
    TImmutable,
    TAutoGenerated,
    TConditionalLogic,
    GenericDatabase
  > {
    const { location }: { fieldType: string; location: ResolveFromLayersResult } = this as any

    if (isDefined(customOptions.ui?.subfieldsLayout)) {
      for (const layout of Object.values(customOptions.ui.subfieldsLayout)) {
        if (isArray(layout)) {
          for (const { item, path } of walkFieldLayoutItems(layout)) {
            if (isObject(item) && 'component' in item) {
              setProperty(
                customOptions.ui.subfieldsLayout,
                `${path}.component`,
                item.component.includes('/')
                  ? hash(
                      resolveCustomComponentPath({
                        component: item.component,
                        file: location.file.absolute,
                        srcDir: location.layer.config.srcDir,
                      }),
                    )
                  : item.component,
              )
            }
          }
        }
      }
    }

    const bound = defineField({
      model: structureFieldModel(options.structure),
      customOptions,
      castedTypeFn: () =>
        `(${Object.entries(options.structure)
          .map(
            ([key, item]) =>
              `{ $key: '${key}', ${Object.entries(item)
                .map(([subfieldName, subfield]) => `${subfieldName}: ${(subfield as any).castedTypeFn(subfield)}`)
                .join(', ')} }`,
          )
          .join(' | ')})[]`,
      populatedTypeFn: () =>
        `(${Object.entries(options.structure)
          .map(
            ([key, item]) =>
              `{ $key: '${key}', ${Object.entries(item)
                .map(([subfieldName, subfield]) => `${subfieldName}: ${(subfield as any).populatedTypeFn(subfield)}`)
                .join(', ')} }`,
          )
          .join(' | ')})[]`,
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
    const TClienTStructure extends { [$key: string]: Record<string, { field: GenericField }> },
    const TStructure extends {
      [$key: string]: Record<string, GenericField>
    } = ExtractClientStructure<TClienTStructure>,
    TCastedType extends ExtractCastedStructureTypes<TStructure>[] = ExtractCastedStructureTypes<TStructure>[],
    TPopulatedType extends ExtractPopulatedStructureTypes<TStructure>[] = ExtractPopulatedStructureTypes<TStructure>[],
  >(
    options: CombinedFieldOptions<
      FieldModel<
        ArrayFieldModelOptions<TCastedType, TPopulatedType>,
        'text',
        TCastedType,
        TPopulatedType,
        ExtractStructureInput<TStructure>,
        undefined,
        TStructure
      >,
      ArrayFieldModelOptions<TCastedType, TPopulatedType> &
        // @ts-expect-error
        CustomOptions<TClienTStructure> &
        ResolveFieldUIOptions<undefined>,
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
        ArrayFieldModelOptions<TCastedType, TPopulatedType>,
        'text',
        TCastedType,
        TPopulatedType,
        ExtractStructureInput<TStructure>,
        undefined,
        TStructure
      >,
      ArrayFieldModelOptions<TCastedType, TPopulatedType> &
        // @ts-expect-error
        CustomOptions<TClienTStructure> &
        ResolveFieldUIOptions<undefined>,
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
      ArrayFieldModelOptions<Record<string, any>, Record<string, any>>,
      'text',
      Record<string, any>,
      Record<string, any>,
      ExtractStructureInput<{ [$key: string]: Record<string, GenericField> }>,
      undefined,
      { [$key: string]: Record<string, GenericField> }
    >,
    ArrayFieldModelOptions<Record<string, any>, Record<string, any>> &
      CustomOptions<{ [$key: string]: Record<string, GenericField> }> &
      ResolveFieldUIOptions<undefined>,
    false,
    boolean,
    boolean,
    boolean,
    ConditionalLogic | undefined,
    GenericDatabase
  >,
}
