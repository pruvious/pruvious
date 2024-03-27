<template>
  <PruviousBase>
    <template #search>
      <PruviousSearchRecords
        v-if="collection.search"
        :language="collection.translatable ? record.language : undefined"
      />
    </template>

    <template v-if="collection.translatable && supportedLanguages.length > 1" #language-switcher>
      <component
        v-pruvious-tooltip="{
          content: __('pruvious-dashboard', 'Language'),
          offset: [0, 9],
        }"
        :is="SelectField"
        :modelValue="record.language"
        :options="{
          choices: languageChoices,
        }"
        @update:modelValue="changeLanguage($event as any)"
        class="!w-32"
      />
    </template>

    <div
      class="sticky top-0 z-[31] flex min-h-[6.25rem] items-center justify-between gap-8 bg-gray-50/75 p-8 backdrop-blur backdrop-filter"
    >
      <div class="flex items-center gap-3">
        <NuxtLink
          v-pruvious-tooltip="__('pruvious-dashboard', 'Show all $items', { items: collection.label.record.plural })"
          :to="
            `/${runtimeConfig.public.pruvious.dashboardPrefix}/collections/${collection.name}` +
            (collectionLanguage !== primaryLanguage ? `?where=language[=][${collectionLanguage}]` : '')
          "
          class="button button-white button-square"
        >
          <PruviousIconChevronLeft />
        </NuxtLink>

        <h1 class="truncate text-xl">
          {{ titleParts[0] }}
          <span v-if="titleParts[1]">
            <span class="text-primary-500">{{ titleParts[1] }}</span>
          </span>
        </h1>
      </div>

      <div class="flex gap-2">
        <PruviousHistoryButtons v-if="canUpdate" :history="history" @redo="redo()" @undo="undo()" />

        <component
          v-if="AdditionalCollectionOptions"
          :is="AdditionalCollectionOptions"
          :record="record"
          @update:record="onUpdate($event, !isEditingText())"
        />

        <a
          v-if="collection.publicPages"
          v-pruvious-tooltip="
            __('pruvious-dashboard', 'Open $item in new tab', { item: collection.label.record.singular })
          "
          :href="pageUrl"
          target="_blank"
          class="button button-white button-square"
        >
          <PruviousIconExternalLink />
        </a>

        <button
          v-if="isEditing && canDelete"
          v-pruvious-tooltip="{
            content:
              clickConfirmation?.id === 'delete-record'
                ? __('pruvious-dashboard', 'Confirm to !!delete!!')
                : __('pruvious-dashboard', 'Delete'),
            showOnCreate: clickConfirmation?.id === 'delete-record',
          }"
          @click="deleteRecord"
          type="button"
          class="button button-white-red button-square"
        >
          <PruviousIconTrash />
        </button>

        <button v-if="canUpdate" @click="save()" type="button" class="button">
          <span v-if="history.isDirty.value" class="!absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-white"></span>
          <span v-if="isEditing">{{ __('pruvious-dashboard', 'Update') }}</span>
          <span v-if="!isEditing">
            {{ record.public === false ? __('pruvious-dashboard', 'Save draft') : __('pruvious-dashboard', 'Create') }}
          </span>
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
        :canUpdate="canUpdate"
        :collectionRecord="record"
        :fieldLayout="collection.dashboard.fieldLayout"
        :fieldsDeclaration="collection.fields"
        :history="history"
        :isEditing="isEditing"
        :record="record"
        :resolvedConditionalLogic="resolvedConditionalLogic"
        :stickyTopBorder="true"
        @update:record="onUpdate($event, !isEditingText())"
        class="mb-8 min-w-0"
      />

      <div
        v-if="collection.translatable && supportedLanguages.length > 1"
        class="scrollbar-thin sticky top-[6.25rem] flex h-[calc(100vh-9.75rem)] w-full max-w-xs shrink-0 flex-col gap-4 overflow-auto px-2 pb-8 text-sm"
      >
        <PruviousCollectionTranslations :record="record" @changeLanguage="changeLanguage($event)" />
      </div>

      <div
        v-if="!collection.dashboard.fieldLayout.length"
        class="mb-8 flex-1 rounded-md border bg-white p-4 text-sm text-gray-400"
      >
        <p>{{ __('pruvious-dashboard', 'No fields to display') }}</p>
      </div>
    </div>
  </PruviousBase>
