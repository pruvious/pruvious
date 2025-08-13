<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <div class="pui-row">
      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'Table overview')"
        @click="isDataTablePopupVisible = true"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:table" />
      </PUIButton>

      <PUIDynamicSelect
        :choicesResolver="choicesResolver"
        :id="id"
        :modelValue="(modelValue as any).value"
        :name="id"
        :noResultsFoundLabel="__('pruvious-dashboard', 'No results found')"
        :placeholder="placeholder"
        :searchLabel="__('pruvious-dashboard', 'Search...')"
        :selectedChoiceResolver="selectedChoiceResolver"
        @commit="$emit('commit', { ...modelValue, value: $event as any })"
        @update:modelValue="$emit('update:modelValue', { ...modelValue, value: $event as any })"
      />

      <template v-if="modelValue.value">
        <PUIButton
          v-if="resolvedPermissions?.[contentLanguage].canUpdate"
          v-pui-tooltip="__('pruvious-dashboard', 'Edit')"
          :to="dashboardBasePath + `collections/${collection.slug}/${modelValue.value}`"
          target="_blank"
          variant="outline"
        >
          <Icon mode="svg" name="tabler:pencil" />
        </PUIButton>

        <PUIButton
          v-else
          v-pui-tooltip="__('pruvious-dashboard', 'View')"
          :to="dashboardBasePath + `collections/${collection.slug}/${modelValue.value}`"
          target="_blank"
          variant="outline"
        >
          <Icon mode="svg" name="tabler:list-search" />
        </PUIButton>

        <PUIButton
          v-pui-tooltip="__('pruvious-dashboard', 'Clear selection')"
          @click="
            () => {
              $emit('update:modelValue', { ...modelValue, value: null })
              $emit('commit', { ...modelValue, value: null })
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
      :modelValue="modelValue.value ? ([modelValue.value] as any) : []"
      :title="label"
      @close="$event().then(() => (isDataTablePopupVisible = false))"
      @update:modelValue="
        (ids) => {
          $emit('update:modelValue', { ...modelValue, value: ids[0] ?? null })
          $emit('commit', { ...modelValue, value: ids[0] ?? null })
        }
      "
    />
  </PruviousFilterField>
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
  type WhereField,
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
   * The current where condition.
   */
  modelValue: {
    type: Object as PropType<WhereField>,
    required: true,
  },

  /**
   * The field name defined in a collection.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'record'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

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
  props.modelValue.value ? resolveTranslatableCollectionRecordPermissions(+props.modelValue.value, collection) : null,
)

provide('openLinksInNewTab', true)
provide('hideViewConfiguration', true)
provide('hideEditableFieldCellActions', true)

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
  if (props.modelValue.value) {
    const displayFields = toArray(props.options.ui.displayFields!)
    const select = displayFields.flatMap((x) => (isArray(x) ? x.filter((y) => collection.definition.fields[y]) : x))
    const query = await selectFrom(collection.name)
      .select(['id', ...select] as any)
      .where('id', '=', +props.modelValue.value)
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
            value: +props.modelValue.value,
            label: __('pruvious-dashboard', 'Deleted record') + ` (#${props.modelValue.value})`,
            detail: isDefined(displayFields[1]) ? '' : undefined,
          }
    }
  }

  return null
}
</script>
