<template>
  <template v-for="item of items">
    <PruviousDynamicField
      v-if="
        item.type === 'DynamicField' && conditionalLogic[rootPath ? `${rootPath}.${item.field.name}` : item.field.name]
      "
      :conditionalLogic="conditionalLogic"
      :conditionalLogicResolver="conditionalLogicResolver"
      :data="data"
      :dataContainerName="dataContainerName"
      :dataContainerType="dataContainerType"
      :disabled="disabled"
      :error="errors?.[item.field.name]"
      :fields="fields"
      :modelValue="data[item.field.name]"
      :name="item.field.name"
      :operation="operation"
      :options="item.field.options"
      :path="item.field.path"
      :synced="translatable && !rootPath && syncedFields.includes(item.field.name)"
      :translatable="translatable"
      :type="item.field.options._fieldType"
      @commit="$emit('commit', { ...data, [item.field.name]: $event }, item.field.path)"
      @update:conditionalLogic="$emit('update:conditionalLogic', $event, item.field.path)"
      @update:modelValue="$emit('update:data', { ...data, [item.field.name]: $event }, item.field.path)"
      class="p-fields-item p-fields-field"
      :style="item.style"
    />

    <div v-else-if="item.type === 'row'" class="p-fields-item p-fields-row">
      <PruviousFields
        :conditionalLogic="conditionalLogic"
        :conditionalLogicResolver="conditionalLogicResolver"
        :data="data"
        :dataContainerName="dataContainerName"
        :dataContainerType="dataContainerType"
        :disabled="disabled"
        :errors="errors"
        :fields="fields"
        :layout="item.layout"
        :operation="operation"
        :rootPath="rootPath"
        :syncedFields="syncedFields"
        :translatable="translatable"
        @commit="(value, path) => $emit('commit', value, path)"
        @update:conditionalLogic="(value, path) => $emit('update:conditionalLogic', value, path)"
        @update:data="(value, path) => $emit('update:data', value, path)"
      />
    </div>

    <PUICard v-else-if="item.type === 'card'" class="p-fields-item p-fields-card">
      <PruviousFields
        :conditionalLogic="conditionalLogic"
        :conditionalLogicResolver="conditionalLogicResolver"
        :data="data"
        :dataContainerName="dataContainerName"
        :dataContainerType="dataContainerType"
        :disabled="disabled"
        :errors="errors"
        :fields="fields"
        :layout="item.layout"
        :operation="operation"
        :rootPath="rootPath"
        :syncedFields="syncedFields"
        :translatable="translatable"
        @commit="(value, path) => $emit('commit', value, path)"
        @update:conditionalLogic="(value, path) => $emit('update:conditionalLogic', value, path)"
        @update:data="(value, path) => $emit('update:data', value, path)"
      />
    </PUICard>

    <PUITabs v-else-if="item.type === 'tabs'" :list="item.list" class="p-fields-item p-fields-tabs">
      <PUITab v-for="(tabLayout, i) of item.layouts" :name="i">
        <PruviousFields
          :conditionalLogic="conditionalLogic"
          :conditionalLogicResolver="conditionalLogicResolver"
          :data="data"
          :dataContainerName="dataContainerName"
          :dataContainerType="dataContainerType"
          :disabled="disabled"
          :errors="errors"
          :fields="fields"
          :layout="tabLayout"
          :operation="operation"
          :rootPath="rootPath"
          :syncedFields="syncedFields"
          :translatable="translatable"
          @commit="(value, path) => $emit('commit', value, path)"
          @update:conditionalLogic="(value, path) => $emit('update:conditionalLogic', value, path)"
          @update:data="(value, path) => $emit('update:data', value, path)"
        />
      </PUITab>
    </PUITabs>

    <component
      v-else-if="item.type === 'component'"
      :conditionalLogic="conditionalLogic"
      :conditionalLogicResolver="conditionalLogicResolver"
      :data="data"
      :dataContainerName="dataContainerName"
      :dataContainerType="dataContainerType"
      :disabled="disabled"
      :errors="errors"
      :fields="fields"
      :is="item.component"
      :layout="layout"
      :operation="operation"
      :rootPath="rootPath"
      :syncedFields="syncedFields"
      :translatable="translatable"
      @commit="$emit('commit', $event)"
      @update:conditionalLogic="$emit('update:conditionalLogic', $event)"
      @update:data="$emit('update:data', $event)"
      class="p-fields-item p-fields-component"
    />

    <hr v-else-if="item.type === 'hr'" class="p-fields-item p-fields-hr" />
  </template>
