<template>
  <component
    v-model:conditionalLogic="conditionalLogic"
    v-model:data="data"
    v-model:errors="errors"
    :canCreate="false"
    :canDelete="false"
    :canUpdate="canUpdate"
    :conditionalLogicResolver="conditionalLogicResolver"
    :dataContainerName="singleton.name"
    :disabled="!canUpdate"
    :fields="singleton.definition.fields"
    :history="history"
    :is="layout"
    :isSubmitting="isSubmitting"
    :label="label"
    :layout="singleton.definition.ui.fieldsLayout"
    :singleton="singleton"
    :singletonLanguage="singletonLanguage"
    @commit="history.push($event)"
    @queueConditionalLogicUpdate="queueConditionalLogicUpdate($event)"
    @save="saveData()"
    dataContainerType="singleton"
    operation="update"
  >
    <template #header>
      {{ label }}
    </template>

    <PruviousFields
      v-if="data"
      v-model:conditionalLogic="conditionalLogic"
      v-model:modelValue="data"
      :conditionalLogicResolver="conditionalLogicResolver"
      :data="data"
      :dataContainerName="singleton.name"
      :disabled="!canUpdate"
      :errors="errors"
      :fields="singleton.definition.fields"
      :layout="singleton.definition.ui.fieldsLayout"
      :syncedFields="singleton.definition.syncedFields"
      :translatable="singleton.definition.translatable"
      @commit="history.push($event)"
      @queueConditionalLogicUpdate="queueConditionalLogicUpdate($event)"
      @update:modelValue="(_, path) => queueConditionalLogicUpdate(path)"
      dataContainerType="singleton"
      operation="update"
    />

    <PruviousDashboardHistoryScrollState />

    <template #footer>
      <div class="pui-justify-between pui-w-full">
        <PruviousDashboardHistoryButtons
          v-if="canUpdate && data"
          v-model="data"
          :history="history"
          @update:modelValue="errors = {}"
        />

        <div class="pui-row pui-ml-auto">
          <component v-for="button in footerButtons" v-bind="footerButtonsContext" :is="button" />

          <PUIButton :variant="history.isDirty.value ? 'primary' : 'outline'" @click="saveData()">
            <span>{{ __('pruvious-dashboard', 'Save') }}</span>
            <Icon mode="svg" name="tabler:device-floppy" />
          </PUIButton>

          <PUIButton
            v-if="canUpdate || singleton.definition.translatable"
            :title="__('pruvious-dashboard', 'More actions')"
            :variant="isSingletonMenuVisible ? 'primary' : 'outline'"
            @click="isSingletonMenuVisible = true"
            ref="singletonMenuButton"
          >
            <Icon mode="svg" name="tabler:dots-vertical" />
          </PUIButton>
          <PUIDropdown
            v-if="isSingletonMenuVisible"
            :reference="singletonMenuButton?.$el"
            :restoreFocus="false"
            @click="isSingletonMenuVisible = false"
            @close="isSingletonMenuVisible = false"
          >
            <PUIDropdownItem
              v-if="singleton.definition.translatable"
              :title="__('pruvious-dashboard', 'Translate')"
              @click="isTranslationPopupVisible = true"
            >
              <Icon mode="svg" name="tabler:language" />
              <span>{{ __('pruvious-dashboard', 'Translate') }}</span>
            </PUIDropdownItem>

            <PUIDropdownItem
              v-if="canUpdate"
              :title="__('pruvious-dashboard', 'Restore defaults')"
              @click="
                () => {
                  data = fillFieldData({} as any, singleton.definition.fields)
                  updateConditionalLogicDebounced()
                  history.push(data)
                }
              "
            >
              <Icon mode="svg" name="tabler:restore" />
              <span>{{ __('pruvious-dashboard', 'Restore defaults') }}</span>
            </PUIDropdownItem>
          </PUIDropdown>
        </div>
      </div>

      <PruviousDashboardSingletonTranslationsPopup
        v-if="isTranslationPopupVisible"
        :singleton="singleton"
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
  dashboardMiddleware,
  fillFieldData,
  getSingletonBySlug,
  hasPermission,
  History,
  loadFilters,
  maybeTranslate,
  parseConditionalLogic,
  prepareFieldData,
  pruviousDashboardGet,
  pruviousDashboardPatch,
  SingletonSelectQueryBuilder,
  SingletonUpdateQueryBuilder,
  unsavedChanges,
  useDashboardContentLanguage,
} from '#pruvious/client'
import type { Permission } from '#pruvious/server'
import { ConditionalLogicResolver } from '@pruvious/orm/conditional-logic-resolver'
import { usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import { puiHTMLInit } from '@pruvious/ui/pui/html'
import { usePUIOverlayCounter } from '@pruvious/ui/pui/overlay'
import { puiQueueToast } from '@pruvious/ui/pui/toast'
import { puiTooltipInit } from '@pruvious/ui/pui/tooltip'
import { blurActiveElement, isDefined, isString, isUndefined, lockAndLoad, titleCase, toArray } from '@pruvious/utils'
import { useDebounceFn } from '@vueuse/core'
import { resolveSingletonLayout } from '../../../utils/pruvious/dashboard/layout'

definePageMeta({
  path: dashboardBasePath + 'singletons/:singleton',
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
    (to) =>
      dashboardMiddleware(to, ({ __, puiQueueToast, getSingletonBySlug }) => {
        const singleton = getSingletonBySlug(to.params.singleton)

        if (!singleton || singleton.definition.ui.hidden) {
          puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
            type: 'error',
            description: __('pruvious-dashboard', 'Page not found'),
            showAfterRouteChange: true,
          })
          return navigateTo(dashboardBasePath + 'overview')
        }
      }),
  ],
})

