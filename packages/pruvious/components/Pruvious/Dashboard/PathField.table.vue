<template>
  <div>
    <PruviousDashboardEditableFieldCell :cell="cell" :editable="editable" :name="name">
      <span
        v-if="typeof modelValue === 'string'"
        :title="modelValue"
        :class="{
          'pui-truncate': truncate.lines === 1,
          'pui-clamp': truncate.lines && truncate.lines > 1,
          'pui-hyphenate': options.ui.dataTable?.hyphenate,
        }"
        :style="{ '--pui-clamp': truncate.lines }"
      >
        <span v-if="prefix">{{ prefix }}</span>
        <span class="pui-unmuted">{{ path }}</span>
      </span>
      <span v-else>-</span>
    </PruviousDashboardEditableFieldCell>

    <PruviousDashboardEditTableFieldPopup
      v-if="isEditPopupVisible"
      :cell="cell"
      :collection="collection"
      :disabled="!editable"
      :modelValue="modelValue"
      :name="name"
      :options="options"
      @close="$event().then(() => (isEditPopupVisible = false))"
      @updated="refresh?.(true)"
    />
  </div>
</template>

<script lang="ts" setup>
import { primaryLanguage } from '#pruvious/client'
import type { Collections, SerializableCollection, SerializableFieldOptions } from '#pruvious/server'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
import { castToNumber, isDefined, isNull, isString } from '@pruvious/utils'

const props = defineProps({
  /**
   * The table cell props containing the row data, column definition, and other cell-related information.
   */
  cell: {
    type: Object as PropType<PUICell<PUIColumns>>,
    required: true,
  },

  /**
   * The casted field value.
   */
  modelValue: {
    type: [String, null],
  },

  /**
   * The field name defined in a collection.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'nullableText'>>,
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
   * Triggers a data refresh operation by executing the callback function with the current URL query parameters.
   *
   * The operation is skipped if the URL query parameters have not changed since the last refresh.
   * The `force` parameter can be used to force a refresh operation even if the URL query parameters have not changed.
   * By default, the operation is not forced.
   *
   * Returns a `Promise` that resolves when the refresh operation is complete.
   */
  refresh: {
    type: Function as PropType<(force?: boolean) => Promise<void>>,
  },

  /**
   * Specifies whether the field is editable.
   *
   * @default false
   */
  editable: {
    type: Boolean,
    default: false,
  },

  /**
   * The prefix to display before the input value.
   */
  prefix: {
    type: String,
  },
})

const route = useRoute()
const { prefixPrimaryLanguage } = useRuntimeConfig().public.pruvious
const truncate = computed<{ characters?: number; lines?: number; words?: number }>(() => {
  return isDefined(props.options.ui.dataTable?.truncate) ? props.options.ui.dataTable?.truncate : { lines: 1 }
})
const prefix = computed(() => {
  if (props.prefix) {
    return props.prefix
  }
  const language = props.name.replace('path', '').toLowerCase()
  return language !== primaryLanguage || prefixPrimaryLanguage ? `/${language}` : ''
})
const path = computed(() => {
  if (isNull(props.modelValue)) {
    return ''
  }
  let path = props.modelValue ?? ''
  if (isDefined(truncate.value.characters)) {
    path = path.length > truncate.value.characters ? `${path.slice(0, truncate.value.characters)}...` : path
  } else if (isDefined(truncate.value.words)) {
    path = path.split(' ').slice(0, truncate.value.words).join(' ')
    path = path.length > truncate.value.words ? `${path}...` : path
  }
  return path
})

const isEditPopupVisible = ref(false)

watch(
  () => route.query,
  () => {
    if (isString(route.query.edit)) {
      const [fieldName, id] = route.query.edit.split(':')
      if (fieldName === props.name && castToNumber(id) === props.cell.row.id) {
        isEditPopupVisible.value = true
      }
    }
  },
  { immediate: true },
)
</script>
