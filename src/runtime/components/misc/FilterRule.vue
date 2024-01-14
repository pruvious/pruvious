<template>
  <div class="flex gap-2">
    <button
      v-pruvious-tooltip="__('pruvious-dashboard', 'Remove')"
      @click="$emit('delete')"
      data-ignore-autofocus
      type="button"
      class="button button-white-red button-square"
    >
      <PruviousIconTrash />
    </button>

    <component
      v-model="rule.fieldName"
      :ignoreAutofocus="true"
      :is="Field['select']"
      :options="{ choices: fieldChoices }"
      @update:modelValue="onFieldNameChange(rule)"
      class="!w-0 flex-1"
    >
      {{ rule.fieldName }}
    </component>

    <component
      v-model="rule.operator"
      :ignoreAutofocus="true"
      :is="Field['select']"
      :options="{ choices: filteredOperatorChoices }"
      class="!w-0 flex-1"
    >
      {{ rule.operator }}
    </component>

    <component
      v-model="rule.value"
      :ignoreAutofocus="true"
      :is="Field[collection.fields[rule.fieldName].type]"
      :options="options"
      :suggestions="onSuggestions"
      class="!w-0 flex-1"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, type PropType } from '#imports'
import { fieldTypes, fields } from '#pruvious/dashboard'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousFetch } from '../../utils/fetch'
import { extractKeywords, isString } from '../../utils/string'
import type { SimpleWhere, SimpleWhereOperator } from './FilterPopup.vue'

const props = defineProps({
  fieldChoices: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  rule: {
    type: Object as PropType<SimpleWhere>,
    required: true,
  },
})

const emit = defineEmits<{
  delete: []
}>()

const dashboard = usePruviousDashboard()

const Field = Object.fromEntries(
  Object.entries(fields).map(([fieldName, fieldComponent]) => [fieldName, fieldComponent()]),
)

const collection = dashboard.value.collections[dashboard.value.collection!]
const operatorChoices: Record<SimpleWhereOperator, string> = {
  $eq: __('pruvious-dashboard', 'Equal to'),
  $eqi: __('pruvious-dashboard', 'Equal to (case-insensitive)'),
  $ne: __('pruvious-dashboard', 'Not equal to'),
  $gt: __('pruvious-dashboard', 'Greater than'),
  $gte: __('pruvious-dashboard', 'Greater than or equal to'),
  $lt: __('pruvious-dashboard', 'Less than'),
  $lte: __('pruvious-dashboard', 'Less than or equal to'),
  $startsWith: __('pruvious-dashboard', 'Starts with (case-insensitive)'),
  $endsWith: __('pruvious-dashboard', 'Ends with (case-insensitive)'),
  $iLike: __('pruvious-dashboard', 'Contains (case-insensitive)'),
  $notILike: __('pruvious-dashboard', 'Does not contain (case-insensitive)'),
}

const filteredOperatorChoices = ref<Partial<Record<SimpleWhereOperator, string>>>({})
const options = ref<any>({})

createOptions()
filterOperatorChoices()

await loadTranslatableStrings('pruvious-dashboard')

function createOptions() {
  options.value = {
    ...collection.fields[props.rule.fieldName].options,
    description: '',
    label: '',
    trim: true,
  }
}

function onFieldNameChange(rule: SimpleWhere) {
  const fieldType = fieldTypes[collection.fields[rule.fieldName].type]

  rule.operator = '$eq'
  rule.value = fieldType === 'boolean' ? false : fieldType === 'number' ? 0 : ''

  createOptions()
  filterOperatorChoices()
}

function filterOperatorChoices() {
  const fieldType = fieldTypes[collection.fields[props.rule.fieldName].type]

  filteredOperatorChoices.value = {
    $eq: operatorChoices.$eq,
  }

  if (fieldType === 'string') {
    filteredOperatorChoices.value.$eqi = operatorChoices.$eqi
  }

  filteredOperatorChoices.value.$ne = operatorChoices.$ne

  if (fieldType === 'number') {
    filteredOperatorChoices.value.$gt = operatorChoices.$gt
    filteredOperatorChoices.value.$gte = operatorChoices.$gte
    filteredOperatorChoices.value.$lt = operatorChoices.$lt
    filteredOperatorChoices.value.$lte = operatorChoices.$lte
  }

  if (fieldType === 'string') {
    filteredOperatorChoices.value.$startsWith = operatorChoices.$startsWith
    filteredOperatorChoices.value.$endsWith = operatorChoices.$endsWith
    filteredOperatorChoices.value.$iLike = operatorChoices.$iLike
    filteredOperatorChoices.value.$notILike = operatorChoices.$notILike
  }
}

async function onSuggestions(keywords: string, page: number) {
  if (!isString(keywords)) {
    return []
  }

  const result = await pruviousFetch<{ records: Record<string, any>[] }>(`collections/${collection.name}`, {
    query: {
      select: props.rule.fieldName,
      where:
        `${props.rule.fieldName}[!=][]` +
        (keywords.trim()
          ? ',every:[' +
            extractKeywords(keywords)
              .map((keyword) => `${props.rule.fieldName}[ilike][%${keyword}%]`)
              .join(',') +
            ']'
          : ''),
      page,
      perPage: 30,
      order: props.rule.fieldName,
      group: props.rule.fieldName,
    },
  })

  return result.success
    ? result.data.records.map((item) => ({ value: item[props.rule.fieldName], label: item[props.rule.fieldName] }))
    : []
}
</script>
