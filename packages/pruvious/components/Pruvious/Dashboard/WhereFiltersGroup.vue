<template>
  <PUIStructure :isDraggable="false" :modelValue="[{}]">
    <template #header>
      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'Toggle relation')"
        :size="-2"
        @click="toggleRelation()"
        variant="secondary"
        class="pui-uppercase"
      >
        <span v-if="'and' in modelValue">{{ __('pruvious-dashboard', 'and') }}</span>
        <span v-else>{{ __('pruvious-dashboard', 'or') }}</span>
      </PUIButton>
      <span v-if="'and' in modelValue" class="pui-muted pui-truncate">
        {{ __('pruvious-dashboard', 'All of the following conditions must be met') }}
      </span>
      <span v-else class="pui-muted pui-truncate">
        {{ __('pruvious-dashboard', 'At least one of the following conditions must be met') }}
      </span>
    </template>

    <template #item>
      <div class="p-where-filters">
        <PUIStructure
          :dropItemsHereLabel="__('pruvious-dashboard', 'Drop items here')"
          :modelValue="'and' in modelValue ? modelValue.and.flat() : modelValue.or.flat()"
          @update:modelValue="
            (value) => {
              const newValue =
                'and' in modelValue
                  ? { $key: props.modelValue.$key, and: value.map((v) => [v]) }
                  : { $key: props.modelValue.$key, or: value.map((v) => [v]) }
              emit('commit', newValue)
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
                    const newValue =
                      'and' in modelValue
                        ? { $key: props.modelValue.$key, and: modelValue.and.filter((_, i) => i !== index) }
                        : { $key: props.modelValue.$key, or: modelValue.or.filter((_, i) => i !== index) }
                    emit('commit', newValue)
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
                  const newValue =
                    'and' in modelValue
                      ? { $key: props.modelValue.$key, and: modelValue.and.map((v, i) => (i === index ? [value] : v)) }
                      : { $key: props.modelValue.$key, or: modelValue.or.map((v, i) => (i === index ? [value] : v)) }
                  emit('commit', newValue)
                }
              "
              @update:modelValue="
                (value) => {
                  const newValue =
                    'and' in modelValue
                      ? { $key: props.modelValue.$key, and: modelValue.and.map((v, i) => (i === index ? [value] : v)) }
                      : { $key: props.modelValue.$key, or: modelValue.or.map((v, i) => (i === index ? [value] : v)) }
                  emit('update:modelValue', newValue)
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
                  const newValue =
                    'and' in modelValue
                      ? { $key: props.modelValue.$key, and: modelValue.and.map((v, i) => (i === index ? [value] : v)) }
                      : { $key: props.modelValue.$key, or: modelValue.or.map((v, i) => (i === index ? [value] : v)) }
                  emit('commit', newValue)
                }
              "
              @update:modelValue="
                (value) => {
                  const newValue =
                    'and' in modelValue
                      ? { $key: props.modelValue.$key, and: modelValue.and.map((v, i) => (i === index ? [value] : v)) }
                      : { $key: props.modelValue.$key, or: modelValue.or.map((v, i) => (i === index ? [value] : v)) }
                  emit('update:modelValue', newValue)
                }
              "
            />
          </template>
        </PUIStructure>

        <div class="p-where-filters-buttons pui-row">
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
import { __, type FilterOperator } from '#pruvious/client'
import type { Collections, SerializableCollection } from '#pruvious/server'
import type { WhereField as _WhereField } from '@pruvious/orm'
import { deepClone, nanoid, walkObjects } from '@pruvious/utils'

export type WhereField = Omit<_WhereField, 'operator'> & { $key: string; operator: FilterOperator }

export interface WhereAndGroup {
  $key: string
  and: (WhereField | WhereOrGroup | WhereAndGroup)[][]
}

export interface WhereOrGroup {
  $key: string
  or: (WhereField | WhereOrGroup | WhereAndGroup)[][]
}

const props = defineProps({
  /**
   * The current where conditions.
   */
  modelValue: {
    type: Object as PropType<WhereAndGroup | WhereOrGroup>,
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
  'commit': [where: WhereAndGroup | WhereOrGroup]
  'update:modelValue': [where: WhereAndGroup | WhereOrGroup]
}>()

function addCondition() {
  const newCondition: WhereField = { $key: nanoid(), field: props.fieldChoices[0]!.value, operator: 'eq', value: '' }
  const newValue =
    'and' in props.modelValue
      ? { $key: props.modelValue.$key, and: [...props.modelValue.and, [newCondition]] }
      : { $key: props.modelValue.$key, or: [...props.modelValue.or, [newCondition]] }

  emit('update:modelValue', newValue)
}

function addOrGroup() {
  const newCondition: WhereOrGroup = {
    $key: nanoid(),
    or: [[{ $key: nanoid(), field: props.fieldChoices[0]!.value, operator: 'eq', value: '' }]],
  }
  const newValue =
    'and' in props.modelValue
      ? { $key: props.modelValue.$key, and: [...props.modelValue.and, [newCondition]] }
      : { $key: props.modelValue.$key, or: [...props.modelValue.or, [newCondition]] }

  emit('update:modelValue', newValue)
}

function toggleRelation() {
  const newValue =
    'and' in props.modelValue
      ? { $key: props.modelValue.$key, or: props.modelValue.and }
      : { $key: props.modelValue.$key, and: props.modelValue.or }

  emit('commit', newValue)
}

function duplicate(index: number) {
  const item = 'and' in props.modelValue ? props.modelValue.and[index] : props.modelValue.or[index]
  const clone = deepClone(item)!

  for (const { object } of walkObjects(clone)) {
    if ('$key' in object) {
      object.$key = nanoid()
    }
  }

  const newValue =
    'and' in props.modelValue
      ? {
          $key: props.modelValue.$key,
          and: [...props.modelValue.and.slice(0, index), clone, ...props.modelValue.and.slice(index)],
        }
      : {
          $key: props.modelValue.$key,
          or: [...props.modelValue.or.slice(0, index), clone, ...props.modelValue.or.slice(index)],
        }

  emit('update:modelValue', newValue)
}
</script>

<style scoped>
.p-where-filters > *:not(.pui-structure-empty) + *,
.p-where-filters > .pui-structure-dropzone + * {
  margin-top: 0.75rem;
}

:where(.pui-structure-dropzone) + .p-where-filters-buttons {
  display: none;
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
