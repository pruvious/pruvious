<template>
  <div
    class="p-where-filters-condition pui-row"
    :class="{
      'p-where-filters-condition-top':
        collection.definition.fields[modelValue.field]?.subfields ||
        collection.definition.fields[modelValue.field]?.structure,
    }"
  >
    <PUISelect
      :choices="fieldChoices"
      :id="id"
      :modelValue="modelValue.field"
      :name="id"
      @commit="
        $emit('update:modelValue', {
          ...modelValue,
          field: String($event),
          value: deepClone(collection.definition.fields[String($event)]!.default),
        })
      "
      class="p-where-filters-condition-field"
    />

    <PruviousDynamicFilterField
      v-if="collection.definition.fields[modelValue.field]"
      :collection="collection"
      :fields="collection.definition.fields"
      :modelValue="modelValue"
      :name="modelValue.field"
      :options="collection.definition.fields[modelValue.field]!"
      :synced="collection.definition.syncedFields.includes(modelValue.field)"
      :translatable="collection.definition.translatable"
      :type="collection.definition.fields[modelValue.field]!._fieldType"
      @commit="$emit('commit', $event)"
      @update:modelValue="$emit('update:modelValue', $event)"
      class="pui-flex-1"
    />
  </div>
</template>

<script lang="ts" setup>
import type { WhereField } from '#pruvious/client'
import type { Collections, SerializableCollection } from '#pruvious/server'
import { deepClone } from '@pruvious/utils'

defineProps({
  /**
   * The current where condition.
   */
  modelValue: {
    type: Object as PropType<WhereField>,
    required: true,
  },

  /**
   * The name and definition of the current translatable collection.
   */
  collection: {
    type: Object as PropType<{ name: keyof Collections; definition: SerializableCollection }>,
    required: true,
  },

  /**
   * The available field choices.
   */
  fieldChoices: {
    type: Array as PropType<{ label: string; value: string }[]>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
</script>

<style lang="postcss" scoped>
.p-where-filters-condition {
  width: 100%;
}

.p-where-filters-condition-top,
.p-where-filters-condition-top :deep(.p-field-filter) {
  align-items: start;
}

.p-where-filters-condition-field {
  width: calc(50% - 6.5rem);
}

:deep(.pui-field-message) {
  display: none;
}

@container (max-width: 640px) {
  .p-where-filters-condition {
    flex-direction: column;
  }

  .p-where-filters-condition > * {
    width: 100%;
  }
}
</style>
