<template>
  <PruviousBase>
    <template #search>
      <PruviousSearchRecords v-if="collection.search" :language="collection.translatable ? language : undefined" />
    </template>

    <template v-if="collection.translatable && supportedLanguages.length > 1" #language-switcher>
      <component
        v-pruvious-tooltip="{
          content: __('pruvious-dashboard', 'Language'),
          offset: [0, 9],
        }"
        :is="SelectField"
        :modelValue="language"
        :options="{
          choices: languageChoices,
        }"
        @update:modelValue="changeLanguage($event as any)"
        class="!w-32"
      />
    </template>

    <div class="flex min-h-full flex-col p-8" :class="{ 'h-full': !table.data.value.length }">
      <div class="flex items-center justify-between gap-8">
        <div class="flex items-center gap-2 overflow-hidden pr-1">
          <h1 class="truncate text-xl">{{ title }}</h1>

          <button
            v-if="filter.isActive.value"
            v-pruvious-tooltip="__('pruvious-dashboard', 'Clear filters')"
            @click="clearFilter()"
            type="button"
            class="button button-white button-square-xs"
          >
            <PruviousIconFilterOff />
          </button>
        </div>

        <div class="flex gap-2">
          <button
            v-if="canDeleteMany && table.data.value.length"
            v-pruvious-tooltip="
              isSelecting ? __('pruvious-dashboard', 'Disable selection') : __('pruvious-dashboard', 'Enable selection')
            "
            @click="toggleSelecting()"
            type="button"
            class="button button-white button-square"
            :class="{
              '!border-primary-700 !text-primary-700': isSelecting,
            }"
          >
            <PruviousIconCheckbox />
          </button>

          <button
            v-pruvious-tooltip="__('pruvious-dashboard', 'Edit columns')"
            @click="tableColumnsPopupVisible = true"
            type="button"
            class="button button-white button-square"
            :class="{
              '!border-primary-700 !text-primary-700': !table.hasDefaultColumns.value,
            }"
          >
            <PruviousIconLayoutColumns />
          </button>

          <button
            v-pruvious-tooltip="
              filter.isActive.value
                ? __('pruvious-dashboard', 'Edit filters')
                : __('pruvious-dashboard', 'Filter $items', { items: collection.label.record.plural })
            "
            @click="filterPopupVisible = true"
            type="button"
            class="button button-white button-square"
            :class="{
              '!border-primary-700 !text-primary-700': filter.isActive.value,
            }"
          >
            <PruviousIconFilter />
          </button>

          <button
            v-if="selection.count.value"
            v-pruvious-tooltip="{
              content:
                clickConfirmation?.id === 'delete-records'
                  ? __('pruvious-dashboard', 'Confirm to !!delete!!')
                  : __('pruvious-dashboard', 'Delete'),
              showOnCreate: clickConfirmation?.id === 'delete-records',
            }"
            @click="deleteSelectedRecords"
            type="button"
            class="button"
            :class="{
              'button-red border border-red-700': clickConfirmation?.id === 'delete-records',
              'button-white-red': clickConfirmation?.id !== 'delete-records',
            }"
          >
            <span>
              {{
                __('pruvious-dashboard', 'Delete $count $items', {
                  count: selection.count.value,
                  items: selection.currentType.value,
                })
              }}
            </span>
          </button>

          <NuxtLink
            v-if="canCreate"
            :to="`${collection.name}/create` + (language === primaryLanguage ? '' : '?language=' + language)"
            class="button"
          >
            <span>
              {{
                __('pruvious-dashboard', 'Add $item', {
                  item: __('pruvious-dashboard', collection.label.record.singular as any),
                })
              }}
            </span>
          </NuxtLink>
        </div>
      </div>

      <DevOnly>
        <PruviousDump class="mt-8">
          <div>Select: {{ filter.selectOption.value }}</div>
          <div>Where: {{ filter.whereOption.value }}</div>
          <div>Search: {{ filter.searchOption.value }}</div>
          <div>Order: {{ filter.orderOption.value }}</div>
          <div>Per page: {{ filter.perPageOption.value }}</div>
          <div>Current page: {{ filter.pageOption.value }} ({{ table.currentPage.value }})</div>
          <div>Last page: {{ table.lastPage.value }}</div>
          <div>Total records: {{ table.total.value }}</div>
          <div>Selected: {{ selection.selected.value }}</div>
          <div>Selected all: {{ selection.selectedAll.value }}</div>
          <div>Language: {{ language }}</div>
        </PruviousDump>
      </DevOnly>

      <div>
        <table v-if="table.data.value.length" class="mt-8 w-full table-fixed">
          <thead>
            <tr>
              <th v-if="isSelecting" class="z-20 w-0">
                <component
                  :indeterminate="selection.count.value > 0 && !selection.selectedAll.value"
                  :is="CheckboxField"
                  :modelValue="selection.count.value > 0"
                  :options="{}"
                  @update:modelValue="onSelectAllChange"
                />
              </th>

              <th
                v-for="field of filter.selectOption.value"
                scope="col"
                class="truncate"
                :style="
                  table.hasDefaultColumns.value && columnWidths[field]
                    ? { width: `${columnWidths[field]}%` }
                    : undefined
                "
              >
                <div class="flex items-center pt-px">
                  <span
                    v-pruvious-tooltip="collection.fields[field].options.description"
                    class="truncate"
                    :class="{ 'cursor-help': collection.fields[field].options.description }"
                  >
                    {{ __('pruvious-dashboard', collection.fields[field].options.label as any) }}
                  </span>

                  <PruviousTableSorter
                    :defaultOrder="`${collection.dashboard.overviewTable.sort.field}:${collection.dashboard.overviewTable.sort.direction}`"
                    :fieldDeclaration="collection.fields[field]"
                    :fieldName="field"
                    :table="table"
                  />
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="row of table.data.value">
              <td v-if="isSelecting" class="z-20 w-0">
                <component
                  :is="CheckboxField"
                  :modelValue="!!selection.selected.value[row.id]"
                  :options="{}"
                  @update:modelValue="
                    selection.selected.value[row.id] ? selection.deselect(row.id) : selection.select(row.id)
                  "
                />
              </td>

              <td v-for="(field, i) of filter.selectOption.value">
                <div v-if="!i" class="flex flex-col items-start gap-0.5">
                  <NuxtLink
                    :to="`${collection.name}/${row.id}`"
                    class="max-w-full truncate whitespace-pre-line font-medium transition hocus:text-primary-700"
                    :class="{'text-gray-400': (row as any)[field] === '' || (row as any)[field] === null}"
                  >
                    <span class="truncate">
                      {{
                        (row as any)[field] !== '' && (row as any)[field] !== null
                          ? (row as any)[field]
                          : __('pruvious-dashboard', collection.fields[field].additional.emptyLabel as any)
                      }}
                    </span>
                  </NuxtLink>

                  <div class="flex max-w-full gap-2">
                    <NuxtLink
                      :to="`${collection.name}/${row.id}`"
                      class="truncate text-xs text-gray-400 transition hocus:text-primary-700"
                    >
                      {{ canUpdate ? __('pruvious-dashboard', 'Edit') : __('pruvious-dashboard', 'View') }}
                    </NuxtLink>

                    <button
                      v-if="collection.canDuplicate && canCreate"
                      @click="duplicateRecord(row.id)"
                      type="button"
                      class="truncate text-xs text-gray-400 transition hocus:text-primary-700"
                    >
                      {{ __('pruvious-dashboard', 'Duplicate') }}
                    </button>

                    <button
                      v-if="collection.publicPages"
                      @click="openUrl(row.id)"
                      type="button"
                      class="truncate text-xs text-gray-400 transition hocus:text-primary-700"
                    >
                      {{ __('pruvious-dashboard', 'Open') }}
                    </button>

                    <component
                      v-if="AdditionalCollectionOptions"
                      :id="row.id"
                      :is="AdditionalCollectionOptions"
                      :table="table"
                    />

                    <button
                      v-if="canDelete"
                      v-pruvious-tooltip="{
                        content:
                          clickConfirmation?.id === `delete-record-${row.id}`
                            ? __('pruvious-dashboard', 'Confirm to !!delete!!')
                            : __('pruvious-dashboard', 'Delete'),
                        showOnCreate: clickConfirmation?.id === `delete-record-${row.id}`,
                        offset: [0, 8],
                      }"
                      @click="deleteRecord(row.id, $event)"
                      type="button"
                      class="truncate text-xs text-gray-400 transition hocus:text-red-500"
                    >
                      {{ __('pruvious-dashboard', 'Delete') }}
                    </button>
                  </div>
                </div>

                <component
                  v-if="i && field !== 'translations'"
                  :canUpdate="canUpdate"
                  :is="fieldPreviewsComponents[collection.fields[field].type]"
                  :language="language"
                  :name="field"
                  :options="collection.fields[field].options"
                  :record="row"
                  :value="(row as any)[field]"
                />

                <PruviousTranslationsFieldPreview
                  v-if="i && field === 'translations'"
                  :canUpdate="canUpdate"
                  :id="row.id"
                  :language="language"
                  :value="(row as any).translations"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PruviousTablePagination :table="table" />

      <div
        v-if="table.loaded.value && !filter.isActive.value && !table.data.value.length"
        class="mt-8 flex flex-1 rounded-md border p-8 text-center text-sm text-gray-500"
      >
        <p class="m-auto">
          {{ __('pruvious-dashboard', 'No $items found', { items: collection.label.record.plural }) }}
        </p>
      </div>

      <div
        v-if="table.loaded.value && filter.isActive.value && !table.data.value.length"
        class="mt-8 flex flex-1 rounded-md border p-8 text-center text-sm text-gray-500"
      >
        <p class="m-auto">
          {{
            __('pruvious-dashboard', 'No $items matching the current filter were found', {
              items: collection.label.record.plural,
            })
          }}
        </p>
      </div>
    </div>

    <PruviousTableColumnsPopup v-model:visible="tableColumnsPopupVisible" :table="table" />

    <PruviousFilterPopup
      v-model:visible="filterPopupVisible"
      :filter="filter"
      :title="__('pruvious-dashboard', 'Filter $items', { items: collection.label.record.plural })"
      @updateFilter="table.updateLocation()"
    />

    <PruviousPopup
      v-model:visible="selectAllPopupVisible"
      :showHeader="false"
      @hotkey="onSelectAllPopupHotkey"
      width="26rem"
    >
      <div class="flex flex-col gap-4 p-4">
        <p>
          {{
            __('pruvious-dashboard', 'Do you want to select all $count $items?', {
              count: table.total.value,
              items: collection.label.record.plural,
            })
          }}
        </p>

        <div class="flex justify-end gap-2">
          <button
            @click=";(selectAllPopupVisible = false), selection.selectAllOnThisPage()"
            type="button"
            class="button button-white"
          >
            <span>{{ __('pruvious-dashboard', 'No') }}</span>
          </button>

          <button
            @click=";(selectAllPopupVisible = false), selection.selectAll(filter)"
            type="button"
            class="button button-white"
          >
            <span>{{ __('pruvious-dashboard', 'Yes') }}</span>
          </button>
        </div>
      </div>
    </PruviousPopup>
  </PruviousBase>