await puiHTMLInit()
puiTooltipInit()

const route = useRoute()
const singleton = getSingletonBySlug(route.params.singleton)!
const layout = resolveSingletonLayout(singleton)
const label = isDefined(singleton.definition.ui.label)
  ? maybeTranslate(singleton.definition.ui.label)
  : __('pruvious-dashboard', titleCase(singleton.name ?? '', false) as any)

useHead({
  title: label,
})

provide('showContentLanguageSwitcher', singleton.definition.translatable)

const contentLanguage = useDashboardContentLanguage()
const singletonLanguage = ref(contentLanguage.value)
const data = ref(await readData())
const conditionalLogicResolver = new ConditionalLogicResolver()
let conditionalLogicDependencies: Record<string, boolean> = {}
const conditionalLogic = ref(resolveConditionalLogic())
const conditionalLogicUpdateQueue = new Set<(string & {}) | '$resolve' | '$reset'>()
const errors = ref<Record<string, string>>({})
const history = new History({
  omit: Object.entries(singleton.definition.fields)
    .filter(([_, field]) => field.autoGenerated || field.immutable)
    .map(([fieldName]) => fieldName),
}).push(data.value)
const canUpdate =
  singleton.definition.api.update && hasPermission(`singleton:${route.params.singleton}:update` as Permission)
const isSubmitting = ref(false)
const { listen } = usePUIHotkeys()
const overlayCounter = usePUIOverlayCounter()
const isSingletonMenuVisible = ref(false)
const singletonMenuButton = useTemplateRef('singletonMenuButton')
const isTranslationPopupVisible = ref(false)

await loadFilters('dashboard:singletons:footer:buttons')
const footerButtonsContext = { singleton, data, singletonLanguage, conditionalLogicResolver, conditionalLogic, errors }
const footerButtons = await applyFilters('dashboard:singletons:footer:buttons', [], footerButtonsContext)

watch(contentLanguage, async (newContentLanguage, oldContentLanguage) => {
  if (newContentLanguage !== singletonLanguage.value) {
    if (isSubmitting.value || (history.isDirty.value && !(await unsavedChanges.prompt?.()))) {
      contentLanguage.value = oldContentLanguage
    } else {
      singletonLanguage.value = newContentLanguage
      data.value = await readData()
      conditionalLogic.value = resolveConditionalLogic()
      errors.value = {}
      history.clear().push(data.value)
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
  return new SingletonSelectQueryBuilder(singleton.name, { fetcher: pruviousDashboardGet })
    .language((singleton.definition.translatable ? contentLanguage.value : null) as never)
    .get()
    .then(({ data }) => data!)
}

function resolveConditionalLogic(reset = true) {
  conditionalLogicResolver.setInput(data.value)
  conditionalLogicDependencies = {}
  if (reset) {
    conditionalLogicResolver.setConditionalLogic(parseConditionalLogic(singleton.definition.fields, data.value))
  }
  return conditionalLogicResolver.resolve()
}

function queueConditionalLogicUpdate(path?: (string & {}) | string[] | '$resolve' | '$reset') {
  if (isUndefined(path) || path === '$resolve') {
    conditionalLogicUpdateQueue.add('$resolve')
  } else if (path === '$reset') {
    conditionalLogicUpdateQueue.add('$reset')
  } else {
    toArray(path).forEach((p) => conditionalLogicUpdateQueue.add(p))
  }
  updateConditionalLogicDebounced()
}

const updateConditionalLogicDebounced = useDebounceFn(() => {
  const queue = [...conditionalLogicUpdateQueue]
  conditionalLogicUpdateQueue.clear()
  if (queue.some((path) => path === '$reset')) {
    conditionalLogic.value = resolveConditionalLogic(true)
  } else {
    if (queue.some((path) => isString(path) && !isDefined(conditionalLogicDependencies[path]))) {
      const parsedConditionalLogic = parseConditionalLogic(singleton.definition.fields, data.value)
      for (const from of Object.keys(parsedConditionalLogic)) {
        conditionalLogicDependencies[from] ??= false
        const referencedFieldPaths = conditionalLogicResolver.getReferencedFieldPaths(from)
        for (const to of referencedFieldPaths) {
          conditionalLogicDependencies[to] = true
        }
      }
    }
    if (queue.some((path) => path === '$resolve' || conditionalLogicDependencies[path])) {
      conditionalLogic.value = conditionalLogicResolver.setInput(data.value).resolve()
    }
  }
}, 50)

const saveData = lockAndLoad(isSubmitting, async () => {
  const preparedData = prepareFieldData(data.value, singleton.definition.fields, history.getOriginalState())
  const query = await new SingletonUpdateQueryBuilder(singleton.name, { fetcher: pruviousDashboardPatch })
    .set(preparedData)
    .language((singleton.definition.translatable ? contentLanguage.value : null) as never)
    .returningAll()
    .run()

  if (query.success) {
    data.value = query.data
    errors.value = {}
    history.push(data.value).setOriginalState(data.value)
    puiQueueToast(__('pruvious-dashboard', 'Saved'), { type: 'success' })
  } else if (query.inputErrors) {
    errors.value = query.inputErrors
    puiQueueToast(__('pruvious-dashboard', 'Found $count $errors', { count: Object.keys(errors.value).length }), {
      type: 'error',
    })
  }
})
</script>
