<template>
  <component
    :disabled="disabled"
    :error="error"
    :is="component"
    :modelValue="modelValue"
    :name="name"
    :options="{ ...options, choices }"
    :path="path"
    :synced="synced"
    :translatable="translatable"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts" setup>
import { __, fieldComponents, getRouteReferences, maybeTranslate, usePruviousDashboard } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUISelectChoiceGroupModel, PUISelectChoiceModel } from '@pruvious/ui/components/PUISelect.vue'
import { isDefined, titleCase } from '@pruvious/utils'

defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: [String, null],
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
    type: Object as PropType<SerializableFieldOptions<'nullableSelect'>>,
    required: true,
  },

  /**
   * The field path, expressed in dot notation, represents the exact location of the field within the current data structure.
   */
  path: {
    type: String,
    required: true,
  },

  /**
   * Represents an error message that can be displayed to the user.
   */
  error: {
    type: String,
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
})

defineEmits<{
  'commit': [value: string | null]
  'update:modelValue': [value: string | null]
}>()

const component = fieldComponents.nullableSelect?.()
const dashboard = usePruviousDashboard()
const routeReferences = getRouteReferences()
const choices: (PUISelectChoiceModel | PUISelectChoiceGroupModel)[] = Object.values(routeReferences)
  .filter(
    ({ dataContainerType, dataContainerName }) =>
      dataContainerType === 'singleton' && dashboard.value?.singletons[dataContainerName],
  )
  .map(({ dataContainerName }) => ({
    label: isDefined(dashboard.value!.singletons[dataContainerName]!.ui.label)
      ? maybeTranslate(dashboard.value!.singletons[dataContainerName]!.ui.label)
      : __('pruvious-dashboard', titleCase(dataContainerName ?? '', false) as any),
    value: dataContainerName,
  }))
</script>
