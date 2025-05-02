<template>
  <div class="p-table-columns-configurator">
    <PUIStructure v-model="columns" @update:modelValue="emitCommit()">
      <template #header="{ index }">
        <span class="pui-muted pui-truncate">{{ index + 1 }}. {{ __('pruvious-dashboard', 'Column') }}</span>
        <div class="p-table-columns-configurator-actions">
          <PUIButton
            v-if="columns.length > 1"
            v-pui-tooltip="__('pruvious-dashboard', 'Move up')"
            :disabled="index === 0"
            :size="-2"
            @click="
              () => {
                columns = columns.map((item, i) => {
                  if (i === index - 1) {
                    return columns[index]!
                  } else if (i === index) {
                    return columns[index - 1]!
                  }
                  return item
                })
                emitCommit()
              }
            "
            variant="ghost"
          >
            <Icon mode="svg" name="tabler:chevron-up" />
          </PUIButton>

          <PUIButton
            v-if="columns.length > 1"
            v-pui-tooltip="__('pruvious-dashboard', 'Move down')"
            :disabled="index === columns.length - 1"
            :size="-2"
            @click="
              () => {
                columns = columns.map((item, i) => {
                  if (i === index + 1) {
                    return columns[index]!
                  } else if (i === index) {
                    return columns[index + 1]!
                  }
                  return item
                })
                emitCommit()
              }
            "
            variant="ghost"
          >
            <Icon mode="svg" name="tabler:chevron-down" />
          </PUIButton>

          <PUIButton
            v-pui-tooltip="__('pruvious-dashboard', 'Add before')"
            :disabled="columns.length >= fieldChoices.length"
            :size="-2"
            @click="addColumn(index)"
            variant="ghost"
          >
            <Icon mode="svg" name="tabler:arrow-bar-to-up" />
          </PUIButton>

          <PUIButton
            v-pui-tooltip="__('pruvious-dashboard', 'Delete')"
            :disabled="columns.length < 2"
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
              fieldChoices.map((choice) =>
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
            variant="accent"
          />
        </div>
      </template>
    </PUIStructure>

    <PUIButton :disabled="fieldChoices.length === columns.length" @click="addColumn()" variant="outline">
      <Icon mode="svg" name="tabler:plus" />
      <span>{{ __('pruvious-dashboard', 'Column') }}</span>
    </PUIButton>
  </div>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/client'
import type { Collections, SerializableCollection } from '#pruvious/server'
import type { PUIColumns } from '@pruvious/ui/pui/table'
import { isNull, isNumber, isUndefined } from '@pruvious/utils'
import type { TableSettings } from './TableSettingsPopup.vue'

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
    type: Object as PropType<TableSettings['columns']>,
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
   * The available field choices.
   */
  fieldChoices: {
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

function addColumn(index?: number) {
  const columnChoice = props.fieldChoices.find(({ value }) => columns.value.every(({ name }) => name !== value))

  if (columnChoice) {
    columns.value.splice(index ?? columns.value.length, 0, {
      name: columnChoice.value,
      label: columnChoice.label,
      width: null,
    })
    emitCommit()
  }
}

function resolveSortable(columnName: string): 'text' | 'numeric' | false {
  const field = props.collection.definition.fields[columnName]
  return field ? (field._dataType === 'text' ? 'text' : 'numeric') : false
}

function emitCommit() {
  emit('commit', toModelValue())
}

function fromModelValue(): Column[] {
  return Object.entries(props.modelValue)
    .filter(([name]) => props.fieldChoices.some(({ value }) => value === name))
    .map(([name, column]) => ({
      name,
      label: props.fieldChoices.find(({ value }) => value === name)!.label,
      width: isUndefined(column.width) ? null : /[1-9][0-9]*px/.test(column.width) ? +column.width.slice(0, -2) : false,
      _width: column.width,
      _minWidth: column.minWidth,
      $key: name,
    }))
}

function toModelValue(): PUIColumns {
  return columns.value.reduce<PUIColumns>((acc, { name, width, _width, _minWidth }) => {
    acc[name] = {
      sortable: resolveSortable(name),
      width: isNumber(width) ? `${width}px` : isNull(width) ? undefined : _width,
      minWidth: isNumber(width) ? undefined : (_minWidth ?? '16rem'),
      TType: undefined,
    }
    return acc
  }, {})
}
</script>

<style scoped>
.p-table-columns-configurator :where(.p-table-columns-configurator-actions) {
  flex-shrink: 0;
  display: none;
  gap: 0.25rem;
  margin-left: auto;
}

.p-table-columns-configurator > *:not(.pui-structure-empty) + * {
  margin-top: 0.75rem;
}

.p-table-columns-configurator
  :deep(.pui-structure-item:hover > .pui-card-header > .pui-row > .p-table-columns-configurator-actions) {
  display: flex;
}
</style>