</template>

<script lang="ts" setup>
import { customComponents, maybeTranslate } from '#pruvious/client'
import type {
  Collections,
  FieldsLayout,
  FieldsLayoutCard,
  FieldsLayoutComponentItem,
  FieldsLayoutFieldItem,
  FieldsLayoutRow,
  FieldsLayoutTab,
  FieldsLayoutTabs,
  GenericSerializableFieldOptions,
  Singletons,
} from '#pruvious/server'
import type { ConditionalLogicResolver } from '@pruvious/orm'
import type { PUITabListItem } from '@pruvious/ui/components/PUITabs.vue'
import { isDefined, isEmpty, isObject, isString } from '@pruvious/utils'
import type { Component, StyleValue } from 'vue'

type Item = DynamicFieldItem | RowItem | CardItem | TabsItem | ComponentItem | HRItem

interface DynamicFieldItem {
  type: 'DynamicField'
  field: { name: string; path: string; options: GenericSerializableFieldOptions }
  style?: StyleValue
}

interface RowItem {
  type: 'row'
  layout: FieldsLayoutRow['row']
}

interface CardItem {
  type: 'card'
  layout: FieldsLayoutCard['card']
}

interface TabsItem {
  type: 'tabs'
  list: PUITabListItem<number>[]
  layouts: FieldsLayoutTab['fields'][]
}

interface ComponentItem {
  type: 'component'
  component: Component | string
}

interface HRItem {
  type: 'hr'
}

const props = defineProps({
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
    required: true,
  },

  /**
   * A key-value pair of field names and their combined options defined in a collection, singleton, or block.
   */
  fields: {
    type: Object as PropType<Record<string, GenericSerializableFieldOptions>>,
  },

  /**
   * Defines how fields are arranged.
   * By default, fields are stacked vertically in their definition order.
   */
  layout: {
    type: Array as PropType<FieldsLayout>,
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
    required: true,
  },

  /**
   * Stores the evaluation results of conditional logic for form fields.
   * The object uses dot-notation field paths as keys (e.g. `repeater.0.field`) and boolean values indicating if the condition is met.
   */
  conditionalLogic: {
    type: Object as PropType<Record<string, boolean>>,
    required: true,
  },

  /**
   * Represents a key-value object of error messages that can be displayed to the user.
   * Keys are field paths in dot notation (e.g. `repeater.0.field`) and values are error messages.
   */
  errors: {
    type: Object as PropType<Record<string, string>>,
  },

  /**
   * Disables all form fields when set to `true`.
   * When disabled, fields cannot be interacted with and appear visually dimmed.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },

  /**
   * Specifies whether the current data record is translatable.
   */
  translatable: {
    type: Boolean,
    required: true,
  },

  /**
   * Specifies which fields should stay in sync across all translations of this data record.
   * When a synced field in one translation is changed, the same change happens automatically in all other translations.
   */
  syncedFields: {
    type: Array as PropType<string[]>,
    required: true,
  },

  /**
   * The current operation being performed.
   */
  operation: {
    type: String as PropType<'create' | 'update'>,
    required: true,
  },
})

defineEmits<{
  'commit': [value: any, path?: string]
  'update:data': [value: any, path?: string]
  'update:conditionalLogic': [value: Record<string, boolean>, path?: string]
}>()

const items = computed<Item[]>(() =>
  props.layout
    ? parseLayout(props.layout)
    : Object.entries(props.fields ?? {}).map(([name, options]) => ({
        type: 'DynamicField',
        field: { name, path: props.rootPath ? `${props.rootPath}.${name}` : name, options },
      })),
)

