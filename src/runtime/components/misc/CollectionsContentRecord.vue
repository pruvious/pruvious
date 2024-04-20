<template>
  <PruviousBase :showMenu="false">
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

    <div class="flex h-full">
      <div class="flex h-full w-full max-w-[19rem] flex-col pl-6 pr-4 pt-8">
        <h2 class="flex items-center gap-2 px-2 text-sm leading-9">
          <span>{{ __('pruvious-dashboard', 'Blocks') }}</span>

          <PruviousIconKeyboard
            v-if="blockFocused || (iframeFocused && selectedBlock)"
            v-pruvious-tooltip="[
              __('pruvious-dashboard', 'Copy') + `[[${hotkeys.copy}]]`,
              __('pruvious-dashboard', 'Cut') + `[[${hotkeys.cut}]]`,
              __('pruvious-dashboard', 'Paste') + `[[${hotkeys.paste}]]`,
              __('pruvious-dashboard', 'Duplicate') + `[[${hotkeys.duplicate}]]`,
              __('pruvious-dashboard', 'Move up') + `[[${hotkeys.moveUp}]]`,
              __('pruvious-dashboard', 'Move down') + `[[${hotkeys.moveDown}]]`,
              __('pruvious-dashboard', 'Delete') + `[[${hotkeys.delete}]]`,
            ]"
            class="h-4 w-4 shrink-0"
          />
        </h2>

        <div class="scrollbar-thin mt-8 flex-1 overflow-y-auto pb-8">
          <div :data-key="(collection.contentBuilder as ContentBuilder).blocksField" id="blocks" ref="blocksEl">
            <PruviousBlockTreeItem
              v-for="({ block }, i) of record[(collection.contentBuilder as ContentBuilder).blocksField]"
              v-model:blockFocused="blockFocused"
              v-model:errors="errors"
              v-model:selectedBlock="selectedBlock"
              v-model:sortableBlockName="sortableBlockName"
              v-model:sortableKey="sortableKey"
              :blockData="block"
              :blockKey="`${(collection.contentBuilder as ContentBuilder).blocksField}.${i}`"
              :data-label="__('pruvious-dashboard', dashboard.blocks[block.name as BlockName].label as any)"
              :disabled="(isEditing && !canUpdate) || (!isEditing && !canCreate)"
              :index="i"
              :key="`${sortableKey}-${(collection.contentBuilder as ContentBuilder).blocksField}.${i}`"
              :tree="blockTree"
              @addBlockBefore="
                ;(addBlockPopupOptions.value = { treeOrSlot: blockTree, index: i }), (addBlockPopupVisible = true)
              "
              @clickBlock="messageIframe('scrollToBlock', $event), onClickBlock()"
              @delete="deleteBlock($event)"
              @highlight="messageIframe('highlightBlock', $event)"
              @openAddBlockPopup=";(addBlockPopupOptions.value = $event), (addBlockPopupVisible = true)"
              @openMoreBlockOptionsPopup="moreBlockOptionsPopupVisible = true"
              @sortEnd="onSortEnd"
              @unhighlight="messageIframe('unhighlightBlock', $event)"
              @update:errors="blockTree.setErrors($event)"
              @updated="triggerBlocksUpdate()"
            />
          </div>

          <button
            v-if="(isEditing && canUpdate) || (!isEditing && canCreate)"
            @click=";(addBlockPopupOptions.value = { treeOrSlot: blockTree }), (addBlockPopupVisible = true)"
            type="button"
            class="flex h-9 items-center gap-2 px-2 text-sm text-gray-400 outline-none transition hocus:text-primary-700"
          >
            <PruviousIconPlus class="h-4 w-4" />
            <span>{{ __('pruvious-dashboard', 'Add block') }}</span>
          </button>
        </div>
      </div>

      <div class="flex h-full flex-1 flex-col overflow-hidden px-4 pt-8">
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

          <div class="flex flex-1">
            <input
              v-if="collection.dashboard.primaryField"
              :disabled="(isEditing && !canUpdate) || (!isEditing && !canCreate)"
              :placeholder="__('pruvious-dashboard', (collection.fields[collection.dashboard.primaryField].options as any).label)"
              :title="__('pruvious-dashboard', (collection.fields[collection.dashboard.primaryField].options as any).description)"
              :value="record[collection.dashboard.primaryField]"
              @blur="onUpdatePrimaryField(($event.target as HTMLInputElement).value).then(reloadInstant)"
              @input="onUpdatePrimaryField(($event.target as HTMLInputElement).value).then(reload)"
              autocomplete="off"
              name="record-primary-field"
              type="text"
              class="flex-1 truncate bg-transparent text-xl font-medium outline-none placeholder:text-gray-300"
            />
          </div>

          <div class="ml-auto flex gap-2">
            <PruviousHistoryButtons
              v-if="(isEditing && canUpdate) || (!isEditing && canCreate)"
              :history="history"
              @redo="redo()"
              @undo="undo()"
            />

            <a
              v-pruvious-tooltip="__('pruvious-dashboard', 'Open preview in new tab')"
              :href="previewUrl"
              target="_blank"
              class="button button-white button-square"
            >
              <PruviousIconExternalLink />
            </a>

            <component
              v-if="AdditionalCollectionOptions"
              :is="AdditionalCollectionOptions"
              :record="record"
              @update:record="onUpdate(undefined, !isEditingText()).then(reloadInstant)"
            />

            <button
              v-pruvious-tooltip="__('pruvious-dashboard', 'Reload preview')"
              @click="hardReload()"
              type="button"
              class="button button-white button-square"
            >
              <PruviousIconRefresh />
            </button>

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

            <button
              v-if="(isEditing && canUpdate) || (!isEditing && canCreate)"
              @click="save()"
              type="button"
              class="button"
            >
              <span
                v-if="history.isDirty.value"
                class="!absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-white"
              ></span>
              <span v-if="isEditing">{{ __('pruvious-dashboard', 'Update') }}</span>
              <span v-if="!isEditing">
                {{
                  record.public === false ? __('pruvious-dashboard', 'Save draft') : __('pruvious-dashboard', 'Publish')
                }}
              </span>
            </button>
          </div>
        </div>

        <div class="mt-8 flex-1 border bg-white">
          <iframe
            v-if="previewUrl"
            :src="previewUrl"
            @load="updateIframeSize()"
            ref="iframe"
            class="h-full w-full"
          ></iframe>
        </div>

        <div
          class="flex h-8 shrink-0 items-center justify-center text-xs transition"
          :class="{
            'text-primary-700': iframeFocused,
            'text-gray-400': !iframeFocused,
          }"
        >
          <span>{{ iframeSize }}</span>
        </div>
      </div>

      <div class="flex h-full w-full max-w-sm flex-col pl-2 pr-6 text-sm">
        <div
          class="relative z-[31] flex h-25 items-center bg-gray-50 after:absolute after:inset-y-0 after:left-full after:w-6 after:bg-gray-50"
        >
          <div class="flex h-9 w-full justify-end gap-5 whitespace-nowrap pl-2 pr-2 font-medium text-gray-900">
            <template v-for="({ label, errors, layout }, i) of tabbedFieldLayouts">
              <button
                v-if="
                  (layout.length && tabbedFieldLayouts.length > 1) || (selectedBlock && blockTree.blocks[selectedBlock])
                "
                @click="activeTab = i"
                type="button"
                class="flex items-center gap-2 leading-9 transition hocus:opacity-100"
                :class="{ 'opacity-50': activeTab !== i }"
              >
                <span>{{ __('pruvious-dashboard', label as any) }}</span>
                <span
                  v-if="errors"
                  v-pruvious-tooltip="__('pruvious-dashboard', '$count $errors found', { count: errors })"
                  class="errors"
                >
                  {{ errors }}
                </span>
              </button>
            </template>

            <button
              v-if="selectedBlock && blockTree.blocks[selectedBlock] && selectedBlockFields.length"
              @click="activeTab = 'blocks'"
              type="button"
              class="flex items-center gap-2 leading-9 transition hocus:opacity-100"
              :class="{ 'opacity-50': activeTab !== 'blocks' }"
            >
              <span>{{ __('pruvious-dashboard', 'Block') }}</span>
              <span
                v-if="blockTree.blocks[selectedBlock].errorCount"
                v-pruvious-tooltip="
                  __('pruvious-dashboard', '$count $errors found', {
                    count: blockTree.blocks[selectedBlock].errorCount,
                  })
                "
                class="errors"
              >
                {{ blockTree.blocks[selectedBlock].errorCount }}
              </span>
            </button>
          </div>
        </div>

        <div class="scrollbar-thin flex flex-1 flex-col gap-4 overflow-y-auto px-2">
          <template v-for="({ layout }, i) of tabbedFieldLayouts">
            <PruviousFieldLayout
              v-if="activeTab === i && layout.length"
              v-model:errors="errors"
              :canUpdate="canUpdate"
              :collectionRecord="record"
              :compact="true"
              :fieldLayout="layout"
              :fieldsDeclaration="collection.fields"
              :history="history"
              :isEditing="isEditing"
              :record="record"
              :resolvedConditionalLogic="resolvedConditionalLogic"
              @changeLanguage="changeLanguage"
              @update:record="onUpdate($event, !isEditingText()).then(reload)"
              class="compact mb-8"
            />
          </template>

          <div
            v-if="
              activeTab === 'blocks' && selectedBlock && blockTree.blocks[selectedBlock] && selectedBlockFields.length
            "
          >
            <PruviousFieldLayout
              v-model:errors="errors"
              :canUpdate="canUpdate"
              :collectionRecord="record"
              :compact="true"
              :fieldLayout="selectedBlockFields"
              :fieldsDeclaration="(dashboard.blocks[blockTree.blocks[selectedBlock].item.block.name].fields as any)"
              :history="history"
              :isEditing="isEditing"
              :keyPrefix="`${selectedBlock}.block.fields.`"
              :record="blockTree.blocks[selectedBlock].item.block.fields"
              :resolvedConditionalLogic="resolvedConditionalLogic"
              @update:record="
                ;(blockTree.blocks[selectedBlock].item.block.fields = $event),
                  onUpdate(undefined, !isEditingText()).then(reload)
              "
              class="compact mb-8"
            />
          </div>
        </div>
      </div>
    </div>

    <PruviousAddBlockPopup
      v-model:visible="addBlockPopupVisible"
      :options="addBlockPopupOptions.value"
      @pasteBlockAfter="pasteBlockAfter($event)"
      @selected=";(selectedBlock = $event), refreshSelectedBlock()"
      @updated="sortableKey++, onUpdate().then(reloadInstant)"
    />

    <PruviousMoreBlockOptionsPopup
      v-model:selectedBlock="selectedBlock"
      v-model:visible="moreBlockOptionsPopupVisible"
      :tree="blockTree"
      @copy="copyBlock(selectedBlock!)"
      @cut="cutBlock(selectedBlock!)"
      @delete="deleteBlock(selectedBlock!)"
      @duplicate="duplicateBlock(selectedBlock!)"
      @paste="pasteBlockAfter(selectedBlock!)"
      @updated="sortableKey++, onUpdate().then(reloadInstant)"
    />

    <DevOnly>
      <div @click=";($event.target as HTMLDivElement).remove()" class="absolute right-8 top-8 z-50 w-3/4 space-y-2">
        <PruviousDump class="pointer-events-none shadow-md">
          <div v-for="block of record[(collection.contentBuilder as ContentBuilder).blocksField]">
            {{ block }}
          </div>
        </PruviousDump>

        <PruviousDump class="pointer-events-none shadow-md">
          <div>Selected block: {{ selectedBlock }}</div>
        </PruviousDump>
      </div>
    </DevOnly>
  </PruviousBase>
