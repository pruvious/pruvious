<template>
  <div v-if="!options.ui.hidden">
    {{ label }}
    <Icon
      v-if="translatable && synced"
      v-pui-tooltip="
        __('pruvious-dashboard', 'Changes made to this field will automatically sync across all translations.')
      "
      mode="svg"
      name="tabler:language"
      class="pui-muted"
    />
  </div>
</template>

<script lang="ts" setup>
import { __, dashboardBasePath, maybeTranslate } from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import { isDefined, titleCase } from '@pruvious/utils'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Number,
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
    type: Object as PropType<SerializableFieldOptions<'timestamp'>>,
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
  'commit': [value: number]
  'update:modelValue': [value: number]
}>()

const id = useId()
const label = computed(() =>
  isDefined(props.options.ui.label)
    ? maybeTranslate(props.options.ui.label)
    : __('pruvious-dashboard', titleCase(props.name, false) as any),
)
const description = computed(() =>
  puiMarkdown(maybeTranslate(props.options.ui.description) ?? '', { basePath: dashboardBasePath }),
)
const placeholder = computed(() => maybeTranslate(props.options.ui.placeholder))
</script>