</template>

<script lang="ts" setup>
import { ref, useHead, useRoute, watch } from '#imports'
import type { CollectionName } from '#pruvious'
import { languageLabels, primaryLanguage, supportedLanguages, type SupportedLanguage } from '#pruvious'
import {
  checkboxFieldComponent,
  dashboardMiscComponent,
  fieldPreviews,
  selectFieldComponent,
  tableAdditionalCollectionOptions,
} from '#pruvious/dashboard'
import { stringifyQuery } from '#vue-router'
import { useCollectionLanguage } from '../../composables/dashboard/collection-language'
import { confirmClick, useClickConfirmation } from '../../composables/dashboard/confirm-click'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import type { HotkeyAction } from '../../composables/dashboard/hotkeys'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { CollectionOverview } from '../../utils/dashboard/collection-overview'
import { Filter } from '../../utils/dashboard/filter'
import { RecordSelection } from '../../utils/dashboard/record-selection'
import { pruviousFetch } from '../../utils/fetch'
import { isObject } from '../../utils/object'
import { capitalize, joinRouteParts, resolveCollectionPathPrefix, titleCase } from '../../utils/string'
import { getCapabilities } from '../../utils/users'

const clickConfirmation = useClickConfirmation()
const collectionLanguage = useCollectionLanguage()
const dashboard = usePruviousDashboard()
const route = useRoute()
const user = useUser()