</template>

<script lang="ts" setup>
import { isRef, nextTick, ref, useHead, useRuntimeConfig, watch, type PropType } from '#imports'
import {
  languageLabels,
  primaryLanguage,
  supportedLanguages,
  type BlockName,
  type CastedFieldType,
  type ContentBuilder,
  type FieldLayout,
  type PublicPagesOptions,
  type SupportedLanguage,
} from '#pruvious'
import {
  dashboardMiscComponent,
  fieldTypes,
  recordAdditionalCollectionOptions,
  selectFieldComponent,
} from '#pruvious/dashboard'
import { useEventListener } from '@vueuse/core'
import { useSortable } from '@vueuse/integrations/useSortable'
import { nanoid } from 'nanoid'
import { debounce } from 'perfect-debounce'
import { copyToClipboard, usePruviousClipboard } from '../../composables/dashboard/clipboard'
import { useCollectionLanguage } from '../../composables/dashboard/collection-language'
import { confirmClick, useClickConfirmation } from '../../composables/dashboard/confirm-click'
import { navigateToPruviousDashboardPath, usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { pruviousDialog } from '../../composables/dashboard/dialog'
import { getHotkeyAction, hotkeys } from '../../composables/dashboard/hotkeys'
import { startMoving, stopMoving, useIsMoving } from '../../composables/dashboard/move'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { watchUnsavedChanges } from '../../composables/dashboard/unsaved-changes'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { clearArray } from '../../utils/array'
import { resolveConditionalLogic } from '../../utils/conditional-logic'
import { BlockTree, type BlocksRepeaterItem } from '../../utils/dashboard/block-tree'
import { BlockTreeItem } from '../../utils/dashboard/block-tree-item'
import { defaultSortableOptions } from '../../utils/dashboard/defaults'
import { extractFieldKeys } from '../../utils/dashboard/extract-field-keys'
import { History } from '../../utils/dashboard/history'
import { blurActiveElement, isEditingText } from '../../utils/dom'
import { pruviousFetch } from '../../utils/fetch'
import { isNumber } from '../../utils/number'
import { getProperty, isObject } from '../../utils/object'
import { slugify } from '../../utils/slugify'
import { capitalize, isString, joinRouteParts, resolveCollectionPathPrefix } from '../../utils/string'
import { getCapabilities } from '../../utils/users'
import type { AddBlockOptions } from './AddBlockPopup.vue'

interface TabbedFieldLayout {
  label: string
  errors: number
  layout: FieldLayout[]
}

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
const clipboard = usePruviousClipboard()
const collectionLanguage = useCollectionLanguage()
const dashboard = usePruviousDashboard()
const isMoving = useIsMoving()
const runtimeConfig = useRuntimeConfig()
const user = useUser()

const activeTab = ref<number | 'blocks'>(0)
const addBlockPopupOptions: { value?: AddBlockOptions } = {}
const addBlockPopupVisible = ref(false)
const AdditionalCollectionOptions = (recordAdditionalCollectionOptions as any)[dashboard.value.collection!]?.()
const blocksEl = ref<HTMLElement>()
const blockFocused = ref(false)
const collection = dashboard.value.collections[dashboard.value.collection!]
const errors = ref<Record<string, string>>({})
const history = new History(props.record)
const iframe = ref<HTMLIFrameElement>()
const iframeFocused = ref(false)
const iframeSize = ref('')
const languageChoices = Object.fromEntries(languageLabels.map(({ code, name }) => [code, name]))
const moreBlockOptionsPopupVisible = ref(false)
const pathFieldDirty = ref(false)
const preview = ref<CastedFieldType['previews']>()
const previewUrl = ref('')
const resolvedConditionalLogic = ref<Record<string, boolean>>({})
const selectedBlock = ref<string | null>(null)
const selectedBlockFields = ref<string[]>([])
const sortableBlockName = ref('')
const sortableGroup = ref('blocks')
const sortableKey = ref(0)
const tabbedFieldLayouts = ref<TabbedFieldLayout[]>([])

const blockTree = new BlockTree(
  props.record[(collection.contentBuilder as ContentBuilder).blocksField],
  collection,
  errors.value,
)

const PruviousAddBlockPopup = dashboardMiscComponent.AddBlockPopup()
const PruviousBase = dashboardMiscComponent.Base()
const PruviousBlockTreeItem = dashboardMiscComponent.BlockTreeItem()
const PruviousFieldLayout = dashboardMiscComponent.FieldLayout()
const PruviousHistoryButtons = dashboardMiscComponent.HistoryButtons()
const PruviousMoreBlockOptionsPopup = dashboardMiscComponent.MoreBlockOptionsPopup()
const PruviousSearchRecords = dashboardMiscComponent.SearchRecords()
const SelectField = selectFieldComponent()

await loadTranslatableStrings('pruvious-dashboard')

if (collection.translatable) {
  collectionLanguage.value = props.record.language
}

const title = props.isEditing
  ? __('pruvious-dashboard', 'Edit $item', { item: collection.label.record.singular }) +
    ': ' +
    (collection.dashboard.primaryField ? props.record[collection.dashboard.primaryField] : `#${props.record.id}`)
  : __('pruvious-dashboard', 'Create new $item', { item: collection.label.record.singular })
const userCapabilities = getCapabilities(user.value)

const canCreate =
  collection.apiRoutes.create &&
  (user.value?.isAdmin || (userCapabilities as any)[`collection-${collection.name}-create`])
const canDelete =
  collection.apiRoutes.delete &&
  (user.value?.isAdmin || (userCapabilities as any)[`collection-${collection.name}-delete`])
const canUpdate =
  collection.apiRoutes.update &&
  (user.value?.isAdmin || (userCapabilities as any)[`collection-${collection.name}-update`])

const previewResponse = await pruviousFetch<CastedFieldType['previews']>('collections/previews', {
  method: 'post',
  body: { data: JSON.stringify(props.record), collection: collection.name },
})

if (previewResponse.success) {
  preview.value = previewResponse.data
}

useHead({ title })

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
    } else if (action === 'copy') {
      if (blockFocused.value && selectedBlock.value) {
        copyBlock(selectedBlock.value)
      } else {
        return
      }
    } else if (action === 'cut') {
      if (blockFocused.value && selectedBlock.value) {
        cutBlock(selectedBlock.value)
      } else {
        return
      }
    } else if (action === 'paste') {
      if (blockFocused.value && selectedBlock.value) {
        pasteBlockAfter(selectedBlock.value)
      }
    } else if (action === 'delete') {
      if (blockFocused.value && selectedBlock.value) {
        deleteBlock(selectedBlock.value)
      }
    } else if (action === 'duplicate') {
      if (blockFocused.value && selectedBlock.value) {
        duplicateBlock(selectedBlock.value)
      }
    } else if (action === 'moveUp') {
      if (blockFocused.value && selectedBlock.value) {
        moveBlockUp(selectedBlock.value)
      }
    } else if (action === 'moveDown') {
      if (blockFocused.value && selectedBlock.value) {
        moveBlockDown(selectedBlock.value)
      }
    }

    event.preventDefault()
    event.stopPropagation()
  }
})

