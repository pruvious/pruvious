<template>
  <PruviousFilterField
    :forcedDefault="forcedDefault"
    :modelValue="modelValue"
    :operatorChoices="operatorChoices"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <div v-if="modelValue.value !== undefined" class="p-group pui-row">
      <PUISelect
        :choices="virtualOperatorChoices"
        :modelValue="virtualOperator"
        :name="id"
        @commit="
          (newOperator) => {
            virtualOperator = newOperator as WhereField['operator']
            language = ['eq', 'eqi', 'ne'].includes(virtualOperator) ? (language ?? primaryLanguage) : undefined
            $emit('update:modelValue', toModelValue(inputValue))
          }
        "
        class="p-select-virtual-operator"
      />

      <div class="p-group-value pui-row">
        <PUISelect
          v-if="language"
          :choices="languageChoices"
          :id="`${id}--language`"
          :modelValue="language"
          :name="`${id}--language`"
          @update:modelValue="
            (newLanguage) => {
              language = newLanguage as LanguageCode
              $emit('update:modelValue', toModelValue(inputValue))
              $emit('commit', toModelValue(inputValue))
            }
          "
          class="p-select-language"
        />

        <PUIInput
          v-model="inputValue"
          :id="`${id}--input`"
          :name="`${id}--input`"
          :placeholder="!inputValue ? __('pruvious-dashboard', 'Empty') : undefined"
          @blur="(_, newValue) => $emit('commit', toModelValue(newValue))"
          @update:modelValue="$emit('update:modelValue', toModelValue($event))"
          class="pui-flex-1"
        />
      </div>
    </div>
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __, languages, primaryLanguage } from '#pruvious/app'
import { getValidFilterOperators, type WhereField } from '#pruvious/dashboard'
import type { LanguageCode, SerializableFieldOptions } from '#pruvious/server'
import { isString } from '@pruvious/utils'

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
    type: Object as PropType<SerializableFieldOptions<'translatableText'>>,
    required: true,
  },
})

const emit = defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const virtualOperatorChoices: Ref<ReturnType<typeof getValidFilterOperators>> = ref(
  getValidFilterOperators({ _dataType: 'text' } as any),
)
const operatorChoices: Ref<ReturnType<typeof getValidFilterOperators>> = ref(
  virtualOperatorChoices.value.filter((operator) =>
    ['contains', 'containsI', 'notContains', 'notContainsI'].includes(operator.value),
  ),
)
const virtualOperator = ref<WhereField['operator']>('eq')
const inputValue = ref('')
const language = ref<LanguageCode>()
const languageChoices = languages.map(({ code }) => ({ value: code, label: code.toUpperCase() }))
const forcedDefault = `"${primaryLanguage}":""`

watch(
  () => props.modelValue,
  () => {
    if (isString(props.modelValue.value)) {
      const regex1 = new RegExp(`^"(${languages.map(({ code }) => code).join('|')})":"(.*)"$`)
      const regex2 = new RegExp(`^(":")(.*)"$`)
      const match = props.modelValue.value.match(regex1) || props.modelValue.value.match(regex2)

      if (match) {
        const op = props.modelValue.operator

        language.value = languages.some(({ code }) => code === match[1]) ? (match[1] as LanguageCode) : undefined
        inputValue.value = match[2]!.replaceAll('\\"', '"')

        if (inputValue.value.startsWith('%') && inputValue.value.endsWith('%')) {
          virtualOperator.value = op
          inputValue.value = inputValue.value.slice(1, -1)
        } else if (inputValue.value.startsWith('%')) {
          virtualOperator.value = op === 'containsI' ? 'endsWithI' : 'endsWith'
          inputValue.value = inputValue.value.slice(1)
        } else if (inputValue.value.endsWith('%')) {
          virtualOperator.value = op === 'containsI' ? 'startsWithI' : 'startsWith'
          inputValue.value = inputValue.value.slice(0, -1)
        } else {
          virtualOperator.value = op === 'containsI' ? 'eqi' : op === 'notContains' ? 'ne' : 'eq'
        }

        return
      }
    }

    inputValue.value = ''
  },
  { immediate: true, deep: true },
)

function toModelValue(newValue: string): WhereField {
  let operator: WhereField['operator'] = 'contains'
  let value = newValue.replaceAll('"', '\\"')

  if (['contains', 'containsI', 'notContains', 'notContainsI'].includes(virtualOperator.value)) {
    operator = virtualOperator.value
    value = `%${value}%`
  } else if (['startsWith', 'startsWithI'].includes(virtualOperator.value)) {
    operator = virtualOperator.value === 'startsWithI' ? 'containsI' : 'contains'
    value = `${value}%`
  } else if (['endsWith', 'endsWithI'].includes(virtualOperator.value)) {
    operator = virtualOperator.value === 'endsWithI' ? 'containsI' : 'contains'
    value = `%${value}`
  } else {
    operator =
      virtualOperator.value === 'eqi' ? 'containsI' : virtualOperator.value === 'ne' ? 'notContains' : 'contains'
    value = `${value}`
  }

  return {
    ...props.modelValue,
    operator,
    value: language.value ? `"${language.value}":"${value}"` : `":"${value}"`,
  }
}
</script>

<style scoped>
.p-select-virtual-operator {
  width: 12rem;
}

.p-group-value {
  flex: 1;
}

.p-select-language {
  width: 5rem;
}

:deep(.p-field-filter-operator) {
  display: none;
}

@container (max-width: 640px) {
  .p-group {
    flex-direction: column;
  }

  .p-select-virtual-operator,
  .p-group-value {
    width: 100%;
  }
}
</style>
