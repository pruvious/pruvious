<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <div class="pui-row">
      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'Table overview')"
        :disabled="disabled"
        @click="isDataTablePopupVisible = true"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:table" />
      </PUIButton>

      <PUIDynamicSelect
        :choicesResolver="choicesResolver"
        :disabled="disabled"
        :error="!!error"
        :id="id"
        :modelValue="modelValue"
        :name="path"
        :noResultsFoundLabel="__('pruvious-dashboard', 'No results found')"
        :placeholder="placeholder"
        :searchLabel="__('pruvious-dashboard', 'Search...')"
        :selectedChoiceResolver="selectedChoiceResolver"
        @commit="$emit('commit', $event as number | null)"
        @update:modelValue="$emit('update:modelValue', $event as number | null)"
      />

      <template v-if="modelValue">
        <PUIButton
          v-if="resolvedPermissions?.[contentLanguage].canUpdate"
          v-pui-tooltip="__('pruvious-dashboard', 'Edit')"
          :to="dashboardBasePath + `collections/${collection.slug}/${modelValue}`"
          target="_blank"
          variant="outline"
        >
          <Icon mode="svg" name="tabler:pencil" />
        </PUIButton>

        <PUIButton
          v-else
          v-pui-tooltip="__('pruvious-dashboard', 'View')"
          :to="dashboardBasePath + `collections/${collection.slug}/${modelValue}`"
          target="_blank"
          variant="outline"
        >
          <Icon mode="svg" name="tabler:list-search" />
        </PUIButton>

        <PUIButton
          v-pui-tooltip="__('pruvious-dashboard', 'Clear selection')"
          :disabled="disabled"
          @click="
            () => {
              $emit('update:modelValue', null)
              $emit('commit', null)
            }
          "
          variant="outline"
        >
          <Icon mode="svg" name="tabler:x" />
        </PUIButton>
      </template>
    </div>

    <PruviousDashboardDataTablePopup
      v-if="isDataTablePopupVisible"
      :collectionName="options.collection"
      :languages="options.languages"
      :modelValue="modelValue ? [modelValue] : []"
      :title="label"
      @close="$event().then(() => (isDataTablePopupVisible = false))"
      @update:modelValue="
        (ids) => {
          $emit('update:modelValue', ids[0] ?? null)
          $emit('commit', ids[0] ?? null)
        }
      "
    />

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import {
  __,
  dashboardBasePath,
  maybeTranslate,
  resolveFieldLabel,
  resolveTranslatableCollectionRecordPermissions,
  selectFrom,
  useDashboardContentLanguage,
  usePruviousDashboard,
} from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import type {
  PUIDynamicSelectChoiceModel,
  PUIDynamicSelectPaginatedChoices,
} from '@pruvious/ui/components/PUIDynamicSelect.vue'
import { isArray, isDefined, slugify, toArray } from '@pruvious/utils'
import { computedAsync } from '@vueuse/core'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: [Number, null],
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
    type: Object as PropType<SerializableFieldOptions<'record'>>,
    required: true,
  },

  /**
   * The field path, expressed in dot notation, represents the exact location of the field within the current data structure.
   */
  path: {
    type: String,
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
  'commit': [value: number | null]
  'update:modelValue': [value: number | null]
}>()

provide('openLinksInNewTab', true)

const id = useId()
const label = resolveFieldLabel(props.options.ui.label, props.name)
const placeholder = maybeTranslate(props.options.ui.placeholder)
const isDataTablePopupVisible = ref(false)
const contentLanguage = useDashboardContentLanguage()
const dashboard = usePruviousDashboard()
const collection = {
  name: props.options.collection,
  slug: slugify(props.options.collection),
  definition: dashboard.value!.collections[props.options.collection]!,
}
const resolvedPermissions = computedAsync(() =>
  props.modelValue ? resolveTranslatableCollectionRecordPermissions(props.modelValue, collection) : null,
)

async function choicesResolver(page: number, keyword: string): Promise<PUIDynamicSelectPaginatedChoices> {
  const displayFields = toArray(props.options.ui.displayFields!)
  const searchFields = toArray(props.options.ui.searchFields!)
  const select = displayFields.flatMap((x) => (isArray(x) ? x.filter((y) => collection.definition.fields[y]) : x))
  const query = await selectFrom(collection.name)
    .select(['id', ...select] as any)
    .search(keyword, searchFields as any)
    .paged(page, 50)
    .paginate()

  if (query.success) {
    return {
      choices: query.data.records.map((record) => ({
        value: record.id,
        label: toArray(displayFields[0])!
          .flatMap((x) => (isArray(x) ? x.map((y: any) => record[y] ?? y) : (record[x] ?? x)))
          .join('')
          .trim(),
        detail: isDefined(displayFields[1])
          ? toArray(displayFields[1])!
              .flatMap((x) => (isArray(x) ? x.map((y: any) => record[y] ?? y) : (record[x] ?? x)))
              .join('')
              .trim()
          : undefined,
      })),
      currentPage: query.data.currentPage,
      lastPage: query.data.lastPage,
      perPage: query.data.perPage,
      total: query.data.total,
    }
  }

  return {
    choices: [],
    currentPage: 1,
    lastPage: 1,
    perPage: 50,
    total: 0,
  }
}

async function selectedChoiceResolver(): Promise<PUIDynamicSelectChoiceModel | null> {
  if (props.modelValue) {
    const displayFields = toArray(props.options.ui.displayFields!)
    const select = displayFields.flatMap((x) => (isArray(x) ? x.filter((y) => collection.definition.fields[y]) : x))
    const query = await selectFrom(collection.name)
      .select(['id', ...select] as any)
      .where('id', '=', props.modelValue)
      .first()

    if (query.success) {
      return query.data
        ? {
            value: query.data.id,
            label: toArray(displayFields[0])!
              .flatMap((x) => (isArray(x) ? x.map((y: any) => query.data![y] ?? y) : (query.data![x] ?? x)))
              .join('')
              .trim(),
            detail: isDefined(displayFields[1])
              ? toArray(displayFields[1])!
                  .flatMap((x) => (isArray(x) ? x.map((y: any) => query.data![y] ?? y) : (query.data![x] ?? x)))
                  .join('')
                  .trim()
              : undefined,
          }
        : {
            value: props.modelValue,
            label: __('pruvious-dashboard', 'Deleted record') + ` (#${props.modelValue})`,
            detail: isDefined(displayFields[1]) ? '' : undefined,
          }
    }
  }

  return null
}
</script>