useEventListener(document, 'focusin', () => (blockFocused.value = !!document.activeElement?.hasAttribute('data-block')))

useEventListener(
  document,
  'focusout',
  () => (blockFocused.value = !!document.activeElement?.hasAttribute('data-block')),
)

const sortable = useSortable(
  () => blocksEl.value,
  props.record[(collection.contentBuilder as ContentBuilder).blocksField],
  {
    ...defaultSortableOptions,
    group: sortableBlockName.value,
    emptyInsertThreshold: 0,
    onUpdate: () => null,
    onStart: (e: any) => {
      document.body.classList.add('is-sorting')
      sortableBlockName.value = ''
      nextTick(
        () => (sortableBlockName.value = blockTree.blocks[`${e.from.dataset.key}.${e.oldIndex}`].item.block.name),
      )
    },
    onEnd: onSortEnd,
    setData: (dataTransfer: DataTransfer, el: HTMLDivElement) => {
      startMoving({ dragImageLabel: __('pruvious-dashboard', el.dataset.label as any) })
      dataTransfer.setDragImage(document.getElementById('pruvious-drag-image')!, -16, 10)
      dataTransfer.effectAllowed = 'move'
    },
  },
)

watch(sortableBlockName, () => {
  sortableGroup.value =
    !selectedBlock.value?.includes('.block.slots.') ||
    blockTree.allowedRootBlocks.includes(sortableBlockName.value as BlockName)
      ? 'blocks'
      : nanoid()

  sortable.option('group', sortableBlockName.value ? sortableGroup.value : 'blocks')
})

