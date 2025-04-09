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
  repeaterFieldModel,
  type ConditionalLogic,
  type ExtractCastedTypes,
  type ExtractPopulatedTypes,
  type FieldModel,
  type GenericField,
  type RepeaterFieldModelOptions,
  type SubfieldsInput,
} from '@pruvious/orm'
import { isArray, isObject, setProperty } from '@pruvious/utils'
import { hash } from 'ohash'
import type { PropType } from 'vue'
import type { ResolveFromLayersResult } from '../../modules/pruvious/utils/resolve'

interface CustomOptions<TSubfields extends Record<string, GenericField>> {
  /**
   * A key-value object of `Field` instances describing each property of the repeater array items.
   *
   * - Object keys represent the subfield names.
   * - Object values are instances of the `Field` class.
   *
   * @example
   * ```ts
   * {
   *   label: textField({}),
   *   link: linkField({}),
   * }
   *
   * // Example value:
   * [
   *   { label: 'Home', link: '/' },       // @todo update `link` value to be a `Link` instance
   *   { label: 'About', link: '/about' }, // @todo update `link` value to be a `Link` instance
   *   // ...
   * ]
   * ```
   */
  subfields: TSubfields

  ui?: {
    /**
     * Sets the label for the "Add item" button in the repeater.
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
     * label: 'Add menu item'
     *
     * // Function (translatable)
     * label: ({ __ }) => __('pruvious-dashboard', 'Add menu item')
     * ```
     *
     * @default
     * ({ __ }) => __('pruvious-dashboard', 'Add item')
     */
    addItemLabel?: string | ((context: TranslatableStringCallbackContext) => string)

    /**
     * Optional header configuration for the repeater.
     * By default, only the item order numbers are shown in the header.
     *
     * @default
     * {
     *   showItemNumbers: true,
     *   subfieldValue: false,
     * }
     */
    header?: {
      /**
       * Controls whether item order numbers appear in the repeater header.
       *
       * @default true
       */
      showItemNumbers?: boolean

      /**
       * Displays the value of a specified subfield in the repeater header.
       * Set to `false` to hide subfield values.
       *
       * @default false
       */
      subfieldValue?: keyof TSubfields | false
    }

    /**
     * Customizes the layout of the repeater's subfields in the dashboard.
     * If not specified, the subfields are stacked vertically in the order they are defined.
     *
     * @default undefined
     *
     * @example
     * ```ts
     * [
     *   // Single field
     *   'email',
     *
     *   // Half-width field (max-width: 50%)
     *   'firstName | 50%',
     *
     *   // Auto-width field { width: 'auto', flexShrink: 0 }
     *   'middleName | auto',
     *
     *   // Field with custom component styles
     *   {
     *     field: {
     *       name: 'lastName',
     *       style: { maxWidth: '50%' },
     *     },
     *   },
     *
     *   // Field group (row)
     *   {
     *     row: [
     *       // Has maximum width of 8rem
     *       'countryCode | 8rem',
     *
     *       // Takes up the remaining space
     *       'phone',
     *     ],
     *   },
     *
     *   // Horizontal rule
     *   '---',
     *
     *   // Field group (tabs)
     *   {
     *     tabs: [
     *       {
     *         label: ({ __ }) => __('pruvious-dashboard', 'Address'),
     *         fields: ['street | 40%', 'city | 40%', 'zipCode'],
     *       },
     *       {
     *         label: ({ __ }) => __('pruvious-dashboard', 'Contact'),
     *         fields: [
     *           {
     *             // Custom Vue component
     *             // - The component must be resolved using `resolvePruviousComponent()`
     *             //   or `resolveNamedPruviousComponent()`.
     *             // - The import path must be a literal string, not a variable.
     *             // - The import path can be an absolute or relative to the definition file.
     *             component: resolvePruviousComponent('>/components/Dashboard/ContactForm.vue'),
     *           },
     *         ],
     *       },
     *     ],
     *   },
     *
     *   // Card group
     *   {
     *     card: ['comments', 'assignedTo'],
     *   },
     * ]
     * ```
     */
    subfieldsLayout?: FieldsLayout<keyof TSubfields & string> | undefined
  }
}

type ExtractClientSubfields<T extends Record<string, { field: GenericField }>> = {
  [K in keyof T]: T[K]['field']
}

