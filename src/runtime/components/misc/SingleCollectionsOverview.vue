<template>
  <PruviousBase>
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
        @update:modelValue="changeLanguage($event!)"
        class="!w-32"
      />
    </template>

    <div
      class="sticky top-0 z-[31] flex min-h-[6.25rem] items-center justify-between gap-8 bg-gray-50/75 p-8 backdrop-blur backdrop-filter"
    >
      <h1 class="truncate text-xl">
        {{ title }}
      </h1>

      <div class="flex gap-2">
        <PruviousHistoryButtons v-if="canUpdate" :history="history" @redo="redo()" @undo="undo()" />

        <component
          v-if="AdditionalCollectionOptions"
          :is="AdditionalCollectionOptions"
          :record="record"
          @update:record="onUpdate(!isEditingText())"
        />

        <button v-if="canUpdate" @click="restoreDefaults()" type="button" class="button button-white">
          <span>{{ __('pruvious-dashboard', 'Restore defaults') }}</span>
        </button>

        <button v-if="canUpdate" @click="save()" type="button" class="button">
          <span v-if="history.isDirty.value" class="!absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-white"></span>
          <span>{{ __('pruvious-dashboard', 'Save') }}</span>
        </button>
      </div>
    </div>

    <div
      class="flex items-start gap-6 p-8 pb-0 pt-0"
      :class="{
        'pr-6': collection.translatable && supportedLanguages.length > 1,
        'pr-8': !collection.translatable || supportedLanguages.length === 1,
      }"
    >
      <PruviousFieldLayout
        v-if="collection.dashboard.fieldLayout.length"
        v-model:errors="errors"
        v-model:record="record"
        :canUpdate="canUpdate"
        :collectionRecord="record"
        :fieldLayout="collection.dashboard.fieldLayout"
        :fieldsDeclaration="collection.fields"
        :history="history"
        :resolvedConditionalLogic="resolvedConditionalLogic"
        :stickyTopBorder="true"
        @update:record="onUpdate(!isEditingText())"
        class="mb-8"
      />

      <div
        v-if="collection.translatable && supportedLanguages.length > 1"
        class="scrollbar-thin sticky top-[6.25rem] flex h-[calc(100vh-9.75rem)] w-full max-w-xs shrink-0 flex-col gap-4 overflow-auto px-2 pb-8 text-sm"
      >
        <PruviousCollectionTranslations :record="record" @changeLanguage="changeLanguage($event)" />
      </div>

      <div
        v-if="!collection.dashboard.fieldLayout.length"
        class="mb-8 min-w-0 flex-1 rounded-md border bg-white p-4 text-sm text-gray-400"
      >
        <p>{{ __('pruvious-dashboard', 'No fields to display') }}</p>
      </div>
    </div>
  </PruviousBase>
</template>

<script lang="ts" setup>
import { navigateTo, ref, useHead, useRoute, watch } from '#imports'
import { languageLabels, primaryLanguage, supportedLanguages, type SupportedLanguage } from '#pruvious'
import { dashboardMiscComponent, recordAdditionalCollectionOptions, selectFieldComponent } from '#pruvious/dashboard'
import { useEventListener } from '@vueuse/core'
import { debounce } from 'perfect-debounce'
import { useCollectionLanguage } from '../../composables/dashboard/collection-language'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { getHotkeyAction } from '../../composables/dashboard/hotkeys'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { watchUnsavedChanges } from '../../composables/dashboard/unsaved-changes'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { resolveConditionalLogic } from '../../utils/conditional-logic'
import { History } from '../../utils/dashboard/history'
import { blurActiveElement, isEditingText } from '../../utils/dom'
import { pruviousFetch } from '../../utils/fetch'
import { deepClone, isObject } from '../../utils/object'
import { capitalize } from '../../utils/string'
import { getCapabilities } from '../../utils/users'

const collectionLanguage = useCollectionLanguage()
const dashboard = usePruviousDashboard()
const route = useRoute()
const user = useUser()

