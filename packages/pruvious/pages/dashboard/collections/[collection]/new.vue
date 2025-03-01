<template>
  <component
    v-model:conditionalLogic="conditionalLogic"
    v-model:data="data"
    v-model:errors="errors"
    :collection="collection"
    :conditionalLogicResolver="conditionalLogicResolver"
    :history="history"
    :is="layout"
    :isSubmitting="isSubmitting"
    :label="label"
    :queryBuilder="queryBuilder"
    @commit="history.push($event)"
    @save="saveData()"
    @updateConditionalLogic="updateConditionalLogicDebounced($event)"
    operation="create"
  >
    <template #header>
      <div class="pui-row">
        <PUIButton
          v-pui-tooltip="__('pruvious-dashboard', 'All items')"
          :to="dashboardBasePath + `collections/${route.params.collection}`"
          variant="outline"
        >
          <Icon :name="`tabler:${collection.definition.ui.menu.icon}`" mode="svg" />
        </PUIButton>
        <span class="pui-shrink-0">{{ label }}</span>
        <span v-if="translationOf" class="p-translation-of pui-muted pui-truncate">
          (
          <span class="pui-truncate">{{ __('pruvious-dashboard', 'New translation of') }}</span>
          &nbsp;
          <NuxtLink
            :to="dashboardBasePath + `collections/${route.params.collection}/${translationOf}`"
            class="pui-shrink-0"
          >
            #{{ translationOf }}
          </NuxtLink>
          )
        </span>
        <span v-else class="pui-muted pui-truncate">({{ __('pruvious-dashboard', 'New') }})</span>
      </div>
    </template>

    <PruviousFields
      v-if="data"
      v-model:conditionalLogic="conditionalLogic"
      v-model:data="data"
      :conditionalLogicResolver="conditionalLogicResolver"
      :dataContainerName="collection.name"
      :errors="errors"
      :fields="collection.definition.fields"
      :layout="fieldLayout"
      :syncedFields="collection.definition.syncedFields"
      :translatable="collection.definition.translatable"
      @commit="history.push($event)"
      @update:data="(_, path) => updateConditionalLogicDebounced(path)"
      dataContainerType="collection"
      operation="create"
    />

    <template #footer>
      <div class="pui-justify-between">
        <PruviousDashboardHistoryButtons v-if="data" v-model="data" :history="history" />

        <div class="pui-row pui-ml-auto">
          <component v-for="button in footerButtons" v-bind="footerButtonsContext" :is="button" />
          <PUIButton :variant="history.isDirty.value ? 'primary' : 'outline'" @click="saveData()">
            <span>{{ __('pruvious-dashboard', 'Create') }}</span>
            <Icon mode="svg" name="tabler:device-floppy" />
          </PUIButton>
        </div>
      </div>
    </template>
  </component>
</template>

<script lang="ts" setup>
import {
  __,
  applyFilters,
  dashboardBasePath,
  fillFieldData,
  getCollectionBySlug,
  hasPermission,
  History,
  isValidLanguageCode,
  loadFilters,
  maybeTranslate,
  parseConditionalLogic,
  prepareFieldData,
  pruviousDashboardPost,
  QueryBuilder,
  selectFrom,
  useDashboardContentLanguage,
} from '#pruvious/client'
import { type LanguageCode, type Permission } from '#pruvious/server'
import { ConditionalLogicResolver } from '@pruvious/orm/conditional-logic-resolver'
import {
  blurActiveElement,
  castToNumber,
  isDefined,
  isEmpty,
  isPositiveInteger,
  isString,
  isUndefined,
  lockAndLoad,
  titleCase,
} from '@pruvious/utils'
import { useDebounceFn } from '@vueuse/core'
import { resolveCollectionLayout } from '../../../../utils/pruvious/dashboard/layout'