const CheckboxField = checkboxFieldComponent()
const PruviousBase = dashboardMiscComponent.Base()
const PruviousFilterPopup = dashboardMiscComponent.FilterPopup()
const PruviousPopup = dashboardMiscComponent.Popup()
const PruviousSearchRecords = dashboardMiscComponent.SearchRecords()
const PruviousTableColumnsPopup = dashboardMiscComponent.TableColumnsPopup()
const PruviousTablePagination = dashboardMiscComponent.TablePagination()
const PruviousTableSorter = dashboardMiscComponent.TableSorter()
const PruviousTranslationsFieldPreview = dashboardMiscComponent.TranslationsFieldPreview()
const SelectField = selectFieldComponent()

dashboard.value.collection = route.params.collection as CollectionName

const AdditionalCollectionOptions = (tableAdditionalCollectionOptions as any)[dashboard.value.collection]?.()
const collection = dashboard.value.collections[dashboard.value.collection!]
const columnWidths = Object.fromEntries(
  collection.dashboard.overviewTable.columns.map(({ field, width }) => [field, width]),
)
const fieldPreviewsComponents = Object.fromEntries(
  Object.entries(fieldPreviews).map(([name, component]) => [name, component()]),
)
const filter = new Filter(stringifyQuery(route.query))
const filterPopupVisible = ref(false)

const language = ref<SupportedLanguage>(
  filter.whereOption.value.$and?.find((rule: any) => rule.language?.$eq)?.language.$eq ??
    filter.whereOption.value.language?.$eq ??
    primaryLanguage,
)

