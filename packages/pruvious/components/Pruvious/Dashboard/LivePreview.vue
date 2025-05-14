<template>
  <NuxtLayout name="pruvious-dashboard-default-layout" noMainPadding noMainScroll ref="layoutRef">
    <template #header>
      <PruviousDashboardHeader />
    </template>

    <template #sidebar>
      <PruviousDashboardMenu />
    </template>

    <div class="p-lp" :class="`p-lp-${activeTab}`">
      <div class="p-lp-header">
        <div class="pui-row">
          <div class="p-lp-header-menu-button">
            <PUIButton
              :title="__('pruvious-dashboard', 'Toggle sidebar')"
              :variant="dashboardLayout.sidebarExpanded ? 'accent' : 'outline'"
              @click.stop="layoutRef.layoutRef.toggleSidebar()"
            >
              <Icon mode="svg" name="tabler:menu-2" />
            </PUIButton>
          </div>
          <slot name="header" />
          <PUIIconGroup
            v-model="activeTab"
            :choices="tabChoices"
            :size="-1"
            @update:modelValue="
              (tab) => {
                state.activeTab = tab as 1 | 2 | 3
                if (state.activeTab === 1) {
                  $nextTick(() => blocksTree?.forEach((component) => component?.updateTreePlaceholder()))
                }
              }
            "
            name="pruvious-dashboard-live-preview-tabs"
            class="p-lp-tabs"
          />
        </div>
      </div>

      <div class="p-lp-wrapper">
        <div v-if="blocksFieldsTabsList.length" class="p-lp-panel-left" :style="{ width: `${state.leftPanelWidth}px` }">
          <PruviousDashboardTabs
            :list="blocksFieldsTabsList"
            @change="
              (tab) => {
                activeBlocksFieldsTab = tab
                selectedBlocks = []
              }
            "
          >
            <PUITab v-for="{ name } of blocksFieldsTabsList" :name="name">
              <PruviousDashboardBlocksTree
                v-model:highlightedBlock="highlightedBlock"
                v-model:selectedBlocks="selectedBlocks"
                :addBlockContainer="width <= 1024 ? footerBeforeSlot : addBlockContainer"
                :conditionalLogic="conditionalLogic"
                :conditionalLogicResolver="conditionalLogicResolver"
                :data="data"
                :disabled="disabled"
                :errors="errors"
                :fieldName="name"
                :fieldOptions="blocksFields[name]!"
                :fields="fields"
                :modelValue="data[name]"
                @commit="emit('commit', Object.assign({}, data, { [name]: $event }))"
                @queueConditionalLogicUpdate="emit('queueConditionalLogicUpdate', $event)"
                @update:modelValue="emit('update:data', Object.assign({}, data, { [name]: $event }))"
                ref="blocksTree"
              />
            </PUITab>
          </PruviousDashboardTabs>

          <div v-if="!disabled" class="p-lp-panel-left-footer">
            <PruviousDashboardHistoryButtons
              :history="history"
              :modelValue="data"
              @update:modelValue="
                (data) => {
                  $emit('update:data', data)
                  $emit('update:errors', {})
                }
              "
            />
            <div ref="addBlockContainer" class="pui-flex pui-ml-auto"></div>
          </div>

          <PUIResizer
            v-model="state.leftPanelWidth"
            :max="leftPanelMaxWidth"
            :min="272"
            @dblclick="state.leftPanelWidth = 272"
            side="right"
          />
        </div>

        <div class="p-lp-panel-middle">
          <div ref="livePanel" class="p-lp-panel-live">
            <!-- @todo preview -->
            <div class="pui-row pui-w-full pui-flex-1" style="flex-direction: column">
              <pre style="width: 100%; overflow: auto">{{ tmp }}</pre>
              <PruviousRichText v-model="tmp" tag="p" class="pui-w-full" />
            </div>
          </div>

          <div class="p-lp-panel-middle-footer">
            <div class="pui-row pui-ml-auto">
              <Teleport :disabled="!footerBeforeSlot || width > 1024" :to="footerBeforeSlot">
                <PUIButton
                  v-pui-tooltip="__('pruvious-dashboard', 'Refresh')"
                  @click="console.log('@todo')"
                  data-panel="2"
                  variant="outline"
                >
                  <Icon mode="svg" name="tabler:refresh" />
                </PUIButton>
              </Teleport>
            </div>
          </div>
        </div>

        <div
          class="p-lp-panel-right"
          :class="{ 'p-lp-panel-right-has-footer': $slots.footer }"
          :style="{ width: `${state.rightPanelWidth}px` }"
        >
          <div v-if="selectedBlocks.length === 1" class="p-lp-panel-blocks">
            <div class="p-lp-panel-blocks-header">
              <Icon
                :name="`tabler:${dashboard!.blocks[selectedBlocks[0]!.source.$key]!.ui.icon}`"
                mode="svg"
                class="pui-shrink-0 pui-muted"
              />
              <span :title="selectedBlocks[0]!.label" class="pui-truncate">{{ selectedBlocks[0]!.label }}</span>
              <PUIButton :size="-2" @click="selectedBlocks = []" variant="secondary" class="pui-ml-auto">
                <Icon mode="svg" name="tabler:x" />
                <span>{{ __('pruvious-dashboard', 'Close') }}</span>
              </PUIButton>
            </div>

            <div class="p-lp-panel-blocks-content">
              <PUIContainer v-if="hasBlockFields[selectedBlocks[0]!.source.$key]">
                <PruviousFields
                  v-if="selectedBlockValue?.$key === selectedBlocks[0]!.source.$key"
                  :conditionalLogic="conditionalLogic"
                  :conditionalLogicResolver="conditionalLogicResolver"
                  :data="data"
                  :dataContainerName="container.name"
                  :dataContainerType="container ? 'collection' : 'singleton'"
                  :disabled="disabled"
                  :errors="selectedBlockFieldErrors"
                  :fields="dashboard!.blocks[selectedBlocks[0]!.source.$key]!.fields"
                  :layout="dashboard!.blocks[selectedBlocks[0]!.source.$key]!.ui.livePreviewFieldsLayout"
                  :modelValue="selectedBlockValue!"
                  :operation="operation"
                  :rootPath="selectedBlocks[0]!.source.$path"
                  :syncedFields="[]"
                  :translatable="container.definition.translatable"
                  @commit="
                    (value) => {
                      const newData = deepClone(data)
                      setProperty(newData, selectedBlocks[0]!.source.$path, value)
                      $emit('commit', newData)
                    }
                  "
                  @queueConditionalLogicUpdate="$emit('queueConditionalLogicUpdate', $event)"
                  @update:conditionalLogic="$emit('update:conditionalLogic', $event)"
                  @update:modelValue="
                    (value) => {
                      const newData = deepClone(data)
                      setProperty(newData, selectedBlocks[0]!.source.$path, value)
                      $emit('update:data', newData)
                    }
                  "
                />

                <PruviousDashboardHistoryScrollState />
              </PUIContainer>

              <span v-else class="p-lp-panel-blocks-empty">{{ __('pruvious-dashboard', 'No fields to display') }}</span>
            </div>
          </div>

          <PUIContainer>
            <PruviousFields
              v-if="data"
              :conditionalLogic="conditionalLogic"
              :conditionalLogicResolver="conditionalLogicResolver"
              :data="data"
              :dataContainerName="container.name"
              :dataContainerType="container ? 'collection' : 'singleton'"
              :disabled="disabled"
              :errors="errors"
              :fields="container.definition.fields"
              :layout="fieldsLayout"
              :modelValue="data"
              :operation="operation"
              :syncedFields="container.definition.syncedFields"
              :translatable="container.definition.translatable"
              @commit="$emit('commit', $event)"
              @queueConditionalLogicUpdate="$emit('queueConditionalLogicUpdate', $event)"
              @update:conditionalLogic="$emit('update:conditionalLogic', $event)"
              @update:modelValue="
                (value, path) => {
                  $emit('update:data', value)
                  $emit('queueConditionalLogicUpdate', path)
                }
              "
            />

            <PruviousDashboardHistoryScrollState />
          </PUIContainer>

          <div
            v-if="$slots.footer"
            class="p-lp-panel-right-footer"
            :class="{ 'p-lp-panel-right-footer-no-history': blocksFieldsTabsList.length }"
          >
            <Teleport :disabled="!footerSlot || width > 1024" :to="footerSlot">
              <slot name="footer" />
            </Teleport>
          </div>

          <PUIResizer
            v-model="state.rightPanelWidth"
            :max="rightPanelMaxWidth"
            :min="272"
            @dblclick="state.rightPanelWidth = 400"
            side="left"
          />
        </div>

        <div class="p-lp-footer">
          <PruviousDashboardHistoryButtons
            v-if="!disabled"
            :history="history"
            :modelValue="data"
            @update:modelValue="
              (data) => {
                $emit('update:data', data)
                $emit('update:errors', {})
              }
            "
            class="pui-shrink-0"
          />
          <div ref="footerBeforeSlot" class="p-lp-footer-slot-before"></div>
          <div ref="footerSlot" class="p-lp-footer-slot"></div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script lang="ts" setup>
