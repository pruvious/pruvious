import { defineFilter } from '#pruvious/client'
import type { LanguageCode, SerializableSingleton, Singletons } from '#pruvious/server'
import type { ConditionalLogicResolver } from '@pruvious/orm'

export default defineFilter<
  Component[],
  {
    /**
     * The name and definition of the current singleton.
     */
    singleton: { name: keyof Singletons; definition: SerializableSingleton }

    /**
     * The current singleton data.
     * Contains key-value pairs representing the record's fields and their values.
     */
    data: Ref<Record<string, any>>

    /**
     * The language code currently being used for the singleton `data`.
     */
    singletonLanguage: Ref<LanguageCode>

    /**
     * A resolver instance that handles conditional logic evaluation for `singleton.definition.fields` and their associated `data`.
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