const SelectField = selectFieldComponent()

await loadTranslatableStrings('pruvious-dashboard')

const AdditionalCollectionOptions = (recordAdditionalCollectionOptions as any)[dashboard.value.collection!]?.()
const collection = dashboard.value.collections[dashboard.value.collection!]
const errors = ref<Record<string, string>>({})
const language = ref('')
const languageChoices = Object.fromEntries(languageLabels.map(({ code, name }) => [code, name]))
const record = ref<Record<string, any>>({})
const resolvedConditionalLogic = ref<Record<string, boolean>>({})
const title = __('pruvious-dashboard', capitalize(collection.label.collection.plural, false) as any)
const userCapabilities = getCapabilities(user.value)

const history = new History(record.value)

const canUpdate = user.value?.isAdmin || (userCapabilities as any)[`collection-${collection.name}-update`]

const PruviousBase = dashboardMiscComponent.Base()
const PruviousCollectionTranslations = dashboardMiscComponent.CollectionTranslations()
const PruviousFieldLayout = dashboardMiscComponent.FieldLayout()
const PruviousHistoryButtons = dashboardMiscComponent.HistoryButtons()

useHead({ title })

useEventListener('keydown', async (event) => {
  const action = getHotkeyAction(event)

  if (action) {
    event.preventDefault()
    event.stopPropagation()

    if (action === 'save') {
      blurActiveElement()
      await save()
    } else if (action === 'undo') {
      undo()
    } else if (action === 'redo') {
      redo()
    }
  }
})

watch(
  () => route.query,
  async () => {
    errors.value = {}
    language.value = supportedLanguages.includes(route.query.language?.toString() ?? ('' as any))
      ? route.query.language!.toString()
      : primaryLanguage

    if (collection.translatable) {
      collectionLanguage.value = language.value as SupportedLanguage
    }

    record.value = await fetchRecord()
    history.reset().add(record.value)
    await resolve()
    watchUnsavedChanges(history)
  },
  { immediate: true },
)

async function fetchRecord() {
  const response = await pruviousFetch<Record<string, any>>(`collections/${collection.name}?language=${language.value}`)
  return response.success ? response.data : {}
}

async function resolve() {
  resolvedConditionalLogic.value = await resolveConditionalLogic(record.value, collection.fields)
}

const onUpdate = debounce((forceAddHistory: boolean = false) => {
  resolve()
  history.add(record.value, forceAddHistory)
}, 50)

function undo() {
  record.value = history.undo() ?? record.value
  errors.value = {}
  resolve()
}

function redo() {
  record.value = history.redo() ?? record.value
  errors.value = {}
  resolve()
}

async function save() {
  if (!canUpdate) {
    return
  }

  errors.value = {}

  const response = await pruviousFetch<Record<string, any>>(
    `collections/${collection.name}?language=${language.value}`,
    { method: 'patch', body: record.value },
  )

  if (response.success) {
    record.value = response.data
    history.add(record.value)
    history.setInitialState(record.value)
    resolve()
    pruviousToasterShow({ message: __('pruvious-dashboard', '$item updated', { item: title }) })
  } else if (isObject(response.error)) {
    errors.value = response.error
    pruviousToasterShow({
      message: __('pruvious-dashboard', '$count $errors found', { count: Object.keys(response.error).length }),
      type: 'error',
    })
  }
}

function restoreDefaults() {
  record.value = Object.fromEntries(
    Object.entries(collection.fields).map(([fieldName, field]) => [fieldName, deepClone(field.default)]),
  )
  history.add(record.value)
  resolve()
  pruviousToasterShow({ message: __('pruvious-dashboard', 'All fields have been reset to their default values') })
}

async function changeLanguage(languageCode: string) {
  await navigateTo({
    path: route.path,
    query: { ...route.query, language: languageCode !== primaryLanguage ? languageCode : undefined },
  })
  collectionLanguage.value = languageCode as SupportedLanguage
}
</script>
