<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="[
      { value: 'eq', label: __('pruvious-dashboard', 'Equals') },
      { value: 'ne', label: __('pruvious-dashboard', 'Does not equal') },
    ]"
    :options="options"
    @commit="$emit('commit', { ...$event, value: prepareEmitValue(sanitized) })"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <PruviousFields
      v-if="data"
      v-model:conditionalLogic="conditionalLogic"
      v-model:modelValue="data"
      :conditionalLogicResolver="conditionalLogicResolver"
      :data="data"
      :dataContainerName="collection.name"
      :fields="fieldDefinitions"
      :layout="[props.name]"
      :syncedFields="collection.definition.syncedFields"
      :translatable="collection.definition.translatable"
      @commit="$emit('commit', { ...modelValue, value: prepareEmitValue($event[name]) })"
      @queueConditionalLogicUpdate="queueConditionalLogicUpdate($event)"
      @update:modelValue="(_, path) => queueConditionalLogicUpdate(path)"
      dataContainerType="collection"
      operation="update"
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __, parseConditionalLogic, type WhereField } from '#pruvious/client'
import type { Collections, SerializableCollection, SerializableFieldOptions } from '#pruvious/server'
import { ConditionalLogicResolver } from '@pruvious/orm/conditional-logic-resolver'
import { isDefined, isNull, isObject, isString, isUndefined, remap, toArray } from '@pruvious/utils'
import { useDebounceFn } from '@vueuse/core'

const props = defineProps({
  /**
   * The current where condition.
   */
  modelValue: {
    type: Object as PropType<WhereField>,
    required: true,
  },

  /**
   * The field name defined in a collection.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'nullableObject'>>,
    required: true,
  },

  /**
   * The name and definition of the current translatable collection.
   */
  collection: {
    type: Object as PropType<{ name: keyof Collections; definition: SerializableCollection }>,
    required: true,
  },
})

const emit = defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const sanitized = computed<Record<string, any> | null>(() => {
  let v: any = props.modelValue.value
  if (isString(v)) {
    try {
      v = JSON.parse(v)
    } catch {
      v = {}
    }
  }
  return isObject(v) || isNull(v) ? v : null
})
const data = ref({ [props.name]: sanitized.value })
const conditionalLogicResolver = new ConditionalLogicResolver()
let conditionalLogicDependencies: Record<string, boolean> = {}
const conditionalLogic = ref(resolveConditionalLogic())
const conditionalLogicUpdateQueue = new Set<(string & {}) | '$resolve' | '$reset'>()
const fieldDefinitions = computed(() =>
  remap(props.collection.definition.fields, (fieldName, options) => [
    fieldName,
    { ...options, ui: { ...options.ui, hidden: false } },
  ]),
)

emit('commit', {
  ...props.modelValue,
  operator: ['eq', 'ne'].includes(props.modelValue.operator) ? props.modelValue.operator : 'eq',
  value: prepareEmitValue(sanitized.value),
})

watch(
  () => props.modelValue.operator,
  () => {
    emit('commit', { ...props.modelValue, value: prepareEmitValue(sanitized.value) })
  },
  { immediate: true },
)

function resolveConditionalLogic(reset = true) {
  conditionalLogicResolver.setInput(data.value)
  conditionalLogicDependencies = {}
  if (reset) {
    conditionalLogicResolver.setConditionalLogic(parseConditionalLogic({ [props.name]: props.options }, data.value))
  }
  return conditionalLogicResolver.resolve()
}

function queueConditionalLogicUpdate(path?: (string & {}) | string[] | '$resolve' | '$reset') {
  if (isUndefined(path) || path === '$resolve') {
    conditionalLogicUpdateQueue.add('$resolve')
  } else if (path === '$reset') {
    conditionalLogicUpdateQueue.add('$reset')
  } else {
    toArray(path).forEach((p) => conditionalLogicUpdateQueue.add(p))
  }
  updateConditionalLogicDebounced()
}

const updateConditionalLogicDebounced = useDebounceFn(() => {
  const queue = [...conditionalLogicUpdateQueue]
  conditionalLogicUpdateQueue.clear()
  if (queue.some((path) => path === '$reset')) {
    conditionalLogic.value = resolveConditionalLogic(true)
  } else {
    if (queue.some((path) => isString(path) && !isDefined(conditionalLogicDependencies[path]))) {
      const parsedConditionalLogic = parseConditionalLogic({ [props.name]: props.options }, data.value)
      for (const from of Object.keys(parsedConditionalLogic)) {
        conditionalLogicDependencies[from] ??= false
        const referencedFieldPaths = conditionalLogicResolver.getReferencedFieldPaths(from)
        for (const to of referencedFieldPaths) {
          conditionalLogicDependencies[to] = true
        }
      }
    }
    if (queue.some((path) => path === '$resolve' || conditionalLogicDependencies[path])) {
      conditionalLogic.value = conditionalLogicResolver.setInput(data.value).resolve()
    }
  }
}, 50)

function prepareEmitValue(value: Record<string, any> | null): string {
  return JSON.stringify(value)
}
</script>
