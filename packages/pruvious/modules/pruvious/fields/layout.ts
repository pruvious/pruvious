import type { TranslatableStringCallbackContext } from '#pruvious/server'
import { isArray, isObject, isString } from '@pruvious/utils'
import type { StyleValue } from 'vue'

export type FieldsLayout<TFieldNames extends string = string> = (
  | FieldsLayoutRow<TFieldNames>
  | FieldsLayoutCard<TFieldNames>
  | FieldsLayoutTabs<TFieldNames>
  | FieldsLayoutItem<TFieldNames>
  | FieldsLayoutHR
)[]

export interface FieldsLayoutRow<TFieldNames extends string = string> {
  /**
   * Groups fields horizontally to display them in a single row.
   * Array items can be either fields or tab groups.
   * Each field can have a fixed maximum width (using CSS units) or expand to fill available space.
   *
   * @example
   * ```ts
   * // First field is 8rem wide, second fills remaining space
   * ['countryCode | 8rem', 'phone']
   * ```
   */
  row: (FieldsLayoutTabs<TFieldNames> | FieldsLayoutItem<TFieldNames> | FieldsLayoutCard<TFieldNames>)[]
}

export interface FieldsLayoutCard<TFieldNames extends string = string> {
  /**
   * Groups fields into a card.
   *
   * @example
   * ```ts
   * // Card with two fields
   * ['comments', 'assignedTo']
   *
   * // Collapsible card with header and two fields
   * {
   *   collapsible: true,
   *   header: ({ __ }) => __('pruvious-dashboard', 'Internal notes'),
   *   fields: ['comments', 'assignedTo'],
   * }
   * ```
   */
  card:
    | (
        | FieldsLayoutRow<TFieldNames>
        | FieldsLayoutCard<TFieldNames>
        | FieldsLayoutTabs<TFieldNames>
        | FieldsLayoutItem<TFieldNames>
        | FieldsLayoutHR
      )[]
    | {
        /**
         * Specifies whether the card is collapsible.
         *
         * @default false
         */
        collapsible?: boolean

        /**
         * The label for the card header.
         * You can either provide a string or a function that returns a string.
         * The function receives an object with `_` and `__` properties to access the translation functions.
         *
         * Important: When using a function, only use simple anonymous functions without context binding,
         * since the option needs to be serialized for client-side use.
         *
         * @example
         * ```ts
         * // String (non-translatable)
         * 'Internal notes'
         *
         * // Function (translatable)
         * ({ __ }) => __('pruvious-dashboard', 'Internal notes'')
         * ```
         */
        header?: string | ((context: TranslatableStringCallbackContext) => string)

        /**
         * The fields to display within this card.
         *
         * @example
         * ```ts
         * ['comments', 'assignedTo']
         * ```
         */
        fields: (
          | FieldsLayoutRow<TFieldNames>
          | FieldsLayoutCard<TFieldNames>
          | FieldsLayoutTabs<TFieldNames>
          | FieldsLayoutItem<TFieldNames>
          | FieldsLayoutHR
        )[]
      }
}

export interface FieldsLayoutTabs<TFieldNames extends string = string> {
  /**
   * Defines a tabbed interface containing multiple groups of fields.
   * Each tab has a `label` and its own set of `fields`.
   *
   * @example
   * ```ts
   * [
   *   {
   *     label: ({ __ }) => __('pruvious-dashboard', 'Address'),
   *     fields: ['street | 40%', 'city | 40%', 'zipCode'],
   *   },
   *   {
   *     label: ({ __ }) => __('pruvious-dashboard', 'Contact'),
   *     fields: [
   *       { component: resolvePruviousComponent('>/components/Dashboard/ContactForm.vue') },
   *     ],
   *   },
   * ]
   * ```
   */
  tabs: FieldsLayoutTab<TFieldNames>[]
}

export interface FieldsLayoutTab<TFieldNames extends string = string> {
  /**
   * The display text for the tab.
   * You can either provide a string or a function that returns a string.
   * The function receives an object with `_` and `__` properties to access the translation functions.
   *
   * Important: When using a function, only use simple anonymous functions without context binding,
   * since the option needs to be serialized for client-side use.
   *
   * @example
   * ```ts
   * // String (non-translatable)
   * 'Address'
   *
   * // Function (translatable)
   * ({ __ }) => __('pruvious-dashboard', 'Address')
   * ```
   */
  label: string | ((context: TranslatableStringCallbackContext) => string)

