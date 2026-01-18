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
import { getValidFilterOperators, type FilterOperator, type WhereField } from '#pruvious/dashboard'
import type { GenericSerializableFieldOptions } from '#pruvious/server'
import { deepClone, isArray, isBoolean, isDefined, isNull, isNumber } from '@pruvious/utils'

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

  /**
   * A value that overrides the default value from field options when initializing or resetting the filter.
   */
  forcedDefault: {
    type: null as unknown as PropType<any>,
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
      const normalizedValue: WhereField = { ...newValue }

      if (!operatorChoices.value.some(({ value }) => value === normalizedValue.operator)) {
        normalizedValue.operator = operatorChoices.value[0]!.value
      }

      if (props.options._dataType === 'junction' || props.options._dataType === 'matrix') {
        if (['lt', 'lte', 'gt', 'gte'].includes(normalizedValue.operator) && isArray(normalizedValue.value)) {
          nextTick(() => {
            if (isArray(normalizedValue.value)) {
              normalizedValue.value = normalizedValue.value.length
            }
          })
        } else if (
          ['includes', 'includesAny', 'excludes', 'excludesAny'].includes(normalizedValue.operator) &&
          isNumber(normalizedValue.value)
        ) {
          nextTick(() => {
            if (isNumber(normalizedValue.value)) {
              normalizedValue.value = []
            }
          })
        }
      }

      if (
        (oldValue && newValue.field !== oldValue?.field) ||
        (isNull(normalizedValue.value) && !props.options.nullable) ||
        ((props.options._dataType === 'bigint' || props.options._dataType === 'numeric') &&
          !isNumber(normalizedValue.value) &&
          !isNull(normalizedValue.value)) ||
        (props.options._dataType === 'boolean' &&
          !isBoolean(normalizedValue.value) &&
          !isNull(normalizedValue.value)) ||
        ((props.options._dataType === 'junction' || props.options._dataType === 'matrix') &&
          !isArray(normalizedValue.value) &&
          !isNumber(normalizedValue.value))
      ) {
        nextTick(() => {
          normalizedValue.value = deepClone(
            isDefined(props.forcedDefault) ? props.forcedDefault : props.options.default,
          )
        })
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
