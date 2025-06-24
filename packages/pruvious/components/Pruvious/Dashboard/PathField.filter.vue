<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="operatorChoices"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <div v-if="modelValue.value !== undefined" class="pui-row">
      <PUIInput
        v-if="modelValue.value !== null"
        :id="id"
        :modelValue="modelValue.value === null ? '' : String(modelValue.value)"
        :name="id"
        :placeholder="modelValue.value === null ? 'NULL' : placeholder"
        @blur="(_, value) => $emit('commit', { ...modelValue, value })"
        @update:modelValue="$emit('update:modelValue', { ...modelValue, value: $event })"
        ref="input"
        class="pui-flex-1"
      >
        <template v-if="prefix && modelValue.value !== null" #prefix>
          <span @click="input?.input?.focus()" class="p-path-prefix pui-muted">{{ prefix }}</span>
        </template>
      </PUIInput>

      <PUIButtonGroup
        :choices="[
          { value: false, label: offLabel },
          { value: true, label: onLabel },
        ]"
        :id="`${id}--switch`"
        :modelValue="modelValue.value !== null"
        :name="`${id}--switch`"
        :variant="options.ui.switch?.variant"
        @update:modelValue="
          (value) => {
            const operator = !value && !['eq', 'ne'].includes(modelValue.operator) ? 'eq' : modelValue.operator
            $emit('update:modelValue', { ...modelValue, value: value ? lastString : null, operator })
            $emit('commit', { ...modelValue, value: value ? lastString : null, operator })
          }
        "
        class="p-switch"
      />
    </div>
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import {
  __,
  getValidFilterOperators,
  maybeTranslate,
  primaryLanguage,
  useDashboardContentLanguage,
  type WhereField,
} from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import { isDefined, isNull, isString } from '@pruvious/utils'

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
    type: Object as PropType<SerializableFieldOptions<'nullableText'>>,
    required: true,
  },

  /**
   * The prefix to display before the input value.
   */
  prefix: {
    type: String,
  },
})

const emit = defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const input = useTemplateRef('input')
const { prefixPrimaryLanguage } = useRuntimeConfig().public.pruvious
const language = useDashboardContentLanguage()
const offLabel = isDefined(props.options.ui.switch?.offLabel)
  ? maybeTranslate(props.options.ui.switch.offLabel)
  : __('pruvious-dashboard', 'Off')
const onLabel = isDefined(props.options.ui.switch?.onLabel)
  ? maybeTranslate(props.options.ui.switch.onLabel)
  : __('pruvious-dashboard', 'On')
const placeholder = maybeTranslate(props.options.ui.placeholder)
const prefix = props.prefix ?? (language.value !== primaryLanguage || prefixPrimaryLanguage ? `/${language.value}` : '')
const operatorChoices: Ref<ReturnType<typeof getValidFilterOperators>> = ref([])
const lastString = ref('')

watch(
  () => props.modelValue.value,
  (value) => {
    operatorChoices.value = isNull(value)
      ? getValidFilterOperators(props.options).filter(({ value }) => ['eq', 'ne'].includes(value))
      : getValidFilterOperators(props.options)

    if (!operatorChoices.value.some(({ value }) => value === props.modelValue.operator)) {
      emit('update:modelValue', { ...props.modelValue, operator: 'eq' })
      emit('commit', { ...props.modelValue, operator: 'eq' })
    }

    if (isString(value)) {
      lastString.value = value
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.p-switch {
  width: auto;
}

.p-path-prefix {
  margin-right: 0;
}

.p-path-prefix + :deep(.pui-input-control) {
  padding-left: 0;
}
</style>
