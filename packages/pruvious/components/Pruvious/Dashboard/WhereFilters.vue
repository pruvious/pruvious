<template>
  <PUIStructure :isDraggable="false" :modelValue="[{}]">
    <template #header>
      <PUIButton
        v-if="where.length"
        v-pui-tooltip="__('pruvious-dashboard', 'Toggle relation')"
        :size="-2"
        @click="toggleRelation()"
        variant="secondary"
        class="pui-uppercase"
      >
        <span v-if="relation === 'and'">{{ __('pruvious-dashboard', 'and') }}</span>
        <span v-else>{{ __('pruvious-dashboard', 'or') }}</span>
      </PUIButton>
      <span v-if="where.length && relation === 'and'" class="pui-muted pui-truncate">
        {{ __('pruvious-dashboard', 'All of the following conditions must be met') }}
      </span>
      <span v-else-if="where.length && relation === 'or'" class="pui-muted pui-truncate">
        {{ __('pruvious-dashboard', 'At least one of the following conditions must be met') }}
      </span>
      <span v-else class="pui-muted pui-truncate">
        {{ __('pruvious-dashboard', 'No conditions set') }}
      </span>
    </template>

    <template #item>
      <div class="p-where-filters">
        <PUIStructure
          :dropItemsHereLabel="__('pruvious-dashboard', 'Drop items here')"
          :modelValue="where"
          @update:modelValue="
            (value) => {
              where = value
              emitCommit()
            }
          "
          allowCrossDrop
        >
          <template #header="{ item, index }">
            <span class="pui-muted pui-truncate">
              {{ index + 1 }}.
              {{
                'field' in item ? __('pruvious-dashboard', 'Condition') : __('pruvious-dashboard', 'Condition group')
              }}
            </span>
            <div class="p-where-filter-actions">
              <PUIButton
                v-pui-tooltip="__('pruvious-dashboard', 'Duplicate')"
                :size="-2"
                @click="duplicate(index)"
                variant="ghost"
              >
                <Icon mode="svg" name="tabler:copy" />
              </PUIButton>
              <PUIButton
                v-pui-tooltip="__('pruvious-dashboard', 'Delete')"
                :size="-2"
                @click="
                  () => {
                    where.splice(index, 1)
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

          <template #item="{ item, index }">
            <PruviousDashboardWhereFiltersCondition
              v-if="'field' in item"
              :collection="collection"
              :fieldChoices="fieldChoices"
              :modelValue="item"
              @commit="
                (value) => {
                  where[index] = value
                  emitCommit()
                }
              "
              @update:modelValue="
                (value) => {
                  where[index] = value
                  emitModelValue()
                }
              "
            />

            <PruviousDashboardWhereFiltersGroup
              v-else-if="'and' in item || 'or' in item"
              :collection="collection"
              :fieldChoices="fieldChoices"
              :modelValue="item"
              @commit="
                (value) => {
                  where[index] = value
                  emitCommit()
                }
              "
              @update:modelValue="
                (value) => {
                  where[index] = value
                  emitModelValue()
                }
              "
            />
          </template>
        </PUIStructure>

        <div class="pui-row">
          <PUIButton @click="addCondition()" variant="outline" class="p-where-filters-large-button">
            <Icon mode="svg" name="tabler:plus" />
            <span>{{ __('pruvious-dashboard', 'Condition') }}</span>
          </PUIButton>

          <PUIButton
            v-pui-tooltip="__('pruvious-dashboard', 'Add condition')"
            @click="addCondition()"
            variant="outline"
            class="p-where-filters-small-button"
          >
            <Icon mode="svg" name="tabler:plus" />
          </PUIButton>

          <PUIButton @click="addOrGroup()" variant="outline" class="p-where-filters-large-button">
            <Icon mode="svg" name="tabler:copy-plus" />
            <span>{{ __('pruvious-dashboard', 'Condition group') }}</span>
          </PUIButton>

          <PUIButton
            v-pui-tooltip="__('pruvious-dashboard', 'Add condition group')"
            @click="addOrGroup()"
            variant="outline"
            class="p-where-filters-small-button"
          >
            <Icon mode="svg" name="tabler:copy-plus" />
          </PUIButton>
        </div>
      </div>
    </template>
  </PUIStructure>
</template>

<script lang="ts" setup>
import { __, filterOperatorsMap } from '#pruvious/client'
import type { Collections, SerializableCollection } from '#pruvious/server'
import type { WhereField as _WhereField } from '@pruvious/orm'
import { deepClone, invertMap, isEmpty, isString, nanoid, omit, walkObjects } from '@pruvious/utils'
import type { WhereOrGroupSimplified } from './TableSettingsPopup.vue'
import type { WhereAndGroup, WhereField, WhereOrGroup } from './WhereFiltersGroup.vue'

const props = defineProps({
  /**
   * The current where conditions.
   */
  modelValue: {
    type: Array as PropType<(_WhereField | WhereOrGroupSimplified)[]>,
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
  'commit': [where: (_WhereField | WhereOrGroupSimplified)[]]
  'update:modelValue': [where: (_WhereField | WhereOrGroupSimplified)[]]
}>()

defineExpose({ refresh })

const invertedFilterOperatorsMap = invertMap(filterOperatorsMap)
const relation = ref<'and' | 'or'>('and')
const where = ref<(WhereField | WhereAndGroup | WhereOrGroup)[]>(fromModelValue(props.modelValue))

function addCondition() {
  const newCondition: WhereField = { $key: nanoid(), field: props.fieldChoices[0]!.value, operator: 'eq', value: '' }
  where.value.push(newCondition)
  emitModelValue()
}

function addOrGroup() {
  const newCondition: WhereOrGroup = {
    $key: nanoid(),
    or: [[{ $key: nanoid(), field: props.fieldChoices[0]!.value, operator: 'eq', value: '' }]],
  }
  where.value.push(newCondition)
  emitModelValue()
}

function toggleRelation() {
  relation.value = relation.value === 'and' ? 'or' : 'and'
  emit('commit', prepareEmitValue())
}

function duplicate(index: number) {
  const item = where.value[index]
  const clone = deepClone(item)!

  for (const { object } of walkObjects(clone)) {
    if ('$key' in object) {
      object.$key = nanoid()
    }
  }

  where.value.splice(index, 0, clone)
  emitModelValue()
}

function prepareEmitValue() {
  return relation.value === 'and'
    ? toModelValue(where.value)
    : toModelValue([{ or: where.value.map((item) => [item]) } as WhereOrGroup])
}

function fromModelValue(
  where: (_WhereField | WhereOrGroupSimplified)[],
): (WhereField | WhereAndGroup | WhereOrGroup)[] {
  const result = _fromModelValue(where)

  if (result.length === 1 && 'or' in result[0]!) {
    relation.value = 'or'
    nextTick(() => emit('commit', prepareEmitValue()))
    return result[0].or.flat()
  }

  return result
}

function _fromModelValue(
  where: (_WhereField | WhereOrGroupSimplified)[],
): (WhereField | WhereAndGroup | WhereOrGroup)[] {
  const result: (WhereField | WhereAndGroup | WhereOrGroup)[] = []

  for (const item of where) {
    if ('or' in item) {
      if (item.or.length === 1) {
        result.push(..._fromModelValue(item.or[0]!))
      } else {
        const orGroup: WhereOrGroup = { $key: nanoid(), or: [] }

        for (const andGroup of item.or) {
          if (andGroup.length === 1) {
            orGroup.or.push(_fromModelValue([andGroup[0]!]))
          } else {
            orGroup.or.push([{ $key: nanoid(), and: andGroup.map((andItem) => _fromModelValue([andItem])) }])
          }
        }

        result.push(orGroup)
      }
    } else {
      let operator = invertedFilterOperatorsMap[item.operator]
      let value = item.value

      if (!operator) {
        // @todo handle "includes" | "includesAny" | "excludes" | "excludesAny" | "in" | "notIn" | "between" | "notBetween"
      }

      if (operator) {
        if (isString(value)) {
          if (item.operator === 'like' || item.operator === 'ilike') {
            if (value.startsWith('%') && value.endsWith('%')) {
              operator = item.operator === 'like' ? 'contains' : 'containsI'
              value = value.slice(1, -1)
            } else if (value.startsWith('%')) {
              operator = item.operator === 'like' ? 'endsWith' : 'endsWithI'
              value = value.slice(1)
            } else if (value.endsWith('%')) {
              operator = item.operator === 'like' ? 'startsWith' : 'startsWithI'
              value = value.slice(0, -1)
            } else {
              operator = item.operator === 'like' ? 'eq' : 'eqi'
            }
          } else if (item.operator === 'notLike' || item.operator === 'notIlike') {
            value = value.slice(1, -1)
          }
        }

        result.push({ ...item, $key: nanoid(), operator, value })
      }
    }
  }

  return result
}

function toModelValue(where: (WhereField | WhereAndGroup | WhereOrGroup)[]): (_WhereField | WhereOrGroupSimplified)[] {
  const prepared: (_WhereField | WhereOrGroupSimplified)[] = []

  for (const item of where) {
    if ('and' in item) {
      prepared.push(...toModelValue(item.and.flat()))
    } else if ('or' in item) {
      if (!isEmpty(item.or)) {
        if (item.or.length === 1) {
          prepared.push(...toModelValue(item.or[0]!))
        } else {
          prepared.push({ or: item.or.map((orGroup) => toModelValue(orGroup)) })
        }
      }
    } else {
      let operator = filterOperatorsMap[item.operator]
      let value = item.value

      if (value === '' && operator !== '=' && operator !== '!=') {
        continue
      }

      if (isString(value)) {
        if (item.operator === 'contains') {
          operator = 'like'
          value = `%${value}%`
        } else if (item.operator === 'containsI') {
          operator = 'ilike'
          value = `%${value}%`
        } else if (item.operator === 'startsWith') {
          operator = 'like'
          value = `${value}%`
        } else if (item.operator === 'startsWithI') {
          operator = 'ilike'
          value = `${value}%`
        } else if (item.operator === 'endsWith') {
          operator = 'like'
          value = `%${value}`
        } else if (item.operator === 'endsWithI') {
          operator = 'ilike'
          value = `%${value}`
        } else if (item.operator === 'eqi') {
          operator = 'ilike'
        } else if (item.operator === 'notContains') {
          operator = 'notLike'
          value = `%${value}%`
        } else if (item.operator === 'notContainsI') {
          operator = 'notIlike'
          value = `%${value}%`
        }
      }

      prepared.push({ ...omit(item, ['$key']), operator, value })
    }
  }

  return prepared
}

function emitCommit() {
  const value = prepareEmitValue()
  emit('commit', value)
}

function emitModelValue() {
  const value = prepareEmitValue()
  emit('update:modelValue', value)
}

function refresh() {
  where.value = fromModelValue(props.modelValue)
}
</script>

<style scoped>
.p-where-filters > *:not(.pui-structure-empty) + *,
.p-where-filters > .pui-structure-dropzone + * {
  margin-top: 0.75rem;
}

.p-where-filters :where(.p-where-filter-actions) {
  display: none;
  gap: 0.25rem;
  margin-left: auto;
}

.p-where-filters :deep(.pui-structure-item:hover > .pui-structure-item-header > .p-where-filter-actions) {
  display: flex;
}

.p-where-filters-small-button {
  display: none;
}

@media (max-width: 480px) {
  .p-where-filters-large-button {
    display: none;
  }

  .p-where-filters-small-button {
    display: inline-flex;
  }
}
</style>
