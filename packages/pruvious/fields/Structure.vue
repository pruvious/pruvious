<template>
  <PUIField v-if="!options.ui.hidden" ref="root">
    <PruviousFieldLabel :name="name" :options="options" :synced="synced" :translatable="translatable" id="">
      <template #label="{ label }">
        <span @click="focusFirstSubfield()" class="pui-label">{{ label }}</span>
      </template>
    </PruviousFieldLabel>

    <PUIStructure
      v-model="structuredValue"
      :disabled="disabled"
      :dropItemsHereLabel="__('pruvious-dashboard', 'Drop items here')"
      :isDraggable="!disabled"
      :resolveItemType="(item) => itemTypeHash[item.$itemKey]"
      :types="itemTypeHashValues"
      @commit="commitModelValue($event)"
      @update:modelValue="
        (value) => {
          updateModelValue(value)
          localErrors = undefined
        }
      "
      allowCrossDrop
      class="p-structure"
    >
      <template #header="{ item, index }">
        <span
          v-if="
            options.ui.itemLabelConfiguration?.[item.$itemKey]?.showItemType !== false ||
            options.ui.itemLabelConfiguration?.[item.$itemKey]?.subfieldValue
          "
          class="pui-muted pui-truncate"
        >
          {{ options.ui.itemLabelConfiguration?.[item.$itemKey]?.showItemNumber !== false ? `${index + 1}.` : '' }}
          {{
            options.ui.itemLabelConfiguration?.[item.$itemKey]?.showItemType !== false
              ? itemTypeLabels[item.$itemKey]
              : ''
          }}
          {{
            options.ui.itemLabelConfiguration?.[item.$itemKey]?.subfieldValue &&
            item[options.ui.itemLabelConfiguration[item.$itemKey]!.subfieldValue as string] !== ''
              ? options.ui.itemLabelConfiguration?.[item.$itemKey]?.showItemType !== false
                ? `(${item[options.ui.itemLabelConfiguration[item.$itemKey]!.subfieldValue as string]})`
                : item[options.ui.itemLabelConfiguration[item.$itemKey]!.subfieldValue as string]
              : ''
          }}
        </span>
        <span v-else class="pui-muted pui-truncate">#{{ index + 1 }}</span>

        <span class="p-structure-actions" :class="{ 'p-structure-actions-visible': visibleActions === index }">
          <PUIButton
            v-if="!disabled && structuredValue.length > 1"
            v-pui-tooltip="__('pruvious-dashboard', 'Move up')"
            :disabled="index === 0"
            :size="-2"
            @click="
              () => {
                const value = structuredValue.map((item, i) => {
                  if (i === index - 1) {
                    return structuredValue[index]!
                  } else if (i === index) {
                    return structuredValue[index - 1]!
                  }
                  return item
                })
                updateModelValue(value)
                commitModelValue(value)
                localErrors = undefined
              }
            "
            variant="ghost"
          >
            <Icon mode="svg" name="tabler:chevron-up" />
          </PUIButton>

          <PUIButton
            v-if="!disabled && structuredValue.length > 1"
            v-pui-tooltip="__('pruvious-dashboard', 'Move down')"
            :disabled="index === structuredValue.length - 1"
            :size="-2"
            @click="
              () => {
                const value = structuredValue.map((item, i) => {
                  if (i === index + 1) {
                    return structuredValue[index]!
                  } else if (i === index) {
                    return structuredValue[index + 1]!
                  }
                  return item
                })
                updateModelValue(value)
                commitModelValue(value)
                localErrors = undefined
              }
            "
            variant="ghost"
          >
            <Icon mode="svg" name="tabler:chevron-down" />
          </PUIButton>

          <PUIButton
            v-pui-tooltip.watch="
              item.$expanded ? __('pruvious-dashboard', 'Collapse') : __('pruvious-dashboard', 'Expand')
            "
            :size="-2"
            :variant="item.$expanded ? 'ghost' : 'accent'"
            @click="item.$expanded = !item.$expanded"
          >
            <Icon v-if="item.$expanded" mode="svg" name="tabler:maximize" />
            <Icon v-else mode="svg" name="tabler:minimize" />
          </PUIButton>

          <PUIButton
            :ref="(el) => (actionButtons[index] = el)"
            :size="-2"
            :title="__('pruvious-dashboard', 'More actions')"
            :variant="visibleActions === index ? 'primary' : 'ghost'"
            @click="visibleActions = visibleActions === index ? -1 : index"
          >
            <Icon mode="svg" name="tabler:dots-vertical" />
          </PUIButton>
          <PUIDropdown
            v-if="visibleActions === index"
            :reference="actionButtons?.[index]?.$el"
            @click="visibleActions = -1"
            @close="visibleActions = -1"
            placement="end"
          >
            <PUIDropdownItem
              v-if="(options.maxItems === false || structuredValue.length < options.maxItems) && !insertItemAction"
              :title="__('pruvious-dashboard', 'Insert before')"
              @click.stop="
                () => {
                  if (Object.keys(options.structure).length > 1) {
                    insertItemAction = 'before'
                  } else {
                    addItem(Object.keys(options.structure)[0]!, index)
                  }
                }
              "
            >
              <Icon mode="svg" name="tabler:arrow-bar-to-up" />
              <span>{{ __('pruvious-dashboard', 'Insert before') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="(options.maxItems === false || structuredValue.length < options.maxItems) && !insertItemAction"
              :title="__('pruvious-dashboard', 'Insert after')"
              @click.stop="
                () => {
                  if (Object.keys(options.structure).length > 1) {
                    insertItemAction = 'after'
                  } else {
                    addItem(Object.keys(options.structure)[0]!, index + 1)
                  }
                }
              "
            >
              <Icon mode="svg" name="tabler:arrow-bar-to-down" />
              <span>{{ __('pruvious-dashboard', 'Insert after') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="!allExpanded && !insertItemAction"
              :title="__('pruvious-dashboard', 'Expand all')"
              @click="
                () => {
                  visibleActions = -1
                  $nextTick(() => {
                    structuredValue = structuredValue.map((item) => ({ ...item, $expanded: true }))
                    updateModelValue(structuredValue)
                    commitModelValue(structuredValue)
                  })
                }
              "
            >
              <Icon mode="svg" name="tabler:maximize" />
              <span>{{ __('pruvious-dashboard', 'Expand all') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="!allCollapsed && !insertItemAction"
              :title="__('pruvious-dashboard', 'Collapse all')"
              @click="
                () => {
                  visibleActions = -1
                  $nextTick(() => {
                    structuredValue = structuredValue.map((item) => ({ ...item, $expanded: false }))
                    updateModelValue(structuredValue)
                    commitModelValue(structuredValue)
                  })
                }
              "
            >
              <Icon mode="svg" name="tabler:minimize" />
              <span>{{ __('pruvious-dashboard', 'Collapse all') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="
                !options.enforceUniqueItems &&
                (options.maxItems === false || structuredValue.length < options.maxItems) &&
                !insertItemAction
              "
              :title="__('pruvious-dashboard', 'Duplicate')"
              @click="
                () => {
                  visibleActions = -1
                  $nextTick(() => {
                    const value = [
                      ...structuredValue.slice(0, index),
                      { ...structuredValue[index], $key: nanoid() },
                      ...structuredValue.slice(index),
                    ]
                    updateModelValue(value)
                    commitModelValue(value)
                    localErrors = undefined
                  })
                }
              "
            >
              <Icon mode="svg" name="tabler:copy" />
              <span>{{ __('pruvious-dashboard', 'Duplicate') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="(options.minItems === false || structuredValue.length > options.minItems) && !insertItemAction"
              :title="__('pruvious-dashboard', 'Delete')"
              @click="
                () => {
                  visibleActions = -1
                  $nextTick(() => {
                    const value = structuredValue.filter((_, i) => index !== i)
                    updateModelValue(value)
                    commitModelValue(value)
                    localErrors = undefined
                  })
                }
              "
              destructive
            >
              <Icon mode="svg" name="tabler:trash" />
              <span>{{ __('pruvious-dashboard', 'Delete') }}</span>
            </PUIDropdownItem>

            <template v-if="insertItemAction">
              <PUIDropdownItem
                v-for="(label, $key) in itemTypeLabels"
                :title="label"
                @click="
                  () => {
                    visibleActions = -1
                    $nextTick(() => addItem(String($key), insertItemAction === 'before' ? index : index + 1))
                  }
                "
              >
                <span>{{ label }}</span>
              </PUIDropdownItem>
            </template>
          </PUIDropdown>
        </span>
      </template>

      <template #item="{ item, index }">
        <div class="p-structure-item">
          <PruviousFields
            v-if="hasSubfields[item.$itemKey]"
            :alwaysVisibleFields="alwaysVisibleFields"
            :conditionalLogic="conditionalLogic ?? {}"
            :conditionalLogicResolver="conditionalLogicResolver ?? new ConditionalLogicResolver()"
            :data="data ?? {}"
            :dataContainerName="dataContainerName"
            :dataContainerType="dataContainerType"
            :disabled="disabled"
            :errors="subfieldErrors?.[index]"
            :fields="(options as any).structure[item.$itemKey]"
            :layout="options.ui.subfieldsLayout?.[item.$itemKey]"
            :modelValue="item"
            :operation="operation"
            :rootPath="`${path}.${index}`"
            :syncedFields="[]"
            :translatable="translatable"
            @commit="commitModelValue(structuredValue.map((item, i) => (i === index ? $event : item)))"
            @queueConditionalLogicUpdate="$emit('queueConditionalLogicUpdate', $event)"
            @update:conditionalLogic="$emit('update:conditionalLogic', $event)"
            @update:modelValue="updateModelValue(structuredValue.map((item, i) => (i === index ? $event : item)))"
          />

          <span v-else class="pui-muted">{{ __('pruvious-dashboard', 'No fields to display') }}</span>
        </div>
      </template>

      <template #itemBefore="{ item, index }">
        <div
          v-if="itemErrors?.[index] || (subfieldErrors?.[index] && !item.$expanded)"
          hidden
          class="p-structure-next-item-has-error"
        ></div>
      </template>

      <template #itemAfter="{ index }">
        <PruviousFieldMessage
          :error="itemErrors?.[index]"
          :name="name"
          :options="options"
          class="p-structure-item-error"
        />
      </template>
    </PUIStructure>

    <div class="p-structure-add-item">
      <PUIButton
        :disabled="disabled || (options.maxItems !== false && structuredValue.length >= options.maxItems)"
        :variant="isAddItemMenuVisible ? 'primary' : 'outline'"
        @click="
          () => {
            if (Object.keys(options.structure).length > 1) {
              isAddItemMenuVisible = true
            } else {
              addItem(Object.keys(options.structure)[0]!)
            }
          }
        "
        ref="addItemButton"
      >
        <Icon mode="svg" name="tabler:plus" />
        <span>{{ addItemLabel }}</span>
      </PUIButton>
      <PUIDropdown
        v-if="isAddItemMenuVisible"
        :reference="addItemButton?.$el"
        @click="isAddItemMenuVisible = false"
        @close="isAddItemMenuVisible = false"
      >
        <PUIDropdownItem v-for="(label, $key) in itemTypeLabels" @click="addItem(String($key))">
          <span>{{ label }}</span>
        </PUIDropdownItem>
      </PUIDropdown>
    </div>

    <PruviousFieldMessage :error="structureErrors" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { __, maybeTranslate } from '#pruvious/client'
import type {
  Collections,
  GenericSerializableFieldOptions,
  SerializableFieldOptions,
  Singletons,
} from '#pruvious/server'
import { ConditionalLogicResolver } from '@pruvious/orm/conditional-logic-resolver'
import {
  deepClone,
  deepCompare,
  isDefined,
  isEmpty,
  isObject,
  isStringInteger,
  nanoid,
  omit,
  remap,
  sortNaturallyByProp,
  titleCase,
} from '@pruvious/utils'
import { hash } from 'ohash'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: Array as PropType<Record<string, any>[]>,
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
    type: Object as PropType<SerializableFieldOptions<'structure'>>,
    required: true,
  },

  /**
   * Defines whether this data container is a `collection` (manages multiple items) or a `singleton` (manages a single item).
   */
  dataContainerType: {
    type: String as PropType<'collection' | 'singleton'>,
    required: true,
  },

  /**
   * The name of the data container in PascalCase format.
   */
  dataContainerName: {
    type: String as PropType<keyof Collections | keyof Singletons>,
    required: true,
  },

  /**
   * The current record data from a collection or singleton.
   * Contains key-value pairs representing the record's fields and their values.
   */
  data: {
    type: Object as PropType<Record<string, any>>,
  },

  /**
   * A key-value pair of (sub)field names and their combined options defined in a collection, singleton, block, or field.
   */
  fields: {
    type: Object as PropType<Record<string, GenericSerializableFieldOptions>>,
  },

  /**
   * The field path, expressed in dot notation, represents the exact location of the field within the current data structure.
   */
  path: {
    type: String,
    required: true,
  },

  /**
   * Specifies the root path in dot notation for the current `fields` that will be shown.
   * Only displays fields that are nested under this base path.
   *
   * @default ''
   */
  rootPath: {
    type: String,
    default: '',
  },

  /**
   * A resolver instance that handles conditional logic evaluation for `fields` and their associated `data`.
   * This resolver determines field visibility, validation rules, and other dynamic behaviors based on defined conditions.
   */
  conditionalLogicResolver: {
    type: Object as PropType<ConditionalLogicResolver>,
  },

  /**
   * Stores the evaluation results of conditional logic for form fields.
   * The object uses dot-notation field paths as keys (e.g. `repeater.0.field`) and boolean values indicating if the condition is met.
   */
  conditionalLogic: {
    type: Object as PropType<Record<string, boolean>>,
  },

  /**
   * Represents an error message that can be displayed to the user.
   */
  error: {
    type: [String, Object] as PropType<string | Record<string, string>>,
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

  /**
   * The current operation being performed.
   */
  operation: {
    type: String as PropType<'create' | 'update'>,
    required: true,
  },

  /**
   * A list of fields that should always be visible, regardless of conditional logic.
   * The fields must be specified in dot notation (e.g. `repeater.0.field`).
   */
  alwaysVisibleFields: {
    type: Array as PropType<string[]>,
  },
})

const emit = defineEmits<{
  'commit': [value: Record<string, any>[]]
  'update:modelValue': [value: Record<string, any>[]]
  'update:conditionalLogic': [value: Record<string, boolean>]
  'queueConditionalLogicUpdate': [path?: (string & {}) | string[] | '$resolve' | '$reset']
}>()

const root = useTemplateRef('root')
const prevModelValue = ref<Record<string, any>[]>()
const structuredValue = ref<Record<string, any>[]>([])
const hasSubfields = computed(() =>
  remap(props.options.structure, ($itemKey, subfields) => [$itemKey, !isEmpty(subfields)]),
)
const addItemButton = useTemplateRef('addItemButton')
const isAddItemMenuVisible = ref(false)
const addItemLabel = isDefined(props.options.ui.addItemLabel)
  ? maybeTranslate(props.options.ui.addItemLabel)
  : __('pruvious-dashboard', 'Add item')
const actionButtons = ref<Record<number, any>>({})
const visibleActions = ref(-1)
const insertItemAction = ref<'before' | 'after' | false>(false)
const localErrors = ref<string | Record<string, string>>()
const structureErrors = computed(() =>
  isObject(localErrors.value) ? localErrors.value[props.name] : localErrors.value,
)
const itemErrors = computed(() =>
  isObject(localErrors.value)
    ? Object.fromEntries(Object.entries(localErrors.value).filter(([path]) => !path.includes('.')))
    : undefined,
)
const subfieldErrors = computed(() => {
  if (isObject(localErrors.value)) {
    const map: Record<string, Record<string, string>> = {}
    for (const [path, error] of Object.entries(localErrors.value)) {
      if (path.includes('.')) {
        const parts = path.split('.')
        const index = parts[0]
        const subfieldPath = parts.slice(1).join('.')
        if (isStringInteger(index)) {
          map[index] ??= {}
          map[index][subfieldPath] = error
        }
      }
    }
    return map
  }
})
const itemTypeHash = computed(() =>
  remap(props.options.structure, ($itemKey, subfields) => [
    $itemKey,
    hash(remap(subfields, (subfieldName, { _fieldType }) => [subfieldName, _fieldType])),
  ]),
)
const itemTypeHashValues = computed(() => Object.values(itemTypeHash.value))
const allCollapsed = computed(() => structuredValue.value.every((item) => !item.$expanded))
const allExpanded = computed(() => structuredValue.value.every((item) => item.$expanded))
const itemTypeLabels = computed(() =>
  Object.fromEntries(
    sortNaturallyByProp(
      Object.keys(props.options.structure).map(($itemKey) => ({
        $itemKey,
        label: isDefined(props.options.ui.itemTypeLabels?.[$itemKey])
          ? maybeTranslate(props.options.ui.itemTypeLabels[$itemKey])
          : __('pruvious-dashboard', titleCase($itemKey, false) as any),
      })),
      'label',
    ).map(({ $itemKey, label }) => [$itemKey, label]),
  ),
)

watch(
  () => props.modelValue,
  (_, oldValue) => {
    if (!deepCompare(props.modelValue, prevModelValue.value)) {
      prevModelValue.value = props.modelValue
      structuredValue.value = props.modelValue.map((item, i) => ({
        $itemKey: item.$key,
        ...item,
        $expanded: !structuredValue.value.length || !allCollapsed.value,
        $key: structuredValue.value[i]?.$key ?? nanoid(),
      }))
      if (isDefined(oldValue)) {
        queueConditionalLogicUpdate(props.modelValue)
      }
    }
  },
  { immediate: true },
)

watch(
  () => props.error,
  () => {
    localErrors.value = props.error
  },
  { immediate: true },
)

watch(visibleActions, () => {
  if (visibleActions.value !== -1) {
    insertItemAction.value = false
  }
})

function addItem($key: string, index?: number) {
  const item = {
    $itemKey: $key,
    ...remap(props.options.structure[$key]!, (fieldName, options) => [fieldName, deepClone(options.default)]),
    $expanded: true,
    $key: nanoid(),
  }
  structuredValue.value = isDefined(index)
    ? [...structuredValue.value.slice(0, index), item, ...structuredValue.value.slice(index)]
    : [...structuredValue.value, item]
  updateModelValue(structuredValue.value)
  commitModelValue(structuredValue.value)
  localErrors.value = undefined
}

function queueConditionalLogicUpdate(mValue: Record<string, any>[]) {
  if (props.conditionalLogicResolver) {
    const parsedConditionalLogic = props.conditionalLogicResolver.getConditionalLogic()

    for (const [i, subfields] of mValue.entries()) {
      for (const subfieldName of Object.keys(subfields)) {
        if (!parsedConditionalLogic.hasOwnProperty(`${props.path}.${i}.${subfieldName}`)) {
          emit('queueConditionalLogicUpdate', '$reset')
          return
        }
      }
    }

    emit(
      'queueConditionalLogicUpdate',
      mValue.flatMap((item, i) => Object.keys(item).map((key) => `${props.path}.${i}.${key}`)),
    )
  }
}

function updateModelValue(sValue: Record<string, any>[]) {
  const newModelValue = sValue.map((item) => ({
    $key: item.$itemKey,
    ...omit(item, ['$itemKey', '$expanded', '$key']),
  }))
  prevModelValue.value = newModelValue
  structuredValue.value = sValue
  emit('update:modelValue', newModelValue)
  nextTick(() => queueConditionalLogicUpdate(newModelValue))
}

function commitModelValue(sValue: Record<string, any>[]) {
  emit(
    'commit',
    sValue.map((item) => ({ $key: item.$itemKey, ...omit(item, ['$itemKey', '$expanded', '$key']) })),
  )
}

function focusFirstSubfield() {
  const firstSubfield = root.value?.$el.querySelector('label')
  if (firstSubfield) {
    firstSubfield.focus()
  }
}
</script>

<style scoped>
.pui-label {
  cursor: default;
}

.p-structure-actions {
  flex-shrink: 0;
  display: none;
  gap: 0.25rem;
  margin-left: auto;
}

.p-structure
  > *
  > :where(.pui-structure-items)
  > :where(.pui-card:hover, .pui-card:focus-within)
  > :where(.pui-card-header)
  > :where(.pui-row)
  > .p-structure-actions,
.p-structure-actions-visible {
  display: flex;
}

.p-structure-actions > * {
  flex-shrink: 0;
}

.p-structure-next-item-has-error + * {
  border-color: hsl(var(--pui-destructive));
}

.p-structure-item-error {
  margin-top: -0.25rem;
}

.pui-structure:not(.pui-structure-empty) + .p-structure-add-item {
  margin-top: 0.75rem;
}

.pui-structure-dropzone + .p-structure-add-item {
  display: none;
}
</style>