if (collection.publicPages && collection.publicPages.layoutField) {
  watch(
    () => props.record[(collection.publicPages as PublicPagesOptions).layoutField as string],
    (value) => blockTree.setLayout(value),
    { immediate: true },
  )
}

watch(selectedBlock, refreshSelectedBlock)

watch(isMoving, () => messageIframe('isMoving', isMoving.value))

await resolve()
resolveTabbedFieldLayouts()
watchUnsavedChanges(history)

async function resolve() {
  resolvedConditionalLogic.value = await resolveConditionalLogic(props.record, collection.fields)

  const pathField =
    collection.publicPages && collection.publicPages.pathField ? collection.publicPages.pathField : 'path'
  const pathPrefix = resolveCollectionPathPrefix(collection as any, props.record.language, primaryLanguage)
  const basePreviewUrl = joinRouteParts(
    props.record.language === primaryLanguage ? '' : props.record.language,
    pathPrefix,
    props.record[pathField],
  )

  previewUrl.value = `${basePreviewUrl}?__p=${preview.value?.token ?? '_'}`
}

const onUpdate = debounce(onUpdateInstant, 50)
const onUpdatePrimaryField = debounce(onUpdatePrimaryFieldInstant, 50)

async function onUpdateInstant(record?: Record<string, any>, forceAddHistory: boolean = false) {
  history.add(record ?? props.record, forceAddHistory)
  emitUpdateRecord(record ?? props.record)
  setTimeout(resolve)
}