  /**
   * The fields to display within this tab.
   * Can include individual fields, rows, or nested tab groups.
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
  fields: FieldsLayout<TFieldNames>
}

export type FieldsLayoutItem<TFieldNames extends string = string> =
  | TFieldNames
  | `${TFieldNames} | ${string}`
  | FieldsLayoutFieldItem<TFieldNames>
  | FieldsLayoutComponentItem

export interface FieldsLayoutFieldItem<TFieldNames extends string = string> {
  /**
   * Configuration for a single field in the layout.
   * Can be specified as a field `name`, field name with maximum width, or an object with additional styling.
   *
   * @example
   * ```ts
   * // Field name
   * 'email',
   *
   * // Field name with maximum width
   * 'firstName | 50%',
   *
   * // Object with field name and custom styles
   * { name: 'lastName', style: { maxWidth: '50%' } }
   * ```
   */
  field:
    | TFieldNames
    | `${TFieldNames} | ${string}`
    | {
        /**
         * The name of the field to display.
         */
        name: TFieldNames

        /**
         * Optional Vue style object to customize the field's appearance.
         */
        style?: StyleValue
      }
}

export interface FieldsLayoutComponentItem {
  /**
   * Custom component to render in the layout.
   * The component must be resolved using `resolvePruviousComponent()` or `resolveNamedPruviousComponent()`.
   *
   * The following rules apply:
   *
   * - The function name (`resolvePruviousComponent` or `resolveNamedPruviousComponent`) must remain unchanged and not be aliased.
   * - The import `path` must be a literal string, not a variable.
   * - The import `path` can be:
   *   - A path starting with the alias `>/`.
   *     - This path is resolved relative to the `<srcDir>` directory of the Nuxt layer where the function is called.
   *   - A path starting with the Nuxt alias `@/` or `~/`.
   *     - This path is resolved relative to the first matching `<srcDir>` directory in the Nuxt layer hierarchy.
   *   - An absolute path to a `.vue` component.
   *   - A path for an npm module.
   * - When working within the `<sharedDir>` directory, always use `resolveNamedPruviousComponent()` instead of `resolvePruviousComponent()`.
   *
   * The custom component receives the following props:
   *
   * - @todo
   *
   * The custom component can emit the following events:
   *
   * - @todo
   *
   * @example
   * ```ts
   * import { resolvePruviousComponent } from '#pruvious/server'
   *
   * // Correct
   * resolvePruviousComponent('>/components/MyComponent.vue')
   * resolvePruviousComponent('/Project/app/components/MyComponent.vue')
   *
   * // Incorrect
   * resolvePruviousComponent(`>/components/${name}.vue`)
   * resolvePruviousComponent('MyComponent')
   * ```
   */
  component: string
}

export type FieldsLayoutHR =
  | '---'
  | {
      /**
       * A horizontal rule to visually separate fields.
       */
      hr: true
    }

/**
 * Iterates through a fields layout structure and yields each field name in sequence.
 */
export function* walkFieldLayoutItems(
  layout: FieldsLayout,
  parentPath = '',
): Generator<{
  /**
   * The current field layout item being processed.
   * Represents either a field name, field item, or component item.
   */
  item: FieldsLayoutItem

  /**
   * The full path to the current item within the `layout` object, expressed in dot notation (e.g. '0.row.1.field').
   */
  path: string
}> {
  for (const [i, item] of layout.entries()) {
    if (isString(item)) {
      yield { item, path: parentPath + i }
    } else if (isObject(item)) {
      for (const key of Object.keys(item)) {
        if (key === 'row') {
          yield* walkFieldLayoutItems((item as FieldsLayoutRow).row, `${parentPath}${i}.row.`)
        } else if (key === 'card') {
          const card = (item as FieldsLayoutCard).card
          yield* walkFieldLayoutItems(isArray(card) ? card : card.fields, `${parentPath}${i}.card.`)
        } else if (key === 'tabs') {
          for (const tab of (item as FieldsLayoutTabs).tabs) {
            yield* walkFieldLayoutItems(tab.fields, `${parentPath}${i}.tabs.`)
          }
        } else if (key === 'field') {
          yield { item: { field: (item as FieldsLayoutFieldItem)[key] }, path: parentPath + i }
        } else if (key === 'component') {
          yield { item: { component: (item as FieldsLayoutComponentItem)[key] }, path: parentPath + i }
        }
      }
    }
  }
}
