<template>
  <component
    v-model:conditionalLogic="conditionalLogic"
    v-model:data="data"
    v-model:errors="errors"
    :canCreate="canCreate"
    :canDelete="canDelete"
    :canUpdate="canUpdate"
    :collection="collection"
    :conditionalLogicResolver="conditionalLogicResolver"
    :history="history"
    :id="id"
    :is="layout"
    :isSubmitting="isSubmitting"
    :label="label"
    :queryBuilder="queryBuilder"
    :recordLanguage="recordLanguage"
    @commit="history.push($event)"
    @save="saveData()"
    @updateConditionalLogic="updateConditionalLogicDebounced($event)"
    operation="update"
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
        <span class="pui-muted pui-truncate">(#{{ id }})</span>
      </div>
    </template>

    <PruviousFields
      v-if="data"
      v-model:conditionalLogic="conditionalLogic"
      v-model:data="data"
      :conditionalLogicResolver="conditionalLogicResolver"
      :dataContainerName="collection.name"
      :disabled="!canUpdate"
      :errors="errors"
      :fields="collection.definition.fields"
      :layout="fieldLayout"
      :syncedFields="collection.definition.syncedFields"
      :translatable="collection.definition.translatable"
      @commit="history.push($event)"
      @update:data="(_, path) => updateConditionalLogicDebounced(path)"
      dataContainerType="collection"
      operation="update"
    />

    <template v-if="canCreate || canUpdate || canDelete" #footer class="pui-row pui-ml-auto">
      <div class="pui-justify-between">
        <PruviousDashboardHistoryButtons v-if="canUpdate && data" v-model="data" :history="history" />

        <div>
          <component v-for="button in footerButtons" v-bind="footerButtonsContext" :is="button" />

          <PUIButton v-if="canUpdate" :variant="history.isDirty.value ? 'primary' : 'outline'" @click="saveData()">
            <span>{{ __('pruvious-dashboard', 'Save') }}</span>
            <Icon mode="svg" name="tabler:device-floppy" />
          </PUIButton>

          <PUIButton
            v-if="canCreate || canDelete"
            :title="__('pruvious-dashboard', 'More actions')"
            :variant="isRecordMenuVisible ? 'primary' : 'outline'"
            @click="isRecordMenuVisible = true"
            ref="recordMenuButton"
          >
            <Icon mode="svg" name="tabler:dots-vertical" />
          </PUIButton>
          <PUIDropdown
            v-if="isRecordMenuVisible"
            :reference="recordMenuButton?.$el"
            :restoreFocus="false"
            @click="isRecordMenuVisible = false"
            @close="isRecordMenuVisible = false"
          >
            <PUIDropdownItem
              v-if="canCreate"
              :title="__('pruvious-dashboard', 'New')"
              :to="dashboardBasePath + `collections/${route.params.collection}/new`"
            >
              <Icon mode="svg" name="tabler:note" />
              <span>{{ __('pruvious-dashboard', 'New') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="collection.definition.duplicate && canCreate"
              :title="__('pruvious-dashboard', 'Duplicate')"
              @click="duplicateRecord()"
            >
              <Icon mode="svg" name="tabler:copy" />
              <span>{{ __('pruvious-dashboard', 'Duplicate') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="collection.definition.translatable"
              :title="__('pruvious-dashboard', 'Translate')"
              @click="isTranslationPopupVisible = true"
            >
              <Icon mode="svg" name="tabler:language" />
              <span>{{ __('pruvious-dashboard', 'Translate') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="canDelete"
              :title="__('pruvious-dashboard', 'Delete')"
              @click="deleteRecord()"
              destructive
            >
              <Icon mode="svg" name="tabler:trash-x" />
              <span>{{ __('pruvious-dashboard', 'Delete') }}</span>
            </PUIDropdownItem>
          </PUIDropdown>
        </div>
      </div>

      <PruviousDashboardCollectionTranslationsPopup
        v-if="isTranslationPopupVisible"
        :collection="collection"
        :id="id"
        :size="-1"
        @close="$event().then(() => (isTranslationPopupVisible = false))"
      />
    </template>
  </component>
</template>

<script lang="ts" setup>
import {
  __,
  applyFilters,
  dashboardBasePath,
  getCollectionBySlug,
  getOverlayTransitionDuration,
  hasPermission,
  History,
  isValidLanguageCode,
  loadFilters,
  maybeTranslate,
  parseConditionalLogic,
  prepareFieldData,
  pruviousDashboardGet,
  pruviousDashboardPost,
  QueryBuilder,
  resolveCollectionRecordPermissions,
  unsavedChanges,
  useAuth,
  useDashboardContentLanguage,
} from '#pruvious/client'
import { type Permission } from '#pruvious/server'
import type { QueryBuilderResult } from '@pruvious/orm'
import { ConditionalLogicResolver } from '@pruvious/orm/conditional-logic-resolver'
import {
  blurActiveElement,
  castToNumber,
  isDefined,
  isEmpty,
  isPositiveInteger,
  isUndefined,
  lockAndLoad,
  nanoid,
  titleCase,
} from '@pruvious/utils'
import { useDebounceFn } from '@vueuse/core'
import { resolveCollectionLayout } from '../../../../utils/pruvious/dashboard/layout'

definePageMeta({
  path: dashboardBasePath + 'collections/:collection/:id',
  middleware: [
    'pruvious-dashboard',
    'pruvious-dashboard-auth-guard',
    (to) => {
      const collection = getCollectionBySlug(to.params.collection)
      const id = castToNumber(to.params.id)

      if (!collection || !collection.definition.api.update || collection.definition.ui.hidden) {
        puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
          type: 'error',
          description: __('pruvious-dashboard', 'Page not found'),
          showAfterRouteChange: true,
        })
        return navigateTo(dashboardBasePath + 'overview')
      } else if (!isPositiveInteger(id)) {
        puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
          type: 'error',
          description: __('pruvious-dashboard', 'Page not found'),
          showAfterRouteChange: true,
        })
        return navigateTo(dashboardBasePath + `collections/${to.params.collection}`)
      } else if (
        !hasPermission(`collection:${to.params.collection}:read` as Permission) &&
        !hasPermission(`collection:${to.params.collection}:update` as Permission)
      ) {
        puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
          type: 'error',
          description: __('pruvious-dashboard', 'You do not have permission to access the page `$page`', {
            page: to.path,
          }),
          showAfterRouteChange: true,
        })
        return navigateTo(dashboardBasePath + `collections/${to.params.collection}`)
      }
    },
  ],
})

const route = useRoute()
const id = castToNumber(route.params.id) as number
const collection = getCollectionBySlug(route.params.collection)!
const queryBuilder = new QueryBuilder({ fetcher: pruviousDashboardPost })
const data = ref(await readData())
const contentLanguage = useDashboardContentLanguage()
const recordLanguage = ref(contentLanguage.value)

if (!data.value) {
  puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
    type: 'error',
    description: __('pruvious-dashboard', 'Page not found'),
    showAfterRouteChange: true,
  })
  await navigateTo(dashboardBasePath + `collections/${route.params.collection}`)
}