async function onUpdatePrimaryFieldInstant(value: string) {
  const primaryFieldType = fieldTypes[collection.fields[collection.dashboard.primaryField!].type]
  const resolvedValue = primaryFieldType === 'number' ? +value : value
  const record = { ...props.record }

  if (
    primaryFieldType === 'string' &&
    !props.isEditing &&
    !pathFieldDirty.value &&
    collection.publicPages &&
    collection.publicPages.seo?.titleField === collection.dashboard.primaryField
  ) {
    const pathField = collection.publicPages.pathField ? collection.publicPages.pathField : 'path'
    const oldPath = '/' + slugify(props.record[collection.dashboard.primaryField!])

    if (oldPath === props.record[pathField]) {
      record[pathField] = '/' + slugify(resolvedValue as string)
    } else {
      pathFieldDirty.value = true
    }
  }

  record[collection.dashboard.primaryField!] = resolvedValue
  history.add(record)
  emitUpdateRecord(record)
  setTimeout(resolve)
}

function undo() {
  if (history.undosRemaining.value) {
    const fingerprint = selectedBlock.value ? blockTree.fingerprint(selectedBlock.value) : null
    const record = history.undo() ?? props.record

    errors.value = {}
    blockTree.clearErrors()
    blockTree.setData(mergeRecordBlocks(record)[(collection.contentBuilder as ContentBuilder).blocksField])
    sortableKey.value++

    emitUpdateRecord(record)
    nextTick(() => sortableKey.value++)
    setTimeout(resolve)
    reloadInstant()

    if (selectedBlock.value) {
      const newFingerprint = blockTree.fingerprint(selectedBlock.value)

      if (!newFingerprint || fingerprint !== newFingerprint) {
        selectedBlock.value = null
      }
    }
  }
}