definePageMeta({
  path: dashboardBasePath + 'collections/:collection/new',
  middleware: [
    'pruvious-dashboard',
    'pruvious-dashboard-auth-guard',
    async (to) => {
      const collection = getCollectionBySlug(to.params.collection)
      const translationOf = isString(to.query.translationOf) ? castToNumber(to.query.translationOf) : undefined
      const language = to.query.language

      if (!collection || !collection.definition.api.create || collection.definition.ui.hidden) {
        puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
          type: 'error',
          description: __('pruvious-dashboard', 'Page not found'),
          showAfterRouteChange: true,
        })
        return navigateTo(dashboardBasePath + 'overview')
      } else if (!hasPermission(`collection:${to.params.collection}:create` as Permission)) {
        puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
          type: 'error',
          description: __('pruvious-dashboard', 'You do not have permission to access the page `$page`', {
            page: to.path,
          }),
          showAfterRouteChange: true,
        })
        return navigateTo(dashboardBasePath + `collections/${to.params.collection}`)
      } else if (collection.definition.translatable && isDefined(translationOf) && !isPositiveInteger(translationOf)) {
        puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
          type: 'error',
          description: __('pruvious-dashboard', 'Invalid `$param` parameter', { param: 'translationOf' }),
          showAfterRouteChange: true,
        })
        return navigateTo(dashboardBasePath + `collections/${to.params.collection}`)
      } else if (collection.definition.translatable && isDefined(language) && !isValidLanguageCode(language)) {
        puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
          type: 'error',
          description: __('pruvious-dashboard', 'Invalid `$param` parameter', { param: 'language' }),
          showAfterRouteChange: true,
        })
        return navigateTo(dashboardBasePath + `collections/${to.params.collection}`)
      }
    },
  ],
})

const route = useRoute()
const contentLanguage = useDashboardContentLanguage()
const collection = getCollectionBySlug(route.params.collection)!
const translationKey = ref<string | null>(null)
const translationOf = isString(route.query.translationOf) ? castToNumber(route.query.translationOf) : undefined
let resolvedLanguage = contentLanguage.value

if (collection.definition.translatable) {
  if (route.query.language) {
    resolvedLanguage = route.query.language as LanguageCode
  }
  if (isDefined(translationOf)) {
    const q1 = await selectFrom(collection.name)
      .select(['language', 'translations'] as any)
      .where('id', '=', translationOf)
      .first()
    if (q1.success && q1.data?.language === resolvedLanguage) {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'You cannot translate a record into its source language'),
        showAfterRouteChange: true,
      })
      await navigateTo(dashboardBasePath + `collections/${route.params.collection}`)
    } else if (q1.success && isString(q1.data?.translations)) {
      translationKey.value = q1.data.translations
      const q2 = await selectFrom(collection.name)
        .select('translations' as any)
        .where('id', '=', translationOf)
        .populate()
        .first()
      if (q2.success && q2.data) {
        if ((q2.data.translations as any)?.[resolvedLanguage]) {
          puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
            type: 'error',
            description: __('pruvious-dashboard', 'A translation for language `$language` already exists', {
              language: resolvedLanguage.toUpperCase(),
            }),
            showAfterRouteChange: true,
          })
          await navigateTo(dashboardBasePath + `collections/${route.params.collection}`)
        }
      } else {
        puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
          type: 'error',
          description: __('pruvious-dashboard', 'Could not retrieve the source translation (ID: `$id`)', {
            id: translationOf,
          }),
          showAfterRouteChange: true,
        })
        await navigateTo(dashboardBasePath + `collections/${route.params.collection}`)
      }
    } else {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'Could not retrieve the source translation (ID: `$id`)', {
          id: translationOf,
        }),
        showAfterRouteChange: true,
      })
      await navigateTo(dashboardBasePath + `collections/${route.params.collection}`)
    }
  }
}

const layout = resolveCollectionLayout('create', collection)
const label = isDefined(collection.definition.ui.label)
  ? maybeTranslate(collection.definition.ui.label)
  : __('pruvious-dashboard', titleCase(collection.name ?? '', false) as any)

useHead({
  title: `${__('pruvious-dashboard', 'New')} - ${label}`,
})

provide('showContentLanguageSwitcher', collection.definition.translatable)
provide('disableContentLanguageSwitcher', collection.definition.translatable && isDefined(translationOf))

