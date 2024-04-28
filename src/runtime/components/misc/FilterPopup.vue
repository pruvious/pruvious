<template>
  <PruviousPopup :visible="visible" @hotkey="onHotkey" @update:visible="emit('update:visible', $event)" width="48rem">
    <template #header>
      <h2 class="truncate text-sm">{{ title }}</h2>
    </template>

    <form v-if="parsable" @submit.prevent="apply()" class="flex flex-col gap-4 p-4">
      <template v-for="(rule, i) of simpleWhere" :key="i">
        <div
          v-if="
            !collection.fields[rule.fieldName].additional.hidden &&
            !collection.fields[rule.fieldName].additional.protected &&
            rule.fieldName !== 'language'
          "
        >
          <PruviousFilterRule :fieldChoices="fieldChoices" :rule="rule" @delete="simpleWhere.splice(i, 1)" />
        </div>
      </template>

      <button @click="addRule()" type="button" class="button button-white self-start">
        <span>{{ __('pruvious-dashboard', 'Add filter') }}</span>
      </button>
    </form>

    <p v-if="!parsable" class="p-4">
      {{ __('pruvious-dashboard', 'The filter in the query string cannot be displayed in the user interface.') }}
    </p>

    <div class="flex justify-between gap-2 border-t p-4">
      <button @click="emit('update:visible', false)" type="button" class="button button-white ml-auto">
        <span>{{ parsable ? __('pruvious-dashboard', 'Cancel') : __('pruvious-dashboard', 'Close') }}</span>
      </button>

      <button v-if="parsable" @click="apply()" type="submit" class="button">
        <span>{{ __('pruvious-dashboard', 'Apply') }}</span>
      </button>
    </div>
  </PruviousPopup>
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import { dashboardMiscComponent, fieldTypes } from '#pruvious/dashboard'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import type { HotkeyAction } from '../../composables/dashboard/hotkeys'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { booleanishSanitizer } from '../../sanitizers/booleanish'
import { isArray, sortNaturalByProp } from '../../utils/array'
import { isBoolean } from '../../utils/common'
import { Filter } from '../../utils/dashboard/filter'
import { isObject } from '../../utils/object'

export type SimpleWhereOperator =
  | '$eq'
  | '$eqi'
  | '$ne'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$startsWith'
  | '$endsWith'
  | '$iLike'
  | '$notILike'

export interface SimpleWhere {
  fieldName: string
  operator: SimpleWhereOperator
  value: any
}

type AllowedWhereOperator = '$eq' | '$ne' | '$gt' | '$gte' | '$lt' | '$lte' | '$iLike' | '$notILike'

const props = defineProps({
  filter: {
    type: Object as PropType<Filter>,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  visible: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits<{
  'updateFilter': []
  'update:visible': [boolean]
}>()

const dashboard = usePruviousDashboard()

const allowedWhereOperators: AllowedWhereOperator[] = [
  '$eq',
  '$ne',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$iLike',
  '$notILike',
]
const collection = dashboard.value.collections[dashboard.value.collection!]
const fieldChoices = Object.fromEntries(
  sortNaturalByProp(
    Object.entries(collection.fields)
      .filter(
        ([name, { type, additional }]) =>
          fieldTypes[type] !== 'object' && !additional.hidden && !additional.protected && name !== 'language',
      )
      .map(([name, { options }]) => ({ value: name, label: __('pruvious-dashboard', options.label as any) })),
    'label',
  ).map(({ label, value }) => [value, label]),
)
const parsable = ref(false)
const simpleWhere = ref<SimpleWhere[]>([])

const PruviousFilterRule = dashboardMiscComponent.FilterRule()
const PruviousPopup = dashboardMiscComponent.Popup()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      parsable.value = isWhereOptionParsable()
      simpleWhere.value = parsable.value ? simplifyWhere(props.filter.whereOption.value) : []
    }
  },
)

function apply() {
  const where = normalizeWhere(simpleWhere.value)

  if (JSON.stringify(where) !== JSON.stringify(props.filter.whereOption.value)) {
    props.filter.where(where)
    emit('updateFilter')
  }

  emit('update:visible', false)
}

function onHotkey(action: HotkeyAction) {
  if (action === 'close') {
    emit('update:visible', false)
  } else if (action === 'save') {
    apply()
  }
}