const customOptions: CustomOptions<Record<string, GenericField>> = {
  subfields: {},
  ui: {
    addItemLabel: ({ __ }) => __('pruvious-dashboard', 'Add item'),
    header: {
      showItemNumbers: true,
      subfieldValue: false,
    },
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
    TSubfields extends Record<string, GenericField>,
    TCastedType extends ExtractCastedTypes<TSubfields>[] = ExtractCastedTypes<TSubfields>[],
    TPopulatedType extends ExtractPopulatedTypes<TSubfields>[] = ExtractPopulatedTypes<TSubfields>[],
  >(
    options: CombinedFieldOptions<
      FieldModel<
        RepeaterFieldModelOptions<TCastedType, TPopulatedType>,
        'text',
        TCastedType,
        TPopulatedType,
        SubfieldsInput<TSubfields>[],
        TSubfields,
        undefined
      >,
      RepeaterFieldModelOptions<TCastedType, TPopulatedType> &
        CustomOptions<TSubfields> &
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
      RepeaterFieldModelOptions<TCastedType, TPopulatedType>,
      'text',
      TCastedType,
      TPopulatedType,
      SubfieldsInput<TSubfields>[],
      TSubfields,
      undefined
    >,
    RepeaterFieldModelOptions<TCastedType, TPopulatedType> &
      CustomOptions<TSubfields> &
      ResolveFieldUIOptions<undefined>,
    false,
    TRequired,
    TImmutable,
    TAutoGenerated,
    TConditionalLogic,
    GenericDatabase
  > {
    const { location }: { fieldType: string; location: ResolveFromLayersResult } = this as any

    if (isArray(customOptions.ui?.subfieldsLayout)) {
      for (const { item, path } of walkFieldLayoutItems(customOptions.ui.subfieldsLayout)) {
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

    const bound = defineField({
      model: repeaterFieldModel(options.subfields),
      customOptions,
      castedTypeFn: () =>
        `{ ${Object.entries(options.subfields)
          .map(([subfieldName, subfield]) => `${subfieldName}: ${(subfield as any).castedTypeFn(subfield)}`)
          .join(', ')} }[]`,
      populatedTypeFn: () =>
        `{ ${Object.entries(options.subfields)
          .map(([subfieldName, subfield]) => `${subfieldName}: ${(subfield as any).populatedTypeFn(subfield)}`)
          .join(', ')} }[]`,
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
    TClientSubfields extends Record<string, { field: GenericField }>,
    TSubfields extends Record<string, GenericField> = ExtractClientSubfields<TClientSubfields>,
    TCastedType extends ExtractCastedTypes<TSubfields>[] = ExtractCastedTypes<TSubfields>[],
    TPopulatedType extends ExtractPopulatedTypes<TSubfields>[] = ExtractPopulatedTypes<TSubfields>[],
  >(
    options: CombinedFieldOptions<
      FieldModel<
        RepeaterFieldModelOptions<TCastedType, TPopulatedType>,
        'text',
        TCastedType,
        TPopulatedType,
        SubfieldsInput<TSubfields>[],
        TSubfields,
        undefined
      >,
      RepeaterFieldModelOptions<TCastedType, TPopulatedType> &
        // @ts-expect-error
        CustomOptions<TClientSubfields> &
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
        RepeaterFieldModelOptions<TCastedType, TPopulatedType>,
        'text',
        TCastedType,
        TPopulatedType,
        SubfieldsInput<TSubfields>[],
        TSubfields,
        undefined
      >,
      RepeaterFieldModelOptions<TCastedType, TPopulatedType> &
        // @ts-expect-error
        CustomOptions<TClientSubfields> &
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
      RepeaterFieldModelOptions<Record<string, any>, Record<string, any>>,
      'text',
      Record<string, any>,
      Record<string, any>,
      SubfieldsInput<Record<string, GenericField>>[],
      Record<string, GenericField>,
      undefined
    >,
    RepeaterFieldModelOptions<Record<string, any>, Record<string, any>> &
      CustomOptions<Record<string, GenericField>> &
      ResolveFieldUIOptions<undefined>,
    false,
    boolean,
    boolean,
    boolean,
    ConditionalLogic | undefined,
    GenericDatabase
  >,
}