const queryBuilder = new QueryBuilder({ fetcher: pruviousDashboardPost })
const data = ref<Record<string, any>>(fillFieldData({}, collection.definition.fields))
const conditionalLogicResolver = new ConditionalLogicResolver()
let conditionalLogicDependencies: Record<string, boolean> = {}
const conditionalLogic = ref(resolveConditionalLogic())
const errors = ref<Record<string, string>>({})
const history = new History({
  omit: Object.entries(collection.definition.fields)
    .filter(([_, field]) => field.autoGenerated || field.immutable)
    .map(([fieldName]) => fieldName),
}).push(data.value ?? {})
const isSubmitting = ref(false)
const { listen } = usePUIHotkeys()
const overlayCounter = usePUIOverlayCounter()
const fieldLayout =
  collection.definition.ui.createPage.fields === 'mirror'
    ? collection.definition.ui.updatePage.fields == 'mirror'
      ? undefined
      : collection.definition.ui.updatePage.fields
    : collection.definition.ui.createPage.fields

await loadFilters('dashboard:collections:new:footer:buttons')
const footerButtonsContext = { collection, data, conditionalLogicResolver, conditionalLogic, errors }
const footerButtons = await applyFilters('dashboard:collections:new:footer:buttons', [], footerButtonsContext)

onMounted(() => {
  contentLanguage.value = resolvedLanguage
})

listen('save', () => {
  if (!overlayCounter.value) {
    blurActiveElement()
    setTimeout(saveData)
  }
})

function resolveConditionalLogic(reset = true) {
  conditionalLogicResolver.setInput(data.value)
  conditionalLogicDependencies = {}
  if (reset) {
    conditionalLogicResolver.setConditionalLogic(parseConditionalLogic(collection.definition.fields, data.value))
  }
  return conditionalLogicResolver.resolve()
}

const updateConditionalLogicDebounced = useDebounceFn((path?: string) => {
  if (isDefined(path) && !isDefined(conditionalLogicDependencies[path])) {
    const parsedConditionalLogic = parseConditionalLogic(collection.definition.fields, data.value)
    for (const from of Object.keys(parsedConditionalLogic)) {
      conditionalLogicDependencies[from] ??= false
      const referencedFieldPaths = conditionalLogicResolver.getReferencedFieldPaths(from)
      for (const to of referencedFieldPaths) {
        conditionalLogicDependencies[to] = true
      }
    }
  }
  if (isUndefined(path) || conditionalLogicDependencies[path]) {
    conditionalLogic.value = conditionalLogicResolver.setInput(data.value).resolve()
  }
}, 50)

const saveData = lockAndLoad(isSubmitting, async () => {
  const preparedData = fillFieldData(
    prepareFieldData(data.value, collection.definition.fields, history.getOriginalState()),
    collection.definition.fields,
  )

  if (collection.definition.translatable) {
    preparedData.language = contentLanguage.value
    preparedData.translations = translationKey.value
  }

  const query = await queryBuilder.insertInto(collection.name).values(preparedData).returningAll().run()

  if (query.success) {
    if (!isEmpty(query.data)) {
      data.value = query.data[0]!
      errors.value = {}
      history.push(data.value).setOriginalState(data.value)
      puiQueueToast(__('pruvious-dashboard', 'Created'), { type: 'success', showAfterRouteChange: true })
      await navigateTo(dashboardBasePath + `collections/${route.params.collection}/${data.value.id}`)
    } else {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'Page not found'),
        showAfterRouteChange: true,
      })
      await navigateTo(dashboardBasePath + `collections/${route.params.collection}`)
    }
  } else if (!isEmpty(query.inputErrors)) {
    errors.value = query.inputErrors[0]!
    puiQueueToast(__('pruvious-dashboard', 'Found $count $errors', { count: Object.keys(errors.value).length }), {
      type: 'error',
    })
  }
})
</script>

<style scoped>
.p-translation-of {
  display: flex;
  padding: 0.25rem 0;
}

.p-translation-of a {
  text-decoration: none;
}
</style>