if (!supportedLanguages.includes(language.value)) {
  language.value = primaryLanguage
}

if (collection.translatable) {
  collectionLanguage.value = language.value
}

await loadTranslatableStrings('pruvious-dashboard')

const languageChoices = Object.fromEntries(languageLabels.map(({ code, name }) => [code, name]))
const isSelecting = ref(false)
const selection = new RecordSelection(collection)
const table = new CollectionOverview(collection, filter, selection, language.value)
const tableColumnsPopupVisible = ref(false)
const selectAllPopupVisible = ref(false)
const title = __('pruvious-dashboard', capitalize(collection.label.collection.plural, false) as any)
const userCapabilities = getCapabilities(user.value)

const canCreate =
  collection.apiRoutes.create &&
  (user.value?.isAdmin || (userCapabilities as any)[`collection-${collection.name}-create`])
const canDelete =
  collection.apiRoutes.delete &&
  (user.value?.isAdmin || (userCapabilities as any)[`collection-${collection.name}-delete`])
const canDeleteMany =
  collection.apiRoutes.deleteMany &&
  (user.value?.isAdmin || (userCapabilities as any)[`collection-${collection.name}-delete-many`])
const canUpdate =
  collection.apiRoutes.update &&
  (user.value?.isAdmin || (userCapabilities as any)[`collection-${collection.name}-update`])

useHead({ title })

watch(
  () => route.query,
  async () => {
    table.setFilterFromQueryString(stringifyQuery(route.query))
    await table.fetchData()
  },
  { immediate: true },
)

async function clearFilter() {
  table.clearFilters()
  await table.updateLocation()
}

function toggleSelecting() {
  isSelecting.value = !isSelecting.value
  selection.deselectAll()
}

function onSelectAllChange(value: boolean) {
  if (value) {
    if (table.lastPage.value > 1) {
      selectAllPopupVisible.value = true
    } else {
      selection.selectAllOnThisPage()
    }
  } else {
    selection.deselectAll()
  }
}

async function deleteSelectedRecords(event: MouseEvent) {
  confirmClick({
    target: event.target as Element,
    id: 'delete-records',
    success: async () => {
      await selection.delete()
      await table.fetchData()
    },
  })
}

async function deleteRecord(id: number, event: MouseEvent) {
  confirmClick({
    target: event.target as Element,
    id: `delete-record-${id}`,
    success: async () => {
      const response = await pruviousFetch<{ id: number }>(`collections/${collection.name}/${id}`, {
        method: 'delete',
        query: { select: 'id' },
      })

      if (response.success) {
        pruviousToasterShow({
          message: __('pruvious-dashboard', '$item deleted', {
            item: titleCase(collection.label.record.singular, false),
          }),
        })
        await table.fetchData()
      }
    },
  })
}

async function duplicateRecord(id: number) {
  const response = await pruviousFetch<{ id: number }>(`collections/${collection.name}/${id}/duplicate`, {
    method: 'post',
    query: { select: 'id' },
  })

  if (response.success) {
    pruviousToasterShow({
      message: __('pruvious-dashboard', '$item duplicated', {
        item: titleCase(collection.label.record.singular, false),
      }),
    })
    await table.fetchData()
  } else if (isObject(response.error)) {
    pruviousToasterShow({
      message:
        '<ul><li>' +
        Object.entries(response.error)
          .map(([key, value]) => `**${key}:** ${value}`)
          .join('</li><li>') +
        '</li></ul>',
      type: 'error',
    })
  }
}

function onSelectAllPopupHotkey(action: HotkeyAction) {
  if (action === 'close') {
    selectAllPopupVisible.value = false
  }
}

async function openUrl(id: number) {
  if (collection.publicPages) {
    const response = await pruviousFetch<Record<string, any>>(`collections/${collection.name}/${id}`)

    if (response.success) {
      const baseUrl = joinRouteParts(
        (response.data.language === primaryLanguage ? '' : response.data.language) +
          '/' +
          resolveCollectionPathPrefix(collection as any, response.data.language, primaryLanguage) +
          '/' +
          response.data[collection.publicPages.pathField ?? 'path'],
      )

      if (
        collection.publicPages.publicField &&
        !response.data[collection.publicPages.publicField] &&
        collection.publicPages.draftTokenField
      ) {
        window.open(`${baseUrl}?__d=${response.data[collection.publicPages.draftTokenField]}`, '_blank')
      } else {
        window.open(baseUrl, '_blank')
      }
    }
  }
}

async function changeLanguage(languageCode: SupportedLanguage) {
  collectionLanguage.value = languageCode
  language.value = languageCode
  table.updateDefaultLanguage(languageCode)
  await table.updateLocation()
}
</script>
