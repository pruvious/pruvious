import {
  resolveCustomComponentPath,
  walkFieldLayoutItems,
  type BlockGroupName,
  type BlockTagName,
  type FieldsLayout,
  type TranslatableStringCallbackContext,
} from '#pruvious/server'
import type { icons } from '@iconify-json/tabler/icons.json'
import type { GenericField } from '@pruvious/orm'
import { isArray, isDefined, isObject, setProperty } from '@pruvious/utils'
import { hash } from 'ohash'

export interface Block<TFields extends Record<string, GenericField>> {
  /**
   * A key-value object of `Field` instances representing the structure of the block.
   *
   * - Object keys represent the field names.
   * - Object values are instances of the `Field` class.
   *
   * Fields defined here will be merged with the fields defined in `defineProps(fields)`.`
   */
  fields: TFields

  /**
   * Specifies the group name this block is part of.
   *
   * Block groups are used to categorize blocks in the selection interface by organizing them into separate sections.
   * They also make it easier to specify which blocks are allowed or denied when defining a `blocksField({})`.
   *
   * You can create custom groups using the `addFilter('blocks:groups', (groups) => [...groups, { name: 'my-custom-group' }])` filter.
   * Place this filter anywhere in the `server/filters/` directory.
   *
   * @default null
   */
  group?: BlockGroupName | null

  /**
   * Array of block tag names that this block belongs to.
   *
   * Block tags are used to filter blocks in the selection interface.
   * They also make it easier to specify which blocks are allowed or denied when defining a `blocksField({})`.
   *
   * You can create custom tags using the `addFilter('blocks:tags', (tags) => [...tags, { name: 'my-custom-tag' }])` filter.
   * Place this filter anywhere in the `server/filters/` directory.
   *
   * @default []
   */
  tags?: BlockTagName[]