if (collection.definition.translatable && isValidLanguageCode(data.value?.language)) {
  contentLanguage.value = data.value.language
  recordLanguage.value = data.value.language
}

const layout = resolveCollectionLayout('update', collection)
const label = isDefined(collection.definition.ui.label)
  ? maybeTranslate(collection.definition.ui.label)
  : __('pruvious-dashboard', titleCase(collection.name ?? '', false) as any)

useHead({
  title: `#${id} - ${label}`,
})

provide('showContentLanguageSwitcher', collection.definition.translatable)

const auth = useAuth()
const conditionalLogicResolver = new ConditionalLogicResolver()
let conditionalLogicDependencies: Record<string, boolean> = {}
const conditionalLogic = ref(resolveConditionalLogic())
const errors = ref<Record<string, string>>({})
const history = new History({
  omit: Object.entries(collection.definition.fields)
    .filter(([_, field]) => field.autoGenerated || field.immutable)
    .map(([fieldName]) => fieldName),
}).push(data.value ?? {})
const isManaged = collection.definition.authorField || collection.definition.editorsField
const canManage = hasPermission(`collection:${route.params.collection}:manage` as Permission)
const canCreate =
  collection.definition.api.create && hasPermission(`collection:${route.params.collection}:create` as Permission)
const canUpdate = computed(() => {
  if (collection.definition.api.update && hasPermission(`collection:${route.params.collection}:update` as Permission)) {
    if (!isManaged || canManage) {
      return true
    }
    if (collection.definition.authorField && data.value.author === auth.value.user?.id) {
      return true
    }
    if (collection.definition.editorsField && data.value.editors?.includes(auth.value.user?.id)) {
      return true
    }
  }
  return false
})
const canDelete = computed(() => {
  if (collection.definition.api.delete && hasPermission(`collection:${route.params.collection}:delete` as Permission)) {
    if (!isManaged || canManage) {
      return true
    }
    if (collection.definition.editorsField && (canManage || data.value.editors?.includes(auth.value.user?.id))) {
      return true
    }
  }
  return false
})
const isSubmitting = ref(false)
const { listen } = usePUIHotkeys()
const overlayCounter = usePUIOverlayCounter()
const fieldLayout =
  collection.definition.ui.updatePage.fields === 'mirror'
    ? collection.definition.ui.createPage.fields == 'mirror'
      ? undefined
      : collection.definition.ui.createPage.fields
    : collection.definition.ui.updatePage.fields
