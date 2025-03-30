<template>
  <div class="p-field-filter pui-row">
    <div class="p-field-filter-operator">
      <PUISelect
        :choices="operatorChoices"
        :modelValue="modelValue.operator"
        :name="id"
        @commit="
          (value) => {
            $emit('update:modelValue', { ...modelValue, operator: value as FilterOperator })
          }
        "
      />
    </div>

    <div class="p-field-filter-value">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { getValidFilterOperators, type FilterOperator, type WhereField } from '#pruvious/client'
import type { GenericSerializableFieldOptions } from '#pruvious/server'
import { deepClone } from '@pruvious/utils'

const props = defineProps({
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
    type: Object as PropType<GenericSerializableFieldOptions>,
    required: true,
  },

  /**
   * The filter operator choices.
   */
  operatorChoices: {
    type: Array as PropType<{ value: FilterOperator; label: string }[]>,
  },
})

const emit = defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const operatorChoices = computed(() => props.operatorChoices ?? getValidFilterOperators(props.options))

watch(
  () => props.modelValue,
  (newValue, oldValue) => {
    if (newValue.field !== oldValue?.field || newValue.operator !== oldValue?.operator) {
      const normalizedValue: WhereField = { ...newValue, value: deepClone(props.options.default) }

      if (!operatorChoices.value.some(({ value }) => value === normalizedValue.operator)) {
        normalizedValue.operator = operatorChoices.value[0]!.value
      }

      setTimeout(() => emit('commit', normalizedValue))
    }
  },
  { immediate: true },
)
</script>

<style lang="postcss" scoped>
.p-field-filter-operator {
  width: 12rem;
}

.p-field-filter-value {
  flex: 1;
}

@container (max-width: 640px) {
  .p-field-filter {
    flex-direction: column;
  }

  .p-field-filter-operator,
  .p-field-filter-value {
    width: 100%;
  }
}
</style>
