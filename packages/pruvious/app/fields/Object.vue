<template>
  <PUIField v-if="!options.ui.hidden">
    <PUICard :class="{ 'p-object-has-error': objectErrors }">
      <template v-if="label" #header>
        <span class="pui-block pui-medium pui-truncate">{{ label }}</span>
      </template>

      <PruviousFields
        v-if="hasSubfields"
        :alwaysVisibleFields="alwaysVisibleFields"
        :conditionalLogic="conditionalLogic ?? {}"
        :conditionalLogicResolver="conditionalLogicResolver ?? new ConditionalLogicResolver()"
        :data="data ?? {}"
        :dataContainerName="dataContainerName"
        :dataContainerType="dataContainerType"
        :disabled="disabled"
        :errors="subfieldErrors"
        :fields="options.subfields"
        :layout="options.ui.subfieldsLayout"
        :modelValue="modelValue"
        :operation="operation"
        :rootPath="path"
        :syncedFields="[]"
        :translatable="translatable"
        @commit="$emit('commit', $event)"
        @queueConditionalLogicUpdate="$emit('queueConditionalLogicUpdate', $event)"
        @update:conditionalLogic="$emit('update:conditionalLogic', $event)"
        @update:modelValue="
          (value) => {
            $emit('update:modelValue', value)
            $nextTick(queueConditionalLogicUpdate)
          }
        "
      />
      <span v-else class="pui-muted">{{ __('pruvious-dashboard', 'No fields to display') }}</span>
    </PUICard>

    <PruviousFieldMessage :error="objectErrors" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, resolveFieldLabel } from '#pruvious/client'
import type {
  Collections,
  GenericSerializableFieldOptions,
  SerializableFieldOptions,
  Singletons,
} from '#pruvious/server'
import { ConditionalLogicResolver } from '@pruvious/orm/conditional-logic-resolver'
import { isDefined, isEmpty, isObject, omit } from '@pruvious/utils'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },

  /**
   * The field name defined in a collection, singleton, or block.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'object'>>,
    required: true,
  },

  /**
   * Defines whether this data container is a `collection` (manages multiple items) or a `singleton` (manages a single item).
   */
  dataContainerType: {
    type: String as PropType<'collection' | 'singleton'>,
    required: true,
  },

  /**
   * The name of the data container in PascalCase format.
   */
  dataContainerName: {
    type: String as PropType<keyof Collections | keyof Singletons>,
    required: true,
  },

  /**
   * The current record data from a collection or singleton.
   * Contains key-value pairs representing the record's fields and their values.
   */
  data: {
    type: Object as PropType<Record<string, any>>,
  },

  /**
   * A key-value pair of (sub)field names and their combined options defined in a collection, singleton, block, or field.
   */
  fields: {
    type: Object as PropType<Record<string, GenericSerializableFieldOptions>>,
  },

  /**
   * The field path, expressed in dot notation, represents the exact location of the field within the current data structure.
   */
  path: {
    type: String,
    required: true,
  },

  /**
   * Specifies the root path in dot notation for the current `fields` that will be shown.
   * Only displays fields that are nested under this base path.
   *
   * @default ''
   */
  rootPath: {
    type: String,
    default: '',
  },

  /**
   * A resolver instance that handles conditional logic evaluation for `fields` and their associated `data`.
   * This resolver determines field visibility, validation rules, and other dynamic behaviors based on defined conditions.
   */
  conditionalLogicResolver: {
    type: Object as PropType<ConditionalLogicResolver>,
  },

  /**
   * Stores the evaluation results of conditional logic for form fields.
   * The object uses dot-notation field paths as keys (e.g. `repeater.0.field`) and boolean values indicating if the condition is met.
   */
  conditionalLogic: {
    type: Object as PropType<Record<string, boolean>>,
  },

  /**
   * Represents an error message that can be displayed to the user.
   */
  error: {
    type: [String, Object] as PropType<string | Record<string, string>>,
  },

  /**
   * Controls whether the field is disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },

  /**
   * Specifies whether the current data record is translatable.
   *
   * @default false
   */
  translatable: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates if the field value remains synchronized between all translations of the current data record.
   *
   * @default false
   */
  synced: {
    type: Boolean,
    default: false,
  },

  /**
   * The current operation being performed.
   */
  operation: {
    type: String as PropType<'create' | 'update'>,
    required: true,
  },

  /**
   * A list of fields that should always be visible, regardless of conditional logic.
   * The fields must be specified in dot notation (e.g. `repeater.0.field`).
   */
  alwaysVisibleFields: {
    type: Array as PropType<string[]>,
  },
})

const emit = defineEmits<{
  'commit': [value: Record<string, any>]
  'update:modelValue': [value: Record<string, any>]
  'update:conditionalLogic': [value: Record<string, boolean>]
  'queueConditionalLogicUpdate': [path?: (string & {}) | string[] | '$resolve' | '$reset']
}>()

const label = resolveFieldLabel(props.options.ui.label, props.name)
const hasSubfields = computed(() => !isEmpty(props.options.subfields))
const objectErrors = computed(() => (isObject(props.error) ? props.error[props.name] : props.error))
const subfieldErrors = computed(() => (isObject(props.error) ? omit(props.error, [props.name]) : undefined))

watch(
  () => props.modelValue,
  (_, oldValue) => {
    if (isDefined(oldValue)) {
      queueConditionalLogicUpdate()
    }
  },
  { immediate: true },
)

function queueConditionalLogicUpdate() {
  if (props.conditionalLogicResolver) {
    const parsedConditionalLogic = props.conditionalLogicResolver.getConditionalLogic()

    for (const subfieldName of Object.keys(props.modelValue)) {
      if (!parsedConditionalLogic.hasOwnProperty(`${props.path}.${subfieldName}`)) {
        emit('queueConditionalLogicUpdate', '$reset')
        return
      }
    }

    emit(
      'queueConditionalLogicUpdate',
      Object.keys(props.modelValue).map((subfieldName) => `${props.path}.${subfieldName}`),
    )
  }
}
</script>

<style scoped>
.p-object-has-error {
  border-color: hsl(var(--pui-destructive));
}
</style>