  /**
   * Controls how the block is displayed in the dashboard user interface.
   */
  ui?: {
    /**
     * The icon associated with the block.
     * Can be provided as a Tabler icon name (e.g., 'cube', 'typography') or an object for dynamic icon selection.
     *
     * For dynamic icons, use an object with these properties:
     *
     * - `fieldName` - The field name used to determine the icon dynamically.
     * - `iconMap` - An object mapping field values to icon names (e.g., `{ 'image': 'photo', 'video': 'movie' }`).
     * - `defaultIcon` - The default icon to use when the field value does not match any key in the `iconMap`.
     *
     * @see https://tabler-icons.io for available icons
     *
     * @default 'cube'
     */
    icon?:
      | keyof typeof icons
      | {
          /**
           * The field name used to determine the icon dynamically.
           * The field's value is used to look up the corresponding icon in the `iconMap`.
           *
           * @example
           * 'type'
           */
          fieldName: keyof TFields & string

          /**
           * Maps field values to their corresponding icon names.
           * Keys represent field values, values represent icon names.
           *
           * @example
           * { 'image': 'photo', 'video': 'movie' }
           */
          iconMap: Record<string, keyof typeof icons>

          /**
           * The default icon to use when the field value does not match any key in the `iconMap`.
           * This icon is always used in the block picker popup.
           *
           * @default 'cube'
           */
          defaultIcon?: keyof typeof icons
        }
      | undefined

    /**
     * Sets the visible label text for the block in the dashboard.
     *
     * If not specified, the block name will be automatically transformed to Title case and used as the label.
     * The resulting label is wrapped in the translation function `__('pruvious-dashboard', label)`.
     * This transformation happens in the Vue component.
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
     * label: 'Theme options'
     *
     * // Function (translatable)
     * label: ({ __ }) => __('pruvious-dashboard', 'Theme options')
     *
     * // Block name transformation (default)
     * // Example: the block name `TwoColumns` is transformed into `__('pruvious-dashboard', 'Two columns')`
     * label: undefined
     * ```
     */
    label?: string | ((context: TranslatableStringCallbackContext) => string) | undefined

    /**
     * Optional configuration for how the block's label appears in the dashboard.
     * Controls how labels are displayed in tree and structure item headers and data table cells.
     *
     * When not specified, only the block's `label` property is shown.
     *
     * @default undefined
     */
    itemLabelConfiguration?: {
      /**
       * Controls whether to include the `ui.label` in tree and structure item headers and data table cells.
       *
       * @default true
       */
      showBlockLabel?: boolean

      /**
       * Displays a field value in the block's UI label.
       * This helps users quickly identify blocks by their content in large block trees.
       *
       * When specified, the label shows as:
       *
       *   - `${ui.label} (${ui.itemLabelConfiguration.fieldValue})` - if `ui.itemLabelConfiguration.showBlockLabel` is `true`.
       *   - `${ui.itemLabelConfiguration.fieldValue}` - if `ui.itemLabelConfiguration.showBlockLabel` is `false`.
       *
       * When `false` or `undefined`, only displays the block's `ui.label`.
       *
       * @default false
       */
      fieldValue?: (keyof TFields & string) | false | undefined
    }

    /**
     * Sets the description text for the block in the dashboard.
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
     * label: 'Displays multiple images that users can scroll through horizontally.'
     *
     * // Function (translatable)
     * label: ({ __ }) => __('pruvious-dashboard', 'Displays multiple images that users can scroll through horizontally.')
     * ```
     */
    description?: string | ((context: TranslatableStringCallbackContext) => string) | undefined

    /**
     * Customizes how block fields are arranged in the dashboard in standard layouts (without live preview).
     *
     * If not specified, the fields are stacked vertically in the order they are defined.
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
    standardFieldsLayout?: FieldsLayout<keyof TFields & string> | undefined

    /**
     * Customizes how block fields are arranged in the dashboard when using the live preview layout.
     *
     * If not specified, the fields are stacked vertically in the order they are defined.
     * Nested blocks are omitted as they're shown in the tree view instead.
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
    livePreviewFieldsLayout?: FieldsLayout<keyof TFields & string> | undefined
  }
}

export type GenericBlock = Block<Record<string, GenericField>>

export type DefineBlockOptions<TFields extends Record<string, GenericField>> = Partial<Block<TFields>>

/**
 * Defines a new Pruvious block.
 * This function is used internally by Pruvious to define blocks on the server-side.
 * You should not use this function directly in your code.
 * Use the `defineBlock` function in the `#pruvious/client` module instead or simply create a new Vue component in the `app/blocks/` directory.
 *
 * @see https://pruvious.com/docs/blocks
 */
export function defineBlock<const TFields extends Record<string, GenericField>>(
  options: DefineBlockOptions<TFields>,
): Required<Block<TFields>> {
  const location: { file: { absolute: string; relative: string }; srcDir: string } = (options as any)._location

  for (const layoutType of ['standardFieldsLayout', 'livePreviewFieldsLayout'] as const) {
    if (isDefined(options.ui?.[layoutType])) {
      for (const layout of Object.values(options.ui[layoutType])) {
        if (isArray(layout)) {
          for (const { item, path } of walkFieldLayoutItems(layout as FieldsLayout)) {
            if (isObject(item) && 'component' in item) {
              setProperty(
                options.ui[layoutType],
                `${path}.component`,
                item.component.includes('/')
                  ? hash(
                      resolveCustomComponentPath({
                        component: item.component,
                        file: location.file.absolute,
                        srcDir: location.srcDir,
                      }),
                    )
                  : item.component,
              )
            }
          }
        }
      }
    }
  }

  return {
    fields: options.fields ?? ({} as TFields),
    group: options.group ?? null,
    tags: options.tags ?? [],
    ui: {
      icon: options.ui?.icon ?? 'cube',
      label: options.ui?.label,
      itemLabelConfiguration: {
        showBlockLabel: options.ui?.itemLabelConfiguration?.showBlockLabel ?? true,
        fieldValue: options.ui?.itemLabelConfiguration?.fieldValue ?? false,
      },
      description: options.ui?.description,
      standardFieldsLayout: options.ui?.standardFieldsLayout,
      livePreviewFieldsLayout: options.ui?.livePreviewFieldsLayout,
    },
  }
}