function isWhereOptionParsable() {
  return (
    isArray(props.filter.whereOption.value.$and) &&
    props.filter.whereOption.value.$and.every((rule: any) => {
      const fieldNames: string[] = []
      const operators: string[] = []

      if (isObject<Record<string, any>>(rule) && Object.keys(rule).length === 1) {
        for (const [key, value] of Object.entries(rule)) {
          if (key !== '$and' && key !== '$or') {
            fieldNames.push(key)
            operators.push(Object.keys(value)[0])
          }
        }
      }

      return (
        fieldNames.every((fieldName) => collection.fields[fieldName]) &&
        operators.every((operator) => allowedWhereOperators.includes(operator as any))
      )
    })
  )
}

function simplifyWhere(where: Record<string, any>): SimpleWhere[] {
  const simpleWhere: SimpleWhere[] = []
  let hasErrors = false

  for (const rule of where.$and) {
    const { operator, value } = simplifyWhereRule(
      Object.keys(rule)[0],
      Object.keys(rule[Object.keys(rule)[0]])[0] as any,
      Object.values(rule[Object.keys(rule)[0]])[0] as any,
    )

    if (operator) {
      simpleWhere.push({ fieldName: Object.keys(rule)[0], operator, value })
    } else {
      hasErrors = true
    }
  }

  if (hasErrors) {
    pruviousToasterShow({
      message: __('pruvious-dashboard', 'Some filters are not displayed and are omitted from the user interface'),
    })
  }

  return simpleWhere
}

function normalizeWhere(simpleWhere: SimpleWhere[]): Record<string, any> {
  const where: Record<string, any> = { $and: [] }

  for (const rule of simpleWhere) {
    const { operator, value } = normalizeWhereRule(rule.operator, rule.value)
    where.$and.push({ [rule.fieldName]: { [operator]: value } })
  }

  return where
}

function simplifyWhereRule(
  fieldName: string,
  operator: AllowedWhereOperator,
  value: string,
): { operator: SimpleWhereOperator | null; value: any } {
  try {
    const fieldType = fieldTypes[collection.fields[fieldName].type]

    if (operator === '$gt' || operator === '$gte' || operator === '$lt' || operator === '$lte') {
      const numeric = Number(value)

      if (numeric.toString() === value && fieldType === 'number') {
        return { operator, value: numeric }
      }
    } else if (operator === '$iLike') {
      if (fieldType === 'string') {
        if (value.startsWith('%') && value.endsWith('%')) {
          return { operator, value: value.slice(1, -1) }
        } else if (value.startsWith('%')) {
          return { operator: '$endsWith', value: value.slice(1) }
        } else if (value.endsWith('%')) {
          return { operator: '$startsWith', value: value.slice(0, -1) }
        } else {
          return { operator: '$eqi', value }
        }
      }
    } else if (operator === '$notILike') {
      if (value.startsWith('%') && value.endsWith('%')) {
        return { operator, value: value.slice(1, -1) }
      }
    } else if (fieldType === 'boolean') {
      const boolean = booleanishSanitizer({ value })

      if (isBoolean(boolean)) {
        return { operator, value: boolean }
      }
    } else if (fieldType === 'number') {
      const numeric = Number(value)

      if (numeric.toString() === value) {
        return { operator, value: Number(value) }
      }
    } else if (fieldType === 'string') {
      return { operator, value }
    }
  } catch {}

  return { operator: null, value }
}

function normalizeWhereRule(
  operator: SimpleWhereOperator,
  value: any,
): { operator: AllowedWhereOperator; value: string } {
  value = String(value).trim()

  if (operator === '$eqi') {
    return { operator: '$iLike', value: `%${value}%` }
  } else if (operator === '$startsWith') {
    return { operator: '$iLike', value: `${value}%` }
  } else if (operator === '$endsWith') {
    return { operator: '$iLike', value: `%${value}` }
  } else if (operator === '$notILike') {
    return { operator: '$notILike', value: `%${value}%` }
  } else if (operator === '$eq') {
    return { operator: '$eq', value }
  } else if (operator === '$ne') {
    return { operator: '$ne', value }
  } else if (operator === '$gt') {
    return { operator: '$gt', value }
  } else if (operator === '$gte') {
    return { operator: '$gte', value }
  } else if (operator === '$lt') {
    return { operator: '$lt', value }
  } else if (operator === '$lte') {
    return { operator: '$lte', value }
  } else if (operator === '$iLike') {
    return { operator: '$iLike', value: `%${value}%` }
  }

  return { operator: '$eq', value }
}

function addRule() {
  const fieldName = Object.keys(fieldChoices)[0]
  const fieldType = fieldTypes[collection.fields[fieldName].type]

  simpleWhere.value.push({
    fieldName,
    operator: '$eq',
    value: fieldType === 'boolean' ? false : fieldType === 'number' ? 0 : '',
  })
}
</script>