import type { PruviousDashboardBlocksTree } from '#components'
import { __, History, resolveFieldLabel, usePruviousDashboard, usePruviousDashboardLayout } from '#pruvious/client'
import type {
  Collections,
  FieldsLayout,
  GenericSerializableFieldOptions,
  SerializableCollection,
  SerializableFieldOptions,
  SerializableSingleton,
  Singletons,
} from '#pruvious/server'
import type { ConditionalLogicResolver } from '@pruvious/orm'
import type { PUIIconGroupChoiceModel } from '@pruvious/ui/components/PUIIconGroup.vue'
import type { PUITabListItem } from '@pruvious/ui/components/PUITabs.vue'
import type { PUITreeItemModel } from '@pruvious/ui/components/PUITreeItem.vue'
import { deepClone, getProperty, isEmpty, remap, setProperty } from '@pruvious/utils'
import { useElementSize, useEventListener, useStorage, useWindowSize } from '@vueuse/core'
import type { ExtendedBlockValue } from './BlocksTree.vue'

const props = defineProps({
  /**
   * The name and definition of the current collection.
   * Either a `collection` or `singleton` must be provided.
   */
  collection: {
    type: Object as PropType<{ name: keyof Collections; definition: SerializableCollection } | undefined>,
  },

  /**
   * The name and definition of the current singleton.
   * Either a `collection` or `singleton` must be provided.
   */
  singleton: {
    type: Object as PropType<{ name: keyof Singletons; definition: SerializableSingleton } | undefined>,
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
   * A key-value pair of (sub)field names and their combined options defined in a collection, singleton, block, or field.
   */
  fields: {
    type: Object as PropType<Record<string, GenericSerializableFieldOptions>>,
    required: true,
  },

  /**
   * Controls whether the UI is disabled (read-only).
   */
  disabled: {
    type: Boolean,
    required: true,
  },

  /**
   * Specifies whether the user can delete the current data record.
   */
  canDelete: {
    type: Boolean,
    required: true,
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
   * Keys are (sub)field paths in dot notation (e.g. `repeater.0.field`) and values are error messages.
   */
  errors: {
    type: Object as PropType<Record<string, string>>,
    required: true,
  },

  /**
   * The `History` class instance that manages the undo and redo functionality.
   */
  history: {
    type: Object as PropType<History>,
    required: true,
  },

  /**
   * Defines how the fields are arranged and displayed.
   */
  fieldsLayout: {
    type: Object as PropType<FieldsLayout>,
  },

  /**
   * The current operation being performed.
   */
  operation: {
    type: String as PropType<'create' | 'update'>,
    required: true,
  },
})

const emit = defineEmits<{
  'commit': [value: Record<string, any>]
  'update:data': [value: Record<string, any>]
  'update:conditionalLogic': [value: Record<string, boolean>]
  'update:errors': [value: Record<string, string>]
  'queueConditionalLogicUpdate': [path?: (string & {}) | string[] | '$resolve' | '$reset']
}>()

provide('isLivePreview', true)

// const tmp = ref('<em>Em <code>code <strong>bold</strong></code> <strong>strong</strong></em>') // @todo remove
const tmp = ref(
  '<a>something <span>hi</span> <span><em><code><strong>t</strong></code><strong>here</strong></em></span></a> outer',
) // @todo remove
// const tmp = ref('<em>something <code>code</code></em>') // @todo remove

const dashboard = usePruviousDashboard()
const dashboardLayout = usePruviousDashboardLayout()
const layoutRef = useTemplateRef<any>('layoutRef')
const blocksTree = useTemplateRef<InstanceType<typeof PruviousDashboardBlocksTree>[]>('blocksTree')
const addBlockContainer = useTemplateRef('addBlockContainer')
const livePanel = useTemplateRef('livePanel')
const footerBeforeSlot = useTemplateRef('footerBeforeSlot')
const footerSlot = useTemplateRef('footerSlot')
const { width } = useWindowSize()
const state = useStorage<{ activeTab: 1 | 2 | 3; leftPanelWidth: number; rightPanelWidth: number }>(
  'pruvious-live-preview-layout',
  { activeTab: 2, leftPanelWidth: 272, rightPanelWidth: 400 },
)
const container = props.collection ?? props.singleton!
const blocksFields = Object.fromEntries(
  Object.entries(container.definition.fields).filter(([_, { _fieldType }]) => _fieldType === 'blocks'),
) as Record<string, SerializableFieldOptions<'blocks'>>
const blocksFieldsTabsList = ref<PUITabListItem<string>[]>(
  Object.entries(blocksFields).map(([name, options]) => ({ name, label: resolveFieldLabel(options.ui.label, name) })),
)
const activeBlocksFieldsTab = ref(blocksFieldsTabsList.value[0]?.name)
const tabChoices: PUIIconGroupChoiceModel[] = [
  ...(blocksFieldsTabsList.value.length
    ? [{ value: 1, icon: 'cube', title: __('pruvious-dashboard', 'Blocks') } as const]
    : []),
  { value: 2, icon: 'device-desktop', title: __('pruvious-dashboard', 'Preview') },
  { value: 3, icon: 'forms', title: __('pruvious-dashboard', 'Fields') },
]
const activeTab = ref<1 | 2 | 3>(
  state.value.activeTab
    ? state.value.activeTab === 1 && !blocksFieldsTabsList.value.length
      ? 2
      : state.value.activeTab
    : blocksFieldsTabsList.value.length
      ? 1
      : 2,
)
const livePanelSize = useElementSize(livePanel)
const leftPanelMaxWidth = computed(() =>
  Math.max(320, state.value.leftPanelWidth + (livePanelSize.width.value || 320) - 320),
)
const rightPanelMaxWidth = computed(() =>
  Math.max(320, state.value.rightPanelWidth + (livePanelSize.width.value || 320) - 320),
)
const selectedBlocks = ref<PUITreeItemModel<ExtendedBlockValue>[]>([])
const highlightedBlock = ref<PUITreeItemModel<ExtendedBlockValue> | undefined>()
const hasBlockFields = computed(() =>
  remap(dashboard.value!.blocks, (blockName, { fields }) => [blockName, !isEmpty(fields)]),
)
const selectedBlockValue = computed<Record<string, any> | undefined>(() =>
  selectedBlocks.value.length === 1 ? getProperty(props.data, selectedBlocks.value[0]!.source.$path) : undefined,
)
const selectedBlockFieldErrors = computed(() =>
  selectedBlocks.value.length === 1
    ? Object.fromEntries(
        Object.entries(props.errors)
          .filter(([key]) => key.startsWith(`${selectedBlocks.value[0]!.source.$path}.`))
          .map(([key, error]) => [key.replace(`${selectedBlocks.value[0]!.source.$path}.`, ''), error]),
      )
    : {},
)

watch(() => props.errors, refreshErrors)

useEventListener('resize', () => {
  nextTick(() => {
    if (state.value.leftPanelWidth > leftPanelMaxWidth.value) {
      state.value.leftPanelWidth = leftPanelMaxWidth.value
    }
    nextTick(() => {
      if (state.value.rightPanelWidth > rightPanelMaxWidth.value) {
        state.value.rightPanelWidth = rightPanelMaxWidth.value
      }
    })
  })
})

function refreshErrors(): void {
  for (const item of blocksFieldsTabsList.value) {
    const count = Object.keys(props.errors).filter((key) => key === item.name || key.startsWith(`${item.name}.`)).length
    item.bubble = count
      ? {
          content: String(count),
          tooltip: __('pruvious-dashboard', 'Found $count $errors', { count }),
          variant: 'destructive',
        }
      : undefined
  }
}
</script>

<style scoped>
.p-lp {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.p-lp-header {
  padding: calc(0.75rem + 1px) 0.75rem 0.75rem;
  border-bottom-width: 1px;
  font-size: 14px;
  font-weight: 500;
}

.p-lp-header :deep(.pui-button) {
  margin-right: 0.25rem;
  margin-left: 0.25rem;
}

.p-lp-header :deep(.pui-button:first-child) {
  margin-left: 0;
}

.p-lp-header :deep(.pui-button:last-child) {
  margin-right: 0;
}

.p-lp-header-menu-button {
  flex-shrink: 0;
}

.p-lp-tabs {
  margin: -0.125rem 0 -0.125rem auto;
}

.p-lp-wrapper {
  flex: 1;
  display: flex;
  min-height: 0;
}

.p-lp-panel-left {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 17rem;
  max-width: 100%;
  border-right-width: 1px;
}

.p-lp-panel-left :deep(.pui-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0.75rem;
}

.p-lp-panel-left :deep(.pui-tabs-content) {
  --pui-card: var(--pui-background);
  flex: 1;
  min-height: 0;
}

.p-lp-panel-left :deep(.pui-tabs-content:not(:first-child)) {
  margin-top: 0.75rem;
}

.p-lp-panel-left :deep(.pui-tabs-content > div) {
  height: 100%;
}

.p-lp-panel-middle {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 100%;
}

.p-lp-panel-live {
  position: relative;
  flex: 1;
  display: flex;
}

.p-lp-panel-right {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 17rem;
  max-width: 100%;
  border-left-width: 1px;
}

.p-lp-panel-right > :deep(.pui-container) {
  flex: 1;
}

.p-lp-panel-right > :deep(.pui-container > .pui-container-content) {
  padding: 0.75rem;
}

.p-lp-panel-right > :deep(.pui-resizer) {
  z-index: 98;
}

.p-lp-footer,
.p-lp-panel-left-footer,
.p-lp-panel-middle-footer,
.p-lp-panel-right-footer {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-top-width: 1px;
}

.p-lp-panel-right-footer :deep(.p-history-buttons),
.p-lp-footer-slot :deep(.p-history-buttons) {
  display: none;
}

.p-lp-panel-blocks {
  position: absolute;
  z-index: 98;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: calc(100% + 1px);
  background-color: hsl(var(--pui-background));
  border-left-width: 1px;
}

.p-lp-panel-blocks-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom-width: 1px;
}

.p-lp-panel-blocks-header > span {
  font-size: 0.875rem;
}

.p-lp-panel-blocks-content {
  flex: 1;
  height: 0;
}

.p-lp-panel-blocks-content > :deep(.pui-container) {
  height: 100%;
}

.p-lp-panel-blocks-content > :deep(.pui-container > .pui-container-content) {
  padding: 0.75rem;
}

.p-lp-panel-blocks-content > span {
  height: 100%;
  padding: 0.75rem;
  color: hsl(var(--pui-muted-foreground));
}

.p-lp-panel-blocks-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  font-size: 0.875rem;
}

.p-lp-footer-slot-before {
  flex-shrink: 0;
  display: flex;
  margin-left: auto;
}

.p-lp-footer-slot-before > * {
  display: none;
}

.p-lp-1 .p-lp-footer-slot-before > :deep([data-panel='1']),
.p-lp-2 .p-lp-footer-slot-before > :deep([data-panel='2']),
.p-lp-3 .p-lp-footer-slot-before > :deep([data-panel='3']) {
  display: flex;
}

:deep(.p-layout.p-layout-sm) {
  grid-template-areas:
    'header'
    'main';
  grid-template-columns: 1fr;
  max-width: 100%;
}

:deep(.p-layout .p-sidebar) {
  position: fixed;
  z-index: 99;
  top: calc(3.5rem + 1px);
  left: 0;
  bottom: 1rem;
  width: 18rem;
  max-width: 100%;
  margin: 0;
  padding-left: 1rem;
  background-color: hsl(var(--pui-background));
  visibility: hidden;
  transform: translateX(-100%);
}

:deep(.p-layout-transition .p-sidebar) {
  transition: var(--pui-transition);
  transition-property: visibility transform;
  transition-duration: var(--pui-overlay-transition-duration);
}

:deep(.p-sidebar-expanded .p-sidebar) {
  flex-direction: row;
  visibility: visible;
  transform: translateX(0);
}

:deep(.p-layout .p-sidebar::before) {
  content: '';
  position: sticky;
  top: 0;
  width: 1px;
  height: 100%;
  margin-left: -2px;
  border-right: 1px solid hsl(var(--pui-border));
  pointer-events: none;
}

:deep(.p-main) {
  transform-origin: right;
  transform: translate3d(0, 0, 0);
}

:deep(.p-layout-transition .p-main) {
  transition: var(--pui-transition);
  transition-property: opacity filter transform;
  transition-duration: var(--pui-overlay-transition-duration);
}

:deep(.p-sidebar-expanded .p-main) {
  opacity: 0.36;
  filter: blur(1px);
  transform: translate3d(0, 0, 0) scale(0.97);
}

:deep(.p-sidebar-expanded .p-main-content) {
  pointer-events: none;
}

@media (min-width: 1025px) {
  .p-lp-tabs {
    display: none;
  }

  .p-lp-panel-right-has-footer .p-lp-panel-blocks {
    bottom: 3.5625rem;
  }

  .p-lp-footer {
    display: none;
  }
}

@media (max-width: 1024px) {
  .p-lp-header :deep(.pui-button) {
    --pui-size: -2;
  }

  .p-lp-header-menu-button {
    display: none;
  }

  .p-lp-wrapper {
    flex-direction: column;
  }

  .p-lp-panel-left,
  .p-lp-panel-middle,
  .p-lp-panel-right {
    flex: 1;
    display: none;
    width: 100%;
    min-width: 100%;
    min-height: 0;
    border-width: 0;
  }

  .p-lp-1 .p-lp-panel-left,
  .p-lp-2 .p-lp-panel-middle,
  .p-lp-3 .p-lp-panel-right {
    display: flex;
  }

  .p-lp-panel-left-footer,
  .p-lp-panel-middle-footer,
  .p-lp-panel-right-footer {
    display: none;
  }

  .p-lp-panel-left > :deep(.pui-resizer),
  .p-lp-panel-right > :deep(.pui-resizer) {
    display: none;
  }

  :deep(.p-layout .p-sidebar) {
    top: calc(3.25rem + 1px);
    width: 17rem;
    padding-left: 0;
  }

  :deep(.p-layout .p-sidebar::before) {
    display: none;
  }
}

@media (max-width: 767px) {
  :deep(.p-layout .p-sidebar) {
    bottom: 0;
  }
}
</style>
