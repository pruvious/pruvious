import { defineFilter } from '#pruvious/client'
import type { Collections, SerializableCollection } from '#pruvious/server'
import type { ConditionalLogicResolver } from '@pruvious/orm'

export default defineFilter<
  Component[],
  {
    /**
     * The name and definition of the current collection.
     */
    collection: { name: keyof Collections; definition: SerializableCollection }

    /**
     * The current collection record data.
     * Contains key-value pairs representing the record's fields and their values.
     */
    data: Ref<Record<string, any>>

    /**
     * The unique identifier for the current record that is associated with the `data` object.
     */
    id: number

    /**
     * A resolver instance that handles conditional logic evaluation for `collection.definition.fields` and their associated `data`.
     * This resolver determines field visibility, validation rules, and other dynamic behaviors based on defined conditions.
     */
    conditionalLogicResolver: ConditionalLogicResolver

    /**
     * Stores the evaluation results of conditional logic for form fields.
     * The object uses dot-notation field paths as keys (e.g. `repeater.0.field`) and boolean values indicating if the condition is met.
     */
    conditionalLogic: Ref<Record<string, boolean>>

    /**
     * Represents a key-value object of error messages that can be displayed to the user.
     * Keys are top-level field paths in dot notation (e.g. `repeater.0.field`) and values are error messages.
     */
    errors: Ref<Record<string, string>>
  }
>()
