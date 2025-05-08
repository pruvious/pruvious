<template>
  <PUIField v-if="!options.ui.hidden" ref="root">
    <PruviousFieldLabel :name="name" :options="options" :synced="synced" :translatable="translatable" id="">
      <template #label="{ label }">
        <span @click="focusFirstField()" class="pui-label">{{ label }}</span>
      </template>
    </PruviousFieldLabel>

    <PUIStructure
      v-model="structuredValue"
      :disabled="disabled"
      :dropItemsHereLabel="__('pruvious-dashboard', 'Drop items here')"
      :isDraggable="!disabled"
      :resolveItemType="(item) => item.$blockName"
      :types="allowedBlocks"
      @commit="commitModelValue($event)"
      @update:modelValue="
        (value) => {
          updateModelValue(value)
          localErrors = undefined
        }
      "
      allowCrossDrop
      ref="structure"
      class="p-structure"
      :class="{ 'p-structure-disabled': disabled }"
    >
      <template #header="{ item, index }">
        <span
          v-if="
            dashboard!.blocks[item.$blockName]!.ui.itemLabelConfiguration?.showBlockLabel !== false ||
            dashboard!.blocks[item.$blockName]!.ui.itemLabelConfiguration?.fieldValue
          "
          class="pui-muted pui-truncate"
        >
          {{
            dashboard!.blocks[item.$blockName]!.ui.itemLabelConfiguration?.showBlockLabel !== false
              ? blockLabels[item.$blockName]
              : ''
          }}
          {{
            dashboard!.blocks[item.$blockName]!.ui.itemLabelConfiguration?.fieldValue &&
            item[dashboard!.blocks[item.$blockName]!.ui.itemLabelConfiguration!.fieldValue as string] !== ''
              ? dashboard!.blocks[item.$blockName]!.ui.itemLabelConfiguration?.showBlockLabel !== false
                ? `(${item[dashboard!.blocks[item.$blockName]!.ui.itemLabelConfiguration!.fieldValue as string]})`
                : item[dashboard!.blocks[item.$blockName]!.ui.itemLabelConfiguration!.fieldValue as string]
              : ''
          }}
        </span>

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
                structure?.resumeScrollWatcher()
                updateModelValue(value)
                commitModelValue(value)
                localErrors = undefined
                structure?.pauseScrollWatcher()
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
                structure?.resumeScrollWatcher()
                updateModelValue(value)
                commitModelValue(value)
                localErrors = undefined
                structure?.pauseScrollWatcher()
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
              v-if="allowedBlocks.length && (options.maxItems === false || structuredValue.length < options.maxItems)"
              :title="__('pruvious-dashboard', 'Add before')"
              @click.stop="
                () => {
                  if (allowedBlocks.length > 1) {
                    addBlockPopupIndex = index
                  } else {
                    addBlock(allowedBlocks[0]!, index)
                  }
                  visibleActions = -1
                }
              "
            >
              <Icon mode="svg" name="tabler:arrow-bar-to-up" />
              <span>{{ __('pruvious-dashboard', 'Add before') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="allowedBlocks.length && (options.maxItems === false || structuredValue.length < options.maxItems)"
              :title="__('pruvious-dashboard', 'Add after')"
              @click.stop="
                () => {
                  if (allowedBlocks.length > 1) {
                    addBlockPopupIndex = index + 1
                  } else {
                    addBlock(allowedBlocks[0]!, index + 1)
                  }
                  visibleActions = -1
                }
              "
            >
              <Icon mode="svg" name="tabler:arrow-bar-to-down" />
              <span>{{ __('pruvious-dashboard', 'Add after') }}</span>
            </PUIDropdownItem>

            <hr />

            <PUIDropdownItem
              :title="__('pruvious-dashboard', 'Copy')"
              @click="
                () => {
                  clipboard.copy({
                    pruviousClipboardDataType: 'blocks',
                    data: [{ $key: item.$blockName, ...omit(item, ['$blockName', '$expanded', '$key']) }],
                  })
                  puiToast(__('pruvious-dashboard', 'Copied'), { type: 'success' })
                  visibleActions = -1
                }
              "
            >
              <Icon mode="svg" name="tabler:clipboard" />
              <span>{{ __('pruvious-dashboard', 'Copy') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="!disabled"
              :title="__('pruvious-dashboard', 'Cut')"
              @click="
                () => {
                  clipboard.copy({
                    pruviousClipboardDataType: 'blocks',
                    data: [{ $key: item.$blockName, ...omit(item, ['$blockName', '$expanded', '$key']) }],
                  })
                  puiToast(__('pruvious-dashboard', 'Copied'), { type: 'success' })
                  const value = structuredValue.filter((_, i) => index !== i)
                  updateModelValue(value)
                  commitModelValue(value)
                  localErrors = undefined
                  visibleActions = -1
                }
              "
            >
              <Icon mode="svg" name="tabler:cut" />
              <span>{{ __('pruvious-dashboard', 'Cut') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="
                !disabled &&
                clipboardData?.pruviousClipboardDataType === 'blocks' &&
                clipboardData.data.every(({ $key }) => allowedBlocks.includes($key)) &&
                (options.maxItems === false || structuredValue.length < options.maxItems)
              "
              :title="__('pruvious-dashboard', 'Paste before')"
              @click="
                () => {
                  if (clipboardData?.pruviousClipboardDataType === 'blocks') {
                    const items = clipboardData.data.map((blockValue) => ({
                      $blockName: blockValue.$key,
                      ...blockValue,
                      $expanded: true,
                      $key: nanoid(),
                    }))
                    structuredValue = [...structuredValue.slice(0, index), ...items, ...structuredValue.slice(index)]
                    updateModelValue(structuredValue)
                    commitModelValue(structuredValue)
                    localErrors = undefined
                  }
                  visibleActions = -1
                }
              "
            >
              <Icon mode="svg" name="tabler:clipboard-plus" />
              <span>{{ __('pruvious-dashboard', 'Paste before') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="
                !disabled &&
                clipboardData?.pruviousClipboardDataType === 'blocks' &&
                clipboardData.data.every(({ $key }) => allowedBlocks.includes($key)) &&
                (options.maxItems === false || structuredValue.length < options.maxItems)
              "
              :title="__('pruvious-dashboard', 'Paste after')"
              @click="
                () => {
                  if (clipboardData?.pruviousClipboardDataType === 'blocks') {
                    const items = clipboardData.data.map((blockValue) => ({
                      $blockName: blockValue.$key,
                      ...blockValue,
                      $expanded: true,
                      $key: nanoid(),
                    }))
                    structuredValue = [
                      ...structuredValue.slice(0, index + 1),
                      ...items,
                      ...structuredValue.slice(index + 1),
                    ]
                    updateModelValue(structuredValue)
                    commitModelValue(structuredValue)
                    localErrors = undefined
                  }
                  visibleActions = -1
                }
              "
            >
              <Icon mode="svg" name="tabler:clipboard-plus" />
              <span>{{ __('pruvious-dashboard', 'Paste after') }}</span>
            </PUIDropdownItem>

            <hr />

            <PUIDropdownItem
              v-if="
                !options.enforceUniqueItems && (options.maxItems === false || structuredValue.length < options.maxItems)
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
              v-if="options.minItems === false || structuredValue.length > options.minItems"
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

            <hr />

            <PUIDropdownItem
              v-if="!allExpanded"
              :title="__('pruvious-dashboard', 'Expand all')"
              @click="
                () => {
                  visibleActions = -1
                  $nextTick(() => {
                    structuredValue = structuredValue.map((item) => ({ ...item, $expanded: true }))
                  })
                }
              "
            >
              <Icon mode="svg" name="tabler:maximize" />
              <span>{{ __('pruvious-dashboard', 'Expand all') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="!allCollapsed"
              :title="__('pruvious-dashboard', 'Collapse all')"
              @click="
                () => {
                  visibleActions = -1
                  $nextTick(() => {
                    structuredValue = structuredValue.map((item) => ({ ...item, $expanded: false }))
                  })
                }
              "
            >
              <Icon mode="svg" name="tabler:minimize" />
              <span>{{ __('pruvious-dashboard', 'Collapse all') }}</span>
            </PUIDropdownItem>
          </PUIDropdown>
        </span>
      </template>

      <template #item="{ item, index }">
        <div class="p-structure-item">
          <PruviousFields
            v-if="hasFields[item.$blockName]"
            :alwaysVisibleFields="alwaysVisibleFields"
            :conditionalLogic="conditionalLogic ?? {}"
            :conditionalLogicResolver="conditionalLogicResolver ?? new ConditionalLogicResolver()"
            :data="data ?? {}"
            :dataContainerName="dataContainerName"
            :dataContainerType="dataContainerType"
            :disabled="disabled"
            :errors="fieldErrors?.[index]"
            :fields="dashboard!.blocks[item.$blockName]!.fields"
            :layout="
              dashboard!.blocks[item.$blockName]!.ui[isLivePreview ? 'livePreviewFieldsLayout' : 'standardFieldsLayout']
            "
            :modelValue="item"
            :operation="operation"
            :rootPath="`${path}.${index}`"
            :syncedFields="[]"
            :translatable="translatable"
            @commit="commitModelValue(structuredValue.map((item, i) => (i === index ? $event : item)))"
            @queueConditionalLogicUpdate="$emit('queueConditionalLogicUpdate', $event)"
            @update:conditionalLogic="$emit('update:conditionalLogic', $event)"
            @update:modelValue="
              updateModelValue(
                structuredValue.map((item, i) => (i === index ? $event : item)),
                false,
              )
            "
          />

          <span v-else class="pui-muted">{{ __('pruvious-dashboard', 'No fields to display') }}</span>
        </div>
      </template>

      <template #itemBefore="{ item, index }">
        <div
          v-if="blockErrors?.[index] || (fieldErrors?.[index] && !item.$expanded)"
          hidden
          class="p-structure-next-item-has-error"
        ></div>
      </template>

      <template #itemAfter="{ index }">
        <PruviousFieldMessage
          :error="blockErrors?.[index]"
          :name="name"
          :options="options"
          class="p-structure-item-error"
        />
      </template>
    </PUIStructure>

    <div class="p-structure-add-item">
      <PUIButton
        :disabled="
          disabled ||
          !allowedBlocks.length ||
          (options.maxItems !== false && structuredValue.length >= options.maxItems)
        "
        @click="
          () => {
            if (allowedBlocks.length > 1) {
              addBlockPopupIndex = structuredValue.length
            } else {
              addBlock(allowedBlocks[0]!)
            }
          }
        "
        ref="addItemButton"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:plus" />
        <span>{{ __('pruvious-dashboard', 'Add block') }}</span>
      </PUIButton>

      <PruviousDashboardBlockPickerPopup
        v-if="addBlockPopupIndex > -1"
        :allowedBlocks="allowedBlocks"
        @close="$event().then(() => (addBlockPopupIndex = -1))"
        @pick="
          (blockName, close) => {
            addBlock(blockName, addBlockPopupIndex)
            close().then(() => (addBlockPopupIndex = -1))
          }
        "
      />
    </div>

    <PruviousFieldMessage :error="structureErrors" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { PruviousDashboardBlockPickerPopup } from '#components'
import {
  __,
  maybeTranslate,
  parseConditionalLogic,
  usePruviousClipboard,
  usePruviousClipboardData,
  usePruviousDashboard,
} from '#pruvious/client'
import type {
  BlockGroupName,
  BlockName,
  BlockTagName,
  Collections,
  GenericSerializableFieldOptions,
  SerializableFieldOptions,
  Singletons,
} from '#pruvious/server'
import { ConditionalLogicResolver } from '@pruvious/orm/conditional-logic-resolver'
import { puiToast } from '@pruvious/ui/pui/toast'
import {
  deepClone,
  deepCompare,
  isArray,
  isDefined,
  isEmpty,
  isObject,
  isStringInteger,
  nanoid,
  omit,
  remap,
  sortNaturallyByProp,
  titleCase,
  uniqueArray,
} from '@pruvious/utils'

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
    type: Object as PropType<SerializableFieldOptions<'blocks'>>,
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

provide('isLivePreview', false)

const dashboard = usePruviousDashboard()
const clipboard = usePruviousClipboard()
const clipboardData = usePruviousClipboardData()
const root = useTemplateRef('root')
const structure = useTemplateRef('structure')
const prevModelValue = ref<Record<string, any>[]>()
const structuredValue = ref<Record<string, any>[]>([])
const hasFields = computed(() =>
  remap(dashboard.value!.blocks, (blockName, { fields }) => [blockName, !isEmpty(fields)]),
)
const isLivePreview = inject('isLivePreview', false)
const actionButtons = ref<Record<number, any>>({})
const visibleActions = ref(-1)
const localErrors = ref<string | Record<string, string>>()
const structureErrors = computed(() =>
  isObject(localErrors.value) ? localErrors.value[props.name] : localErrors.value,
)
const blockErrors = computed(() =>
  isObject(localErrors.value)
    ? Object.fromEntries(Object.entries(localErrors.value).filter(([path]) => !path.includes('.')))
    : undefined,
)
const fieldErrors = computed(() => {
  if (isObject(localErrors.value)) {
    const map: Record<string, Record<string, string>> = {}
    for (const [path, error] of Object.entries(localErrors.value)) {
      if (path.includes('.')) {
        const parts = path.split('.')
        const index = parts[0]
        const fieldPath = parts.slice(1).join('.')
        if (isStringInteger(index)) {
          map[index] ??= {}
          map[index][fieldPath] = error
        }
      }
    }
    return map
  }
})
const allCollapsed = computed(() => structuredValue.value.every((item) => !item.$expanded))
const allExpanded = computed(() => structuredValue.value.every((item) => item.$expanded))
const blockLabels = computed(() =>
  Object.fromEntries(
    sortNaturallyByProp(
      Object.entries(dashboard.value!.blocks).map(([blockName, block]) => ({
        blockName,
        label: isDefined(block.ui.label)
          ? maybeTranslate(block.ui.label)
          : __('pruvious-dashboard', titleCase(blockName, false) as any),
      })),
      'label',
    ).map(({ blockName, label }) => [blockName, label]),
  ),
)
const _allowNestedBlocks = inject('allowNestedBlocks', ref(Object.keys(dashboard.value!.blocks)))
const _denyNestedBlocks = inject('denyNestedBlocks', ref([]))
const allowRootBlocks = computed(() =>
  (isArray(props.options.allowRootBlocks)
    ? props.options.allowRootBlocks.flatMap(resolveAllowDenyItem)
    : Object.keys(dashboard.value!.blocks)
  ).filter((item) => _allowNestedBlocks.value.includes(item)),
)
const denyRootBlocks = computed(() => [
  ..._denyNestedBlocks.value,
  ...(isArray(props.options.denyRootBlocks) ? props.options.denyRootBlocks.flatMap(resolveAllowDenyItem) : []),
])
const allowNestedBlocks = computed(() =>
  (isArray(props.options.allowNestedBlocks)
    ? props.options.allowNestedBlocks.flatMap(resolveAllowDenyItem)
    : Object.keys(dashboard.value!.blocks)
  ).filter((item) => _allowNestedBlocks.value.includes(item)),
)
const denyNestedBlocks = computed(() =>
  uniqueArray([
    ..._denyNestedBlocks.value,
    ...(isArray(props.options.denyNestedBlocks)
      ? props.options.denyNestedBlocks.flatMap(resolveAllowDenyItem)
      : Object.keys(dashboard.value!.blocks)),
  ]),
)
const addBlockPopupIndex = ref(-1)
const allowedBlocks = computed(
  () =>
    Object.keys(dashboard.value!.blocks).filter(
      (item) => allowRootBlocks.value.includes(item) && !denyRootBlocks.value.includes(item),
    ) as BlockName[],
)

provide('allowNestedBlocks', allowNestedBlocks)
provide('denyNestedBlocks', denyNestedBlocks)

watch(
  () => props.modelValue,
  (_, oldValue) => {
    if (!deepCompare(props.modelValue, prevModelValue.value)) {
      prevModelValue.value = props.modelValue
      structuredValue.value = props.modelValue.map((item, i) => ({
        $blockName: item.$key,
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

function addBlock(blockName: string, index?: number) {
  const item = {
    $blockName: blockName,
    ...remap(dashboard.value!.blocks[blockName]!.fields, (fieldName, options) => [
      fieldName,
      deepClone(options.default),
    ]),
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

    for (const [i, fields] of mValue.entries()) {
      for (const fieldName of Object.keys(fields)) {
        if (!parsedConditionalLogic.hasOwnProperty(`${props.path}.${i}.${fieldName}`)) {
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

function updateModelValue(sValue: Record<string, any>[], refreshConditionalLogic = true) {
  const newModelValue = sValue.map((item) => ({
    $key: item.$blockName,
    ...omit(item, ['$blockName', '$expanded', '$key']),
  }))
  prevModelValue.value = newModelValue
  structuredValue.value = sValue

  if (refreshConditionalLogic) {
    const newData = { ...props.data, [props.name]: newModelValue }
    props.conditionalLogicResolver
      ?.setInput(newData)
      .setConditionalLogic(parseConditionalLogic(props.fields ?? {}, newData))
      .resolve()
    Object.assign(props.conditionalLogic ?? {}, props.conditionalLogicResolver?.results)
  }

  emit('update:modelValue', newModelValue)
  nextTick(() => queueConditionalLogicUpdate(newModelValue))
}

function commitModelValue(sValue: Record<string, any>[]) {
  emit(
    'commit',
    sValue.map((item) => ({ $key: item.$blockName, ...omit(item, ['$blockName', '$expanded', '$key']) })),
  )
}

function focusFirstField() {
  const firstField = root.value?.$el.querySelector('label')
  if (firstField) {
    firstField.focus()
  }
}

function resolveAllowDenyItem(item: string) {
  if (item.startsWith('group:')) {
    const groupName = item.slice(6) as BlockGroupName
    return Object.entries(dashboard.value!.blocks)
      .filter(([_, { group }]) => group === groupName)
      .map(([blockName]) => blockName)
  } else if (item.startsWith('tag:')) {
    const tagName = item.slice(4) as BlockTagName
    return Object.entries(dashboard.value!.blocks)
      .filter(([_, { tags }]) => tags.includes(tagName))
      .map(([blockName]) => blockName)
  }
  return [item as BlockName]
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

.p-structure-disabled
  > *
  > :where(.pui-structure-items)
  > :where(.pui-card)
  > :where(.pui-card-header)
  > :where(:first-child) {
  margin-left: 0.25rem;
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
