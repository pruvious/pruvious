<template>
  <component
    :is="component"
    :modelValue="modelValue"
    :options="{ ...options, choices }"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts" setup>
import {
  __,
  filterFieldComponents,
  getRouteReferences,
  maybeTranslate,
  usePruviousDashboard,
  type WhereField,
} from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type { PUISelectChoiceGroupModel, PUISelectChoiceModel } from '@pruvious/ui/components/PUISelect.vue'
import { isDefined, titleCase } from '@pruvious/utils'

defineProps({
  /**
   * The current where condition.
   */
  modelValue: {
    type: Object as PropType<WhereField>,
    required: true,
  },

  /**
   * The combined field options defined in a collection.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'chips'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const component = filterFieldComponents.chips?.()
const dashboard = usePruviousDashboard()
const routeReferences = getRouteReferences()
const choices: (PUISelectChoiceModel | PUISelectChoiceGroupModel)[] = Object.values(routeReferences)
  .filter(
    ({ dataContainerType, dataContainerName }) =>
      dataContainerType === 'collection' && dashboard.value?.collections[dataContainerName],
  )
  .map(({ dataContainerName }) => ({
    label: isDefined(dashboard.value!.collections[dataContainerName]!.ui.label)
      ? maybeTranslate(dashboard.value!.collections[dataContainerName]!.ui.label)
      : __('pruvious-dashboard', titleCase(dataContainerName ?? '', false) as any),
    value: dataContainerName,
  }))
</script>
