<template>
  <div class="p-table-columns-configurator">
    <PUIStructure v-model="columns" @update:modelValue="emitCommit()">
      <template #header="{ index }">
        <span class="pui-muted pui-truncate">{{ index + 1 }}. {{ __('pruvious-dashboard', 'Column') }}</span>
        <div class="p-table-columns-configurator-actions">
          <PUIButton
            v-if="columns.length > 1"
            v-pui-tooltip="__('pruvious-dashboard', 'Delete')"
            :size="-2"
            @click="
              () => {
                columns.splice(index, 1)
                emitCommit()
              }
            "
            destructiveHover
            variant="ghost"
          >
            <Icon mode="svg" name="tabler:trash" />
          </PUIButton>
        </div>
      </template>

      <template #item="{ item }">
        <div class="pui-row">
          <PUISelect
            :choices="
              columnChoices.map((choice) =>
                choice.value === item.name || columns.every(({ name }) => name !== choice.value)
                  ? choice
                  : { ...choice, disabled: true },
              )
            "
            :id="`${id}-${item.name}-name`"
            :modelValue="item.name"
            :name="id"
            @commit="
              (value) => {
                item.name = value as any
                emitCommit()
              }
            "
          />

          <div v-if="typeof item.width === 'number'" class="pui-shrink-0">
            <PUINumber
              :id="`${id}-${item.name}-custom-width`"
              :min="64"
              :modelValue="item.width"
              :name="`${id}-${item.name}-custom-width`"
              @commit="
                (value) => {
                  item.width = value
                  emitCommit()
                }
              "
              @update:modelValue="
                (value) => {
                  item.width = value
                }
              "
              autoWidth
              showDragButton
              suffix="px"
            />
          </div>

          <PUIIconGroup
            :choices="[
              { value: true, icon: 'forms', title: __('pruvious-dashboard', 'Fixed width') },
              { value: null, icon: 'arrow-autofit-width', title: __('pruvious-dashboard', 'Auto width') },
            ]"
            :id="`${id}-${item.name}-width`"
            :modelValue="item.width === null ? null : item.width !== false"
            :name="`${id}-${item.name}-width`"
            @update:modelValue="
              (value) => {
                item.width = value ? 256 : null
                emitCommit()
              }
            "
            showTooltips
          />
        </div>
      </template>
    </PUIStructure>

    <PUIButton :disabled="columnChoices.length === columns.length" @click="addColumn()" variant="outline">
      <Icon mode="svg" name="tabler:plus" />
      <span>{{ __('pruvious-dashboard', 'Column') }}</span>
    </PUIButton>
  </div>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/client'
import type { Collections, SerializableCollection } from '#pruvious/server'
import { isNull, isNumber, isUndefined } from '@pruvious/utils'

interface Column {
  name: string
  label: string
  width: number | null | false
  _width?: string
  _minWidth?: string
}

const props = defineProps({
  /**
   * The columns configuration.
   */
  modelValue: {
    type: Object as PropType<PUIColumns>,
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
   * The available column choices.
   */
  columnChoices: {
    type: Array as PropType<{ label: string; value: string }[]>,
    required: true,
  },
})

const emit = defineEmits<{
  'commit': [columns: PUIColumns]
  'update:modelValue': [columns: PUIColumns]
}>()

const id = useId()
const columns = ref<Column[]>([])

watch(
  () => props.modelValue,
  () => {
    columns.value = fromModelValue()
  },
  { immediate: true },
)

function addColumn() {
  const columnChoice = props.columnChoices.find(({ value }) => columns.value.every(({ name }) => name !== value))

  if (columnChoice) {
    columns.value.push({
      name: columnChoice.value,
      label: columnChoice.label,
      width: null,
    })
    emitCommit()
  }
}

function resolveSortable(columnName: string): 'text' | 'numeric' | false {
  const field = props.collection.definition.fields[columnName]
  return field ? (field.__dataType === 'text' ? 'text' : 'numeric') : false
}

function emitCommit() {
  emit('commit', toModelValue())
}

function fromModelValue(): Column[] {
  return Object.entries(props.modelValue)
    .filter(([name]) => props.columnChoices.some(({ value }) => value === name))
    .map(([name, column]) => ({
      name,
      label: props.columnChoices.find(({ value }) => value === name)!.label,
      width: isUndefined(column.width) ? null : /[1-9][0-9]*px/.test(column.width) ? +column.width.slice(0, -2) : false,
      _width: column.width,
      _minWidth: column.minWidth,
      _key: name,
    }))
}

function toModelValue(): PUIColumns {
  return columns.value.reduce<PUIColumns>((acc, { name, label, width, _width, _minWidth }) => {
    acc[name] = {
      label,
      width: isNumber(width) ? `${width}px` : isNull(width) ? undefined : _width,
      minWidth: isNumber(width) ? undefined : _minWidth,
      sortable: resolveSortable(name),
      TType: undefined,
    }
    return acc
  }, {})
}
</script>

<style scoped>
.p-table-columns-configurator :where(.p-table-columns-configurator-actions) {
  display: none;
  gap: 0.25rem;
  margin-left: auto;
}

.p-table-columns-configurator > *:not(.pui-structure-empty) + * {
  margin-top: 0.75rem;
}

.p-table-columns-configurator
  :deep(.pui-structure-item:hover > .pui-structure-item-header > .p-table-columns-configurator-actions) {
  display: flex;
}
</style>
