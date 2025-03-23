<template>
  <div class="p-order-by">
    <PUIStructure v-model="orderBy" @update:modelValue="emitCommit()">
      <template #header="{ index }">
        <span class="pui-muted pui-truncate">{{ index + 1 }}. {{ __('pruvious-dashboard', 'Sorting') }}</span>
        <div class="p-order-by-actions">
          <PUIButton
            v-pui-tooltip="__('pruvious-dashboard', 'Delete')"
            :size="-2"
            @click="
              () => {
                orderBy.splice(index, 1)
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
                choice.value === item.field || orderBy.every(({ field }) => field !== choice.value)
                  ? choice
                  : { ...choice, disabled: true },
              )
            "
            :id="`${id}-${item.field}-field`"
            :modelValue="item.field"
            :name="id"
            @commit="
              (value) => {
                const field = String(value)
                const orderBy = resolveOrderBy(field)
                item.field = field
                item.type = orderBy.type
                item.direction = orderBy.direction
                item.nulls = orderBy.nulls
                emitCommit()
              }
            "
          />

          <PUIIconGroup
            v-model="item.direction"
            :choices="[
              {
                value: 'asc',
                icon: item.type === 'text' ? 'sort-ascending-letters' : 'sort-ascending-numbers',
                title: __('pruvious-dashboard', 'Sort in ascending order'),
              },
              {
                value: 'desc',
                icon: item.type === 'text' ? 'sort-descending-letters' : 'sort-descending-numbers',
                title: __('pruvious-dashboard', 'Sort in descending order'),
              },
            ]"
            :id="`${id}-${item.field}-direction`"
            :name="`${id}-${item.field}-direction`"
            @update:modelValue="emitCommit()"
            showTooltips
            variant="accent"
          />

          <PUIIconGroup
            v-if="item.nulls"
            v-model="item.nulls"
            :choices="[
              {
                value: 'nullsFirst',
                icon: 'sort-ascending-small-big',
                title: __('pruvious-dashboard', 'Sort NULL values first'),
              },
              {
                value: 'nullsLast',
                icon: 'sort-descending-small-big',
                title: __('pruvious-dashboard', 'Sort NULL values last'),
              },
            ]"
            :id="`${id}-${item.field}-nulls`"
            :name="`${id}-${item.field}-nulls`"
            @update:modelValue="emitCommit()"
            showTooltips
            variant="accent"
          />
        </div>
      </template>
    </PUIStructure>

    <div v-if="!orderBy.length" class="pui-muted pui-truncate">
      {{ __('pruvious-dashboard', 'No sorting applied') }}
    </div>

    <PUIButton :disabled="fieldChoices.length === orderBy.length" @click="addColumn()" variant="outline">
      <Icon mode="svg" name="tabler:plus" />
      <span>{{ __('pruvious-dashboard', 'Sorting') }}</span>
    </PUIButton>
  </div>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/client'
import type { Collections, SerializableCollection } from '#pruvious/server'
import type { TableSettings } from './TableSettingsPopup.vue'

interface OrderBy {
  field: string
  type: 'text' | 'numeric'
  direction: 'asc' | 'desc'
  nulls: 'nullsFirst' | 'nullsLast' | undefined
}

const props = defineProps({
  /**
   * The `orderBy` configuration.
   */
  modelValue: {
    type: Object as PropType<TableSettings['orderBy']>,
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
  'commit': [columns: TableSettings['orderBy']]
  'update:modelValue': [columns: TableSettings['orderBy']]
}>()

const id = useId()
const orderBy = ref<OrderBy[]>([])

watch(
  () => props.modelValue,
  () => {
    orderBy.value = fromModelValue()
  },
  { immediate: true },
)

function addColumn() {
  const columnChoice = props.fieldChoices.find(({ value }) => orderBy.value.every(({ field }) => field !== value))

  if (columnChoice) {
    orderBy.value.push(resolveOrderBy(columnChoice.value))
    emitCommit()
  }
}

function resolveOrderBy(field: string): OrderBy {
  const fieldDefinition = props.collection.definition.fields[field]!

  return {
    field,
    type: fieldDefinition._dataType === 'text' ? 'text' : 'numeric',
    direction: 'asc',
    nulls: fieldDefinition.nullable ? 'nullsFirst' : undefined,
  }
}

function emitCommit() {
  emit('commit', toModelValue())
}

function fromModelValue(): OrderBy[] {
  return props.modelValue
    .filter(({ field }) => props.fieldChoices.some(({ value }) => value === field))
    .map(({ field, direction, nulls }) => {
      const fieldDefinition = props.collection.definition.fields[field]!
      const _direction = direction ?? 'asc'
      const _nulls = fieldDefinition.nullable
        ? nulls === 'nullsAuto' || !nulls
          ? _direction === 'asc'
            ? 'nullsFirst'
            : 'nullsLast'
          : nulls
        : undefined

      return {
        field,
        type: fieldDefinition._dataType === 'text' ? 'text' : 'numeric',
        direction: _direction,
        nulls: _nulls,
      }
    })
}

function toModelValue(): TableSettings['orderBy'] {
  return orderBy.value.map(({ field, direction, nulls }) => ({
    field,
    direction,
    nulls:
      (nulls === 'nullsFirst' && direction === 'asc') || (nulls === 'nullsLast' && direction === 'desc')
        ? 'nullsAuto'
        : (nulls ?? 'nullsAuto'),
  }))
}
</script>

<style scoped>
.p-order-by :where(.p-order-by-actions) {
  display: none;
  gap: 0.25rem;
  margin-left: auto;
}

.p-order-by > * + * {
  margin-top: 0.75rem;
}

.p-order-by :deep(.pui-structure-item:hover > .pui-structure-item-header > .p-order-by-actions) {
  display: flex;
}
</style>