const isRecordMenuVisible = ref(false)
const recordMenuButton = useTemplateRef('recordMenuButton')
const isTranslationPopupVisible = ref(false)

await loadFilters('dashboard:collections:edit:footer:buttons')
const footerButtonsContext = { collection, data, id, conditionalLogicResolver, conditionalLogic, errors }
const footerButtons = await applyFilters('dashboard:collections:edit:footer:buttons', [], footerButtonsContext)

watch(contentLanguage, async (newContentLanguage, oldContentLanguage) => {
  if (newContentLanguage !== recordLanguage.value) {
    if (isSubmitting.value) {
      contentLanguage.value = oldContentLanguage
    } else {
      const resolvedPermissions = await resolveCollectionRecordPermissions(id, collection)

      if (resolvedPermissions[newContentLanguage].id) {
        if (!history.isDirty.value || (await unsavedChanges.prompt?.())) {
          setTimeout(
            () =>
              navigateTo(
                dashboardBasePath +
                  `collections/${route.params.collection}/${resolvedPermissions[newContentLanguage].id}`,
              ),
            getOverlayTransitionDuration(),
          )
        } else {
          contentLanguage.value = oldContentLanguage
        }
      } else {
        const action = await puiDialog({
          content: __('pruvious-dashboard', 'The `$language` translation does not exist. Do you want to create it?', {
            language: newContentLanguage.toUpperCase(),
          }),
          actions: [
            { name: 'cancel', label: __('pruvious-dashboard', 'Cancel') },
            { name: 'create', label: __('pruvious-dashboard', 'Create'), variant: 'primary' },
          ],
        })

        if (action === 'create') {
          setTimeout(async () => {
            if (!history.isDirty.value || (await unsavedChanges.prompt?.())) {
              setTimeout(
                () =>
                  navigateTo(
                    dashboardBasePath +
                      `collections/${route.params.collection}/new?translationOf=${id}&language=${newContentLanguage}`,
                  ),
                getOverlayTransitionDuration(),
              )
            } else {
              contentLanguage.value = oldContentLanguage
            }
          }, getOverlayTransitionDuration())
        } else {
          contentLanguage.value = oldContentLanguage
        }
      }
    }
  }
})

listen('save', () => {
  if (!overlayCounter.value) {
    blurActiveElement()
    setTimeout(saveData)
  }
})

async function readData() {
  return queryBuilder
    .selectFrom(collection.name)
    .where('id', '=', id)
    .first()
    .then(({ data }) => data!)
}

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
  const preparedData = prepareFieldData(data.value, collection.definition.fields, history.getOriginalState())
  const query = await queryBuilder.update(collection.name).set(preparedData).where('id', '=', id).returningAll().run()

  if (query.success) {
    if (!isEmpty(query.data)) {
      data.value = query.data[0]!
      errors.value = {}
      history.push(data.value).setOriginalState(data.value)
      puiQueueToast(__('pruvious-dashboard', 'Saved'), { type: 'success' })
    } else {
      puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
        type: 'error',
        description: __('pruvious-dashboard', 'Page not found'),
        showAfterRouteChange: true,
      })
      await navigateTo(dashboardBasePath + `collections/${route.params.collection}`)
    }
  } else if (query.inputErrors) {
    errors.value = query.inputErrors
    puiQueueToast(__('pruvious-dashboard', 'Found $count $errors', { count: Object.keys(errors.value).length }), {
      type: 'error',
    })
  }
})