</template>

<script lang="ts" setup>
import { computed, ref, useHead, useRuntimeConfig, type PropType } from '#imports'
import { languageLabels, primaryLanguage, supportedLanguages, type SupportedLanguage } from '#pruvious'
import { dashboardMiscComponent, recordAdditionalCollectionOptions, selectFieldComponent } from '#pruvious/dashboard'
import { useEventListener } from '@vueuse/core'
import { debounce } from 'perfect-debounce'
import { useCollectionLanguage } from '../../composables/dashboard/collection-language'
import { confirmClick, useClickConfirmation } from '../../composables/dashboard/confirm-click'
import { navigateToPruviousDashboardPath, usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { pruviousDialog } from '../../composables/dashboard/dialog'
import { getHotkeyAction } from '../../composables/dashboard/hotkeys'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { watchUnsavedChanges } from '../../composables/dashboard/unsaved-changes'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { resolveConditionalLogic } from '../../utils/conditional-logic'
import { History } from '../../utils/dashboard/history'
import { blurActiveElement, isEditingText } from '../../utils/dom'
import { pruviousFetch } from '../../utils/fetch'
import { isObject } from '../../utils/object'
import { capitalize, joinRouteParts, resolveCollectionPathPrefix } from '../../utils/string'
import { getCapabilities } from '../../utils/users'

const props = defineProps({
  record: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  isEditing: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits<{
  'update:record': [Record<string, any>]
}>()

const clickConfirmation = useClickConfirmation()
const collectionLanguage = useCollectionLanguage()
const dashboard = usePruviousDashboard()
const runtimeConfig = useRuntimeConfig()
const user = useUser()

const AdditionalCollectionOptions = (recordAdditionalCollectionOptions as any)[dashboard.value.collection!]?.()
const collection = dashboard.value.collections[dashboard.value.collection!]
const errors = ref<Record<string, string>>({})
const history = new History(props.record)
const languageChoices = Object.fromEntries(languageLabels.map(({ code, name }) => [code, name]))
const pageUrl = ref('')
const resolvedConditionalLogic = ref<Record<string, boolean>>({})

const PruviousBase = dashboardMiscComponent.Base()
const PruviousCollectionTranslations = dashboardMiscComponent.CollectionTranslations()
const PruviousFieldLayout = dashboardMiscComponent.FieldLayout()
const PruviousHistoryButtons = dashboardMiscComponent.HistoryButtons()
const PruviousSearchRecords = dashboardMiscComponent.SearchRecords()
const SelectField = selectFieldComponent()

await loadTranslatableStrings('pruvious-dashboard')

if (collection.translatable) {
  collectionLanguage.value = props.record.language
}

const titleParts = computed(() =>
  props.isEditing
    ? [
        __('pruvious-dashboard', 'Edit $item', { item: collection.label.record.singular }) + ': ',
        collection.dashboard.primaryField
          ? props.record[collection.dashboard.primaryField] ||
            collection.fields[collection.dashboard.primaryField].additional.emptyLabel
          : `#${props.record.id}`,
      ]
    : [__('pruvious-dashboard', 'Create new $item', { item: collection.label.record.singular })],
)
const title = computed(() => titleParts.value.join(''))
const userCapabilities = getCapabilities(user.value)

const canDelete =
  collection.apiRoutes.delete &&
  (user.value?.isAdmin || (userCapabilities as any)[`collection-${collection.name}-delete`])
const canUpdate =
  collection.apiRoutes.update &&
  (user.value?.isAdmin || (userCapabilities as any)[`collection-${collection.name}-update`])

useHead({ title: () => title.value })

useEventListener('keydown', (event) => {
  const action = getHotkeyAction(event)

  if (action) {
    if (action === 'save') {
      blurActiveElement()
      save()
    } else if (action === 'undo') {
      undo()
    } else if (action === 'redo') {
      redo()
    }

    event.preventDefault()
    event.stopPropagation()
  }
})

await resolve()
watchUnsavedChanges(history)

async function resolve() {
  resolvedConditionalLogic.value = await resolveConditionalLogic(props.record, collection.fields)

  if (collection.publicPages) {
    const pathField = collection.publicPages.pathField ? collection.publicPages.pathField : 'path'
    const pathPrefix = resolveCollectionPathPrefix(collection as any, props.record.language, primaryLanguage)

    pageUrl.value = joinRouteParts(
      `${props.record.language === primaryLanguage ? '' : props.record.language}/${pathPrefix}/${
        props.record[pathField]
      }`,
    )
  }
}

const onUpdate = debounce((record: Record<string, any>, forceAddHistory: boolean = false) => {
  emit('update:record', record)
  history.add(record, forceAddHistory)
  setTimeout(resolve)
}, 50)

function undo() {
  emit('update:record', history.undo() ?? props.record)
  errors.value = {}
  setTimeout(resolve)
}

function redo() {
  emit('update:record', history.redo() ?? props.record)
  errors.value = {}
  setTimeout(resolve)
}

async function save() {
  if (!canUpdate) {
    return
  }

  errors.value = {}

  const response = props.isEditing
    ? await pruviousFetch<Record<string, any>>(`collections/${collection.name}/${props.record.id}`, {
        method: 'patch',
        body: props.record,
      })
    : await pruviousFetch<Record<string, any>>(`collections/${collection.name}`, {
        method: 'post',
        body: props.record,
      })

  if (response.success) {
    emit('update:record', response.data)
    history.add(response.data)
    history.setInitialState(response.data)
    setTimeout(resolve)

    if (props.isEditing) {
      pruviousToasterShow({
        message: __('pruvious-dashboard', '$item updated', {
          item: capitalize(collection.label.record.singular, false),
        }),
      })
    } else {
      pruviousToasterShow({
        message: __('pruvious-dashboard', '$item created', {
          item: capitalize(collection.label.record.singular, false),
        }),
        afterRouteChange: true,
      })
      await navigateToPruviousDashboardPath(`collections/${collection.name}/${response.data.id}`)
    }
  } else if (isObject(response.error)) {
    errors.value = response.error
    pruviousToasterShow({
      message: __('pruvious-dashboard', '$count $errors found', { count: Object.keys(response.error).length }),
      type: 'error',
    })
  }
}

async function deleteRecord(event: MouseEvent) {
  confirmClick({
    target: event.target as Element,
    id: 'delete-record',
    success: async () => {
      const response = await pruviousFetch(`collections/${collection.name}/${props.record.id}`, { method: 'delete' })

      if (response.success) {
        pruviousToasterShow({
          message: __('pruvious-dashboard', '$item deleted', {
            item: capitalize(collection.label.record.singular, false),
          }),
          afterRouteChange: true,
        })

        history.isDirty.value = false

        if (props.record.language === primaryLanguage) {
          await navigateToPruviousDashboardPath(`collections/${collection.name}`)
        } else {
          await navigateToPruviousDashboardPath(
            `collections/${collection.name}?where=language[=][${props.record.language}]`,
          )
        }
      }
    },
  })
}

async function changeLanguage(languageCode: SupportedLanguage) {
  if (props.isEditing) {
    const response = await pruviousFetch<{ translations: Record<string, number | null> }>(
      `collections/${collection.name}/${props.record.id}`,
      {
        query: { select: 'translations', populate: true },
      },
    )

    if (response.success) {
      if (response.data.translations[languageCode]) {
        await navigateToPruviousDashboardPath(
          `collections/${collection.name}/${response.data.translations[languageCode]}`,
        )
      } else {
        if (
          await pruviousDialog(
            __(
              'pruvious-dashboard',
              'The **$language** translation of this $item does not exist. Do you want to create it?',
              {
                language: __(
                  'pruvious-dashboard',
                  languageLabels.find(({ code }) => code === languageCode)!.name as any,
                ),
                item: collection.label.record.singular,
              },
            ),
            {
              resolve: __('pruvious-dashboard', 'Yes'),
              reject: __('pruvious-dashboard', 'No'),
            },
          )
        ) {
          const response = await pruviousFetch<Record<string, any>>(
            `collections/${collection.name}/${props.record.id}/mirror?from=${props.record.language}&to=${languageCode}`,
            { method: 'post' },
          )

          if (response.success) {
            pruviousToasterShow({ message: __('pruvious-dashboard', 'Translation created'), afterRouteChange: true })
            await navigateToPruviousDashboardPath(`collections/${collection.name}/${response.data.id}`)
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
      }
    }
  } else {
    collectionLanguage.value = languageCode
    emit('update:record', { ...props.record, language: languageCode })
  }
}
</script>