function redo() {
  if (history.redosRemaining.value) {
    const fingerprint = selectedBlock.value ? blockTree.fingerprint(selectedBlock.value) : null
    const record = history.redo() ?? props.record

    errors.value = {}
    blockTree.clearErrors()
    blockTree.setData(mergeRecordBlocks(record)[(collection.contentBuilder as ContentBuilder).blocksField])
    sortableKey.value++

    emitUpdateRecord(record)
    nextTick(() => sortableKey.value++)
    setTimeout(resolve)
    reloadInstant()

    if (selectedBlock.value) {
      const newFingerprint = blockTree.fingerprint(selectedBlock.value)

      if (!newFingerprint || fingerprint !== newFingerprint) {
        selectedBlock.value = null
      }
    }
  }
}

async function save() {
  if (!canUpdate) {
    return
  }

  errors.value = {}
  blockTree.clearErrors()

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
    blockTree.setData(mergeRecordBlocks(response.data)[(collection.contentBuilder as ContentBuilder).blocksField])
    history.add(response.data)
    history.setInitialState(response.data)

    if (props.isEditing) {
      pruviousToasterShow({
        message: __('pruvious-dashboard', '$item updated', {
          item: capitalize(collection.label.record.singular, false),
        }),
      })
      onUpdate(response.data).then(reloadInstant)
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
    blockTree.setErrors(response.error)
    pruviousToasterShow({
      message: __('pruvious-dashboard', '$count $errors found', { count: Object.keys(response.error).length }),
      type: 'error',
    })
  }

  resolveTabbedFieldLayouts()
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

async function deleteBlock(key: string) {
  blockTree.deleteBlock(key)
  selectedBlock.value = null
  sortableKey.value++
  errors.value = {}
  blockTree.clearErrors()

  await triggerBlocksUpdate(true)

  setTimeout(() => {
    messageIframe('unhighlightBlock')
    blurActiveElement()
  })
}

function duplicateBlock(key: string) {
  const duplicate = blockTree.duplicateBlock(key)
  selectedBlock.value = duplicate.key
  sortableKey.value++
  errors.value = {}
  blockTree.clearErrors()
  focusBlock(duplicate.key)
  triggerBlocksUpdate()
}

async function moveBlockUp(key: string) {
  const newKey = await blockTree.moveBlockUp(key)
  selectedBlock.value = newKey
  sortableKey.value++
  errors.value = {}
  blockTree.clearErrors()
  focusBlock(newKey)
  await triggerBlocksUpdate()
  messageIframe('unhighlightBlock')
}

async function moveBlockDown(key: string) {
  const newKey = await blockTree.moveBlockDown(key)
  selectedBlock.value = newKey
  sortableKey.value++
  errors.value = {}
  blockTree.clearErrors()
  focusBlock(newKey)
  await triggerBlocksUpdate()
  messageIframe('unhighlightBlock')
}

async function copyBlock(key: string) {
  await copyToClipboard('block', blockTree.blocks[key].item)
}

async function cutBlock(key: string) {
  await copyToClipboard('block', blockTree.blocks[key].item)
  deleteBlock(key)
}

async function pasteBlockAfter(key: string) {
  if (clipboard.value?.pruviousClipboardType === 'block') {
    const parentBlock = blockTree.getParentBlock(key)
    const item = clipboard.value.payload
    const prefix = key.split('.').slice(0, -1).join('.')
    const parent = getProperty<BlocksRepeaterItem[]>(
      { [(collection.contentBuilder as ContentBuilder).blocksField]: blockTree.data },
      prefix,
    )
    const index = key.endsWith('?') ? parent.length : Number(key.split('.').pop()) + 1
    const pastedKey = `${prefix}.${index}`

    if (parentBlock && /\.block\.slots\.[^\.]+$/s.test(prefix)) {
      const slotName = prefix.split('.').pop()!

      if (!parentBlock.slots[slotName].allowedBlocks.includes(item.block.name)) {
        return pruviousToasterShow({
          message: __('pruvious-dashboard', 'The block **$block** cannot be pasted here', {
            block: dashboard.value.blocks[item.block.name].label,
          }),
          type: 'error',
        })
      }
    } else if (!parentBlock && !blockTree.allowedRootBlocks.includes(item.block.name)) {
      return pruviousToasterShow({
        message: __('pruvious-dashboard', 'The block **$block** cannot be pasted here', {
          block: dashboard.value.blocks[item.block.name].label,
        }),
        type: 'error',
      })
    }

    blockTree.mutateBlockKeysAfterIndex(index - 1, 1, prefix)
    parent.splice(index, 0, item)

    blockTree.blocks[pastedKey] = new BlockTreeItem(item, pastedKey, blockTree)

    await triggerBlocksUpdate()
    selectedBlock.value = pastedKey
    sortableKey.value++
    errors.value = {}
    blockTree.clearErrors()
    focusBlock(pastedKey)
  }
}

function focusBlock(key: string) {
  setTimeout(() => {
    const blockEl = document.querySelector(`[data-block="${key}"]`) as HTMLElement | null

    if (blockEl) {
      blockEl.focus()
      blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

async function triggerBlocksUpdate(instant = false) {
  const args = {
    ...props.record,
    [(collection.contentBuilder as ContentBuilder).blocksField]: blockTree.data,
  }

  return instant ? onUpdateInstant(args).then(reloadInstant) : onUpdate(args).then(reloadInstant)
}

const reload = debounce(reloadInstant, 225)

async function reloadInstant() {
  if (preview.value) {
    await pruviousFetch(`collections/previews/${preview.value.id}`, {
      method: 'patch',
      body: { data: JSON.stringify(props.record) },
    })
  }

  messageIframe('reload')
}

function hardReload() {
  iframe.value?.contentWindow?.location.reload()
}

function messageIframe(type: string, data?: any) {
  iframe.value?.contentWindow?.postMessage({ type: `pruvious:${type}`, data }, '*')
}

useEventListener(window, 'message', async (event) => {
  if (event.origin === window.location.origin) {
    switch (event.data.type) {
      case 'pruvious:ready':
        messageIframe(
          'blockLabels',
          Object.fromEntries(Object.entries(dashboard.value.blocks).map(([name, block]) => [name, block.label])),
        )
        break
      case 'pruvious:selectBlock':
        selectedBlock.value = event.data.data
        onClickBlock()

        setTimeout(() => {
          const blockEl = document.querySelector(`[data-block="${event.data.data}"]`) as HTMLElement | null

          if (blockEl) {
            blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        })
        break
      case 'pruvious:focus':
        iframeFocused.value = true
        break
      case 'pruvious:blur':
        iframeFocused.value = false
        break
      case 'pruvious:save':
        blurActiveElement()
        save()
        break
      case 'pruvious:undo':
        undo()
        break
      case 'pruvious:redo':
        redo()
        break
      case 'pruvious:copy':
        if (selectedBlock.value) {
          copyBlock(selectedBlock.value)
        }
        break
      case 'pruvious:cut':
        if (selectedBlock.value) {
          cutBlock(selectedBlock.value)
        }
        break
      case 'pruvious:paste':
        if (selectedBlock.value) {
          pasteBlockAfter(selectedBlock.value)
        }
        break
      case 'pruvious:delete':
        if (selectedBlock.value) {
          deleteBlock(selectedBlock.value)
        }
        break
      case 'pruvious:duplicate':
        if (selectedBlock.value) {
          duplicateBlock(selectedBlock.value)
        }
        break
      case 'pruvious:moveUp':
        if (selectedBlock.value) {
          moveBlockUp(selectedBlock.value)
        }
        break
      case 'pruvious:moveDown':
        if (selectedBlock.value) {
          moveBlockDown(selectedBlock.value)
        }
        break
    }
  }
})

useEventListener(window, 'resize', () => updateIframeSize(), { passive: true })

function updateIframeSize() {
  if (iframe.value) {
    iframeSize.value = `${iframe.value.offsetWidth} × ${iframe.value.offsetHeight}`
  }
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
    onUpdateInstant({ ...props.record, language: languageCode }).then(reloadInstant)
  }
}

function resolveTabbedFieldLayouts() {
  const tabbedLayouts: TabbedFieldLayout[] = []

  for (const item of collection.dashboard.fieldLayout) {
    if (isString(item) && item.startsWith('#')) {
      tabbedLayouts.push({ label: item.slice(1).trim(), errors: 0, layout: [] })
    } else {
      if (!tabbedLayouts.length) {
        tabbedLayouts.push({ label: capitalize(collection.label.record.singular, false), errors: 0, layout: [] })
      }

      tabbedLayouts[tabbedLayouts.length - 1].layout.push(item)
    }
  }

  for (const tab of tabbedLayouts) {
    for (const key of extractFieldKeys(tab.layout)) {
      tab.errors += Object.keys(errors.value).filter(
        (errorKey) => errorKey === key || errorKey.startsWith(`${key}.`),
      ).length
    }
  }

  tabbedFieldLayouts.value = tabbedLayouts
}

async function onSortEnd(e: any) {
  const newKey = await blockTree.moveBlock(`${e.from.dataset.key}.${e.oldIndex}`, `${e.to.dataset.key}.${e.newIndex}`)

  emitUpdateRecord({
    ...props.record,
    [(collection.contentBuilder as ContentBuilder).blocksField]: blockTree.data,
  })
  errors.value = { ...blockTree.errors }
  selectedBlock.value = newKey
  sortableBlockName.value = ''
  sortableKey.value++

  onUpdate().then(reloadInstant)
  stopMoving()

  document.body.classList.remove('is-sorting')

  setTimeout(() => sortableKey.value++)
}

function emitUpdateRecord(record: Record<string, any>) {
  emit('update:record', mergeRecordBlocks(record))
}

function mergeRecordBlocks(record: Record<string, any>) {
  const recordValue = isRef<Record<string, string>>(record) ? record.value : record
  const blocksField = (collection.contentBuilder as ContentBuilder).blocksField
  const blocks = [...recordValue[blocksField]]

  clearArray(props.record[blocksField])

  recordValue[blocksField] = props.record[blocksField]

  for (const block of blocks) {
    recordValue[blocksField].push(block)
  }

  return recordValue
}

function refreshSelectedBlock() {
  selectedBlockFields.value =
    selectedBlock.value &&
    Object.keys(dashboard.value.blocks[blockTree.blocks[selectedBlock.value].item.block.name].fields).length
      ? Object.keys(dashboard.value.blocks[blockTree.blocks[selectedBlock.value].item.block.name].fields)
      : []
  onClickBlock()
}

function onClickBlock() {
  nextTick(() => {
    activeTab.value =
      selectedBlock.value && selectedBlockFields.value.length
        ? 'blocks'
        : isNumber(activeTab.value)
        ? activeTab.value
        : 0
  })
}
</script>