async function duplicateRecord() {
  const resolvedPermissions = await resolveCollectionRecordPermissions(id, collection)
  const canUpdate =
    collection.definition.api.update && hasPermission(`collection:${route.params.collection}:update` as Permission)

  async function duplicateOne() {
    const duplicate = await pruviousDashboardGet(`collections/${route.params.collection}/${id}/duplicate` as any)

    if (duplicate.success) {
      const query = await queryBuilder.insertInto(collection.name).values(duplicate.data).returning('id').run()

      if (query.success && query.data.length) {
        puiToast(__('pruvious-dashboard', 'Duplicated'), {
          type: 'success',
          showAfterRouteChange: true,
          action: {
            label: canUpdate ? __('pruvious-dashboard', 'Edit') : __('pruvious-dashboard', 'View'),
            onClick: () =>
              navigateTo(dashboardBasePath + `collections/${route.params.collection}/${query.data[0]!.id}`),
          },
        })
      } else if (query.runtimeError) {
        puiToast(query.runtimeError)
      } else if (!isEmpty(query.inputErrors)) {
        puiToast(__('pruvious-dashboard', 'Error'), {
          type: 'error',
          description: '```\n' + JSON.stringify(query.inputErrors, null, 2) + '\n```',
        })
      } else {
        puiToast(__('pruvious-dashboard', 'An error occurred during duplication'), { type: 'error' })
      }
    } else {
      puiToast(duplicate.error.message ?? __('pruvious-dashboard', 'An error occurred during duplication'), {
        type: 'error',
      })
    }
  }

  if (collection.definition.translatable && Object.values(resolvedPermissions!).filter(({ id }) => id).length > 1) {
    const action = await puiDialog({
      content: __('pruvious-dashboard', 'Would you like to duplicate all translations or only the current one?'),
      actions: [
        { name: 'cancel', label: __('pruvious-dashboard', 'Cancel') },
        { name: 'all', label: __('pruvious-dashboard', 'All'), variant: 'primary' },
        { name: 'current', label: __('pruvious-dashboard', 'Current'), variant: 'primary' },
      ],
    })

    if (action === 'all') {
      const r1 = await Promise.all(
        Object.values(resolvedPermissions!).map(({ id }) =>
          pruviousDashboardGet(`collections/${route.params.collection}/${id}/duplicate` as any),
        ),
      )
      const p2: Promise<QueryBuilderResult<Record<string, any>[], Record<string, string>[]>>[] = []
      const translations = nanoid()

      for (const [language, { id }] of Object.entries(resolvedPermissions!)) {
        if (id) {
          const duplicate = r1.find(({ data }) => data.language === language)

          if (!duplicate?.success) {
            puiToast(duplicate?.error.message ?? __('pruvious-dashboard', 'An error occurred during duplication'), {
              type: 'error',
            })
            return
          }

          p2.push(
            queryBuilder
              .insertInto(collection.name)
              .values({ ...duplicate.data, translations })
              .returning(['id', 'language'])
              .run(),
          )
        }
      }

      const r2 = await Promise.all(p2)

      for (const r of r2) {
        if (!r.success) {
          if (r.runtimeError) {
            puiToast(r.runtimeError)
          } else if (!isEmpty(r.inputErrors)) {
            puiToast(__('pruvious-dashboard', 'Error'), {
              type: 'error',
              description: '```\n' + JSON.stringify(r.inputErrors, null, 2) + '\n```',
            })
          } else {
            puiToast(__('pruvious-dashboard', 'An error occurred during duplication'), { type: 'error' })
          }
        }
      }

      if (r2.every((r) => r.success)) {
        const rCurrentLanguage = r2.find(({ data }) => data[0]?.language === contentLanguage.value)
        puiToast(__('pruvious-dashboard', 'Duplicated'), {
          type: 'success',
          showAfterRouteChange: true,
          action: {
            label: canUpdate ? __('pruvious-dashboard', 'Edit') : __('pruvious-dashboard', 'View'),
            onClick: () =>
              navigateTo(
                dashboardBasePath +
                  `collections/${route.params.collection}/${rCurrentLanguage?.data[0]!.id ?? r2[0]!.data[0]!.id}`,
              ),
          },
        })
      }
    } else if (action === 'current') {
      await duplicateOne()
    }
  } else {
    await duplicateOne()
  }
}

async function deleteRecord() {
  const action = await puiDialog({
    content: __('pruvious-dashboard', 'Are you sure you want to delete this entry?'),
    actions: [
      { name: 'cancel', label: __('pruvious-dashboard', 'Cancel') },
      { name: 'delete', label: __('pruvious-dashboard', 'Delete'), variant: 'destructive' },
    ],
  })

  if (action === 'delete') {
    const query = await queryBuilder.deleteFrom(collection.name).where('id', '=', id).run()

    if (query.success) {
      setTimeout(() => {
        history.clear()
        puiQueueToast(__('pruvious-dashboard', 'Deleted'), { type: 'success', showAfterRouteChange: true })
        navigateTo(dashboardBasePath + `collections/${route.params.collection}`)
      }, getOverlayTransitionDuration())
    }
  }
}
</script>