function parseLayout(layout: FieldsLayout): Item[] {
  const items: Item[] = []

  for (const x of layout) {
    if (x === '---') {
      items.push({ type: 'hr' })
    } else if (isString(x)) {
      const name = x.split('|')[0]!.trim()

      if (props.fields?.[name]) {
        items.push({
          type: 'DynamicField',
          field: { name, path: props.rootPath ? `${props.rootPath}.${name}` : name, options: props.fields[name] },
          style: { maxWidth: x.split('|')[1]?.trim() },
        })
      } else {
        console.warn(
          `Unable to resolve field \`${name}\` in \`${props.dataContainerName}\` ${props.dataContainerType} layout. Available fields:`,
          toRaw(props.fields),
        )
      }
    } else if (isObject(x)) {
      for (const key of Object.keys(x) as (keyof typeof x)[]) {
        if (key === 'field') {
          const fieldItem = x as FieldsLayoutFieldItem

          if (isString(fieldItem.field)) {
            items.push(...parseLayout([fieldItem.field]))
          } else if (props.fields?.[fieldItem.field.name]) {
            items.push({
              type: 'DynamicField',
              field: {
                name: fieldItem.field.name,
                path: props.rootPath ? `${props.rootPath}.${fieldItem.field.name}` : fieldItem.field.name,
                options: props.fields[fieldItem.field.name]!,
              },
              style: fieldItem.field.style,
            })
          } else {
            console.warn(
              `Unable to resolve field \`${fieldItem.field.name}\` in \`${props.dataContainerName}\` ${props.dataContainerType} layout. Available fields:`,
              toRaw(props.fields),
            )
          }
        } else if (key === 'row') {
          const row = x[key] as FieldsLayoutRow['row']

          if (!isEmpty(row)) {
            items.push({
              type: 'row',
              layout: row,
            })
          }
        } else if (key === 'card') {
          const card = x[key] as FieldsLayoutCard['card']

          if (!isEmpty(card)) {
            items.push({
              type: 'card',
              layout: card,
            })
          }
        } else if (key === 'tabs') {
          const tabs = x[key] as FieldsLayoutTabs['tabs']

          if (!isEmpty(tabs)) {
            items.push({
              type: 'tabs',
              list: tabs.map((tab, i) => ({ name: i, label: maybeTranslate(tab.label) })),
              layouts: tabs.map((tab) => tab.fields),
            })
          }
        } else if (key === 'component') {
          const component = x[key] as FieldsLayoutComponentItem['component']

          if (isDefined(customComponents[component])) {
            items.push({
              type: 'component',
              component: customComponents[component](),
            })
          } else {
            console.warn(
              `Unable to resolve custom component \`${component}\` in \`${props.dataContainerName}\` ${props.dataContainerType} layout. Available custom components:`,
              toRaw(customComponents),
            )
          }
        } else {
          console.warn(`Invalid layout item in \`${props.dataContainerName}\` ${props.dataContainerType} layout:`, x)
        }
      }
    } else {
      console.warn(`Invalid layout item in \`${props.dataContainerName}\` ${props.dataContainerType} layout:`, x)
    }
  }

  return items
}
</script>

<style scoped>
.p-fields-item + .p-fields-item {
  margin-top: 1rem;
}

.p-fields-row {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.p-fields-row > .p-fields-item {
  margin-top: 0;
}

:deep(.pui-tabs-content:not(:first-child)) {
  margin-top: 1rem;
}

:deep(.pui-tabs-content:not(:first-child) > div > .p-fields-card) {
  margin-top: calc(-1rem + 0.5em);
}

.p-fields-hr {
  width: calc(100% + 1.5rem);
  margin-right: -0.75rem;
  margin-left: -0.75rem;
}

.p-fields-item + .p-fields-hr,
.p-fields-hr + .p-fields-item {
  margin-top: 0.75rem;
}

@media (max-width: 480px) {
  .p-fields-row {
    flex-direction: column;
  }

  .p-fields-item:not(.p-fields-hr) {
    max-width: 100% !important;
  }
}
</style>
