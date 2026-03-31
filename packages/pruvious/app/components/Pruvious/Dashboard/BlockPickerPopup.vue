<template>
  <PUIPopup
    :overlayTransitionDuration="150"
    :size="-1"
    @close="close()"
    @overlayAnimated="focusSearchInput()"
    fullHeight="auto"
    ref="popup"
    width="36rem"
  >
    <template #header>
      <span class="p-title pui-row">
        <span class="pui-truncate">{{ __('pruvious-dashboard', 'Select block') }}</span>
        <PUIButton
          :size="-2"
          :title="__('pruvious-dashboard', 'Close')"
          @click="close()"
          variant="ghost"
          class="pui-ml-auto"
        >
          <Icon mode="svg" name="tabler:x" />
        </PUIButton>
      </span>
    </template>

    <div v-if="!allowedBlocks || allowedBlocks.length">
      <div class="p-block-picker-search">
        <PUIInput
          v-model="searchValue"
          :placeholder="__('pruvious-dashboard', 'Search...')"
          @blur="
            () => {
              searchInputFocused = false
              mousePaused = false
              highlightedBlock = null
            }
          "
          @focus="
            () => {
              searchInputFocused = true
              mousePaused = true
              highlightedBlock = getFirstFilteredBlock()
            }
          "
          @input="
            () => {
              mousePaused = true
              $nextTick(() => {
                highlightedBlock = getFirstFilteredBlock()
              })
            }
          "
          @keydown.down="
            (event: KeyboardEvent) => {
              if (!event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey) {
                highlightNext(true)
              }
            }
          "
          @keydown.enter="
            () => {
              if (highlightedBlock) {
                picked = highlightedBlock
                $emit('pick', highlightedBlock, close)
              }
            }
          "
          @keydown.left="
            (event: KeyboardEvent) => {
              if (!event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey) {
                highlightPrevious()
              }
            }
          "
          @keydown.right="
            (event: KeyboardEvent) => {
              if (!event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey) {
                highlightNext()
              }
            }
          "
          @keydown.tab="
            (event: KeyboardEvent) => {
              if (!event.shiftKey) {
                mousePaused = false
                $nextTick(focusFirstFilteredBlock)
              }
            }
          "
          @keydown.up="
            (event: KeyboardEvent) => {
              if (!event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey) {
                highlightPrevious(true)
              }
            }
          "
          name="p-block-picker-search"
        />
        <PUIButton
          v-if="searchValue"
          :size="-3"
          :title="__('pruvious-dashboard', 'Clear')"
          @click.stop="
            () => {
              searchValue = ''
              focusSearchInput()
            }
          "
          tabindex="-1"
          variant="ghost"
        >
          <Icon height="1.125em" mode="svg" name="tabler:x" width="1.125em" />
        </PUIButton>
      </div>

      <div v-if="tags.length" class="p-block-picker-tags">
        <span :title="__('pruvious-dashboard', 'Tags')" class="p-block-picker-tags-icon">
          <Icon mode="svg" name="tabler:tag" />
        </span>
        <div class="p-block-picker-tags-list">
          <PUIButton
            v-for="tag of tags"
            :size="-3"
            :variant="activeTags.includes(tag.name) ? 'primary' : 'outline'"
            @click="
              activeTags.includes(tag.name)
                ? activeTags.splice(activeTags.indexOf(tag.name), 1)
                : activeTags.push(tag.name)
            "
            tabindex="-3"
            class="p-block-picker-tag"
          >
            <span class="p-block-picker-tag-label">{{ tag.label }}</span>
          </PUIButton>
        </div>
      </div>

      <div v-for="group of filteredGroups" class="p-block-picker-group">
        <span v-if="groups.length > 1" class="p-block-picker-group-label">{{ group.label }}</span>

        <div class="p-block-picker-blocks">
          <button
            v-for="block of group.blocks"
            :disabled="mousePaused"
            @click="
              () => {
                picked = block.name
                $emit('pick', block.name, close)
              }
            "
            class="p-block-picker-block pui-raw"
            :class="{ 'p-block-picker-block-highlighted': highlightedBlock === block.name }"
          >
            <Icon :name="`tabler:${block.icon}`" mode="svg" class="p-block-picker-block-icon" />
            <span class="p-block-picker-block-meta">
              <span class="p-block-picker-block-title">{{ block.label }}</span>
              <span v-if="block.description" class="p-block-picker-block-description">{{ block.description }}</span>
            </span>
          </button>
        </div>
      </div>

      <p v-if="!filteredGroups.length" class="p-block-picker-block-no-results pui-muted">
        {{ __('pruvious-dashboard', 'No blocks match your search criteria') }}
      </p>
    </div>

    <p v-else class="pui-muted">{{ __('pruvious-dashboard', 'No blocks can be added here') }}</p>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { Icon } from '#components'
import { __ } from '#pruvious/app'
import { maybeTranslate, usePruviousDashboard } from '#pruvious/dashboard'
import type { BlockName } from '#pruvious/server'
import { isDefined, isObject, searchByKeywords, titleCase } from '@pruvious/utils'
import { useEventListener } from '@vueuse/core'

interface BlockItem {
  name: BlockName
  label: string
  description: string
  group: string | null
  tags: string[]
  icon: string
  _search: string
}

interface BlockGroupItem {
  name: string | null
  label: string
  blocks: BlockItem[]
}

const props = defineProps({
  /**
   * Specifies which blocks can be selected.
   * If not provided, all blocks are available.
   */
  allowedBlocks: {
    type: Array as PropType<BlockName[]>,
  },
})

const emit = defineEmits<{
  close: [close: () => Promise<void>, picked: BlockName | null]
  pick: [blockName: BlockName, close: () => Promise<void>]
}>()

defineExpose({ close })

const popup = useTemplateRef('popup')
const dashboard = usePruviousDashboard()
const groups = computed<BlockGroupItem[]>(() => {
  const blocks = (props.allowedBlocks ?? Object.keys(dashboard.value!.blocks)).map((blockName) => {
    const label = isDefined(dashboard.value!.blocks[blockName]!.ui.label)
      ? maybeTranslate(dashboard.value!.blocks[blockName]!.ui.label)
      : __('pruvious-dashboard', titleCase(blockName, false) as any)
    const description = maybeTranslate(dashboard.value!.blocks[blockName]!.ui.description) ?? ''
    return {
      ...dashboard.value!.blocks[blockName]!,
      name: blockName as BlockName,
      label,
      description,
      group: dashboard.value!.blocks[blockName]!.group,
      tags: dashboard.value!.blocks[blockName]!.tags,
      icon: isObject(dashboard.value!.blocks[blockName]!.ui.icon)
        ? (dashboard.value!.blocks[blockName]!.ui.icon.defaultIcon ?? 'cube')
        : dashboard.value!.blocks[blockName]!.ui.icon!,
      _search: [label.padEnd(63), blockName.padEnd(63), description].join(' '),
    }
  })
  const output: BlockGroupItem[] = []
  for (const group of dashboard.value!.blockGroups) {
    const groupBlocks = blocks.filter((block) => block.group === group.name)
    if (groupBlocks.length) {
      output.push({
        name: group.name,
        label: isDefined(group.label)
          ? maybeTranslate(group.label)
          : __('pruvious-dashboard', titleCase(group.name, false) as any),
        blocks: groupBlocks,
      })
    }
  }
  const otherBlocks = blocks.filter((block) => !block.group)
  if (otherBlocks.length) {
    output.push({
      name: null,
      label: __('pruvious-dashboard', 'Other'),
      blocks: otherBlocks,
    })
  }
  return output
})
const tags = computed<{ name: string; label: string }[]>(() => {
  const output: { name: string; label: string }[] = []
  for (const tag of dashboard.value!.blockTags) {
    if (groups.value.some((group) => group.blocks.some((block) => block.tags.includes(tag.name)))) {
      output.push({
        name: tag.name,
        label: isDefined(tag.label)
          ? maybeTranslate(tag.label)
          : __('pruvious-dashboard', titleCase(tag.name, false) as any),
      })
    }
  }
  return output
})
const activeTags = ref<string[]>([])
const searchValue = ref('')
const filteredGroups = computed<BlockGroupItem[]>(() => {
  return groups.value
    .map((group) => ({
      ...group,
      blocks: searchByKeywords(
        group.blocks.filter(
          (block) => !activeTags.value.length || block.tags.some((tag) => activeTags.value.includes(tag)),
        ),
        searchValue.value,
        ['_search'],
      ),
    }))
    .filter((group) => group.blocks.length)
})
const prevFocus = document.activeElement as HTMLElement | null
const searchInputFocused = ref(true)
const mousePaused = ref(true)
const highlightedBlock = ref<BlockName | null>(null)
const picked = ref<BlockName | null>(null)

let initialFocus = false

const stopKeyDownListener = useEventListener(
  'keydown',
  (event: KeyboardEvent) => {
    if (initialFocus) {
      stopKeyDownListener()
    } else {
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        searchValue.value += event.key
        event.preventDefault()
      }
    }
  },
  { capture: true },
)

useEventListener('mousemove', () => {
  mousePaused.value = false
})

function focusSearchInput() {
  initialFocus = true
  popup.value?.root?.querySelector('input')?.focus()
}

function getFirstFilteredBlock(): BlockName | null {
  for (const group of filteredGroups.value) {
    if (group.blocks.length) {
      return group.blocks[0]!.name
    }
  }
  return null
}

function getLastFilteredBlock(): BlockName | null {
  for (let i = filteredGroups.value.length - 1; i >= 0; i--) {
    const group = filteredGroups.value[i]!
    if (group.blocks.length) {
      return group.blocks[group.blocks.length - 1]!.name
    }
  }
  return null
}

function focusFirstFilteredBlock() {
  const firstBlockName = getFirstFilteredBlock()
  if (firstBlockName) {
    popup.value?.root?.querySelector<HTMLButtonElement>('.p-block-picker-block:not([disabled])')?.focus()
  }
}

function highlightPrevious(up = false) {
  const isTwoColumn = window.innerWidth > 520
  const sameColumn = up && isTwoColumn

  if (!highlightedBlock.value) {
    highlightedBlock.value = getLastFilteredBlock()
    return
  }

  let groupIndex = -1
  let blockIndex = -1

  for (let i = 0; i < filteredGroups.value.length; i++) {
    const foundIndex = filteredGroups.value[i]!.blocks.findIndex((b) => b.name === highlightedBlock.value)
    if (foundIndex !== -1) {
      groupIndex = i
      blockIndex = foundIndex
      break
    }
  }

  if (groupIndex === -1) return

  const step = sameColumn ? 2 : 1
  const newBlockIndex = blockIndex - step

  if (newBlockIndex >= 0) {
    highlightedBlock.value = filteredGroups.value[groupIndex]!.blocks[newBlockIndex]!.name
    return
  }

  if (groupIndex > 0) {
    const prevGroup = filteredGroups.value[groupIndex - 1]!
    const prevLen = prevGroup.blocks.length

    if (!sameColumn) {
      highlightedBlock.value = prevGroup.blocks[prevLen - 1]!.name
      return
    }

    const currentColumn = blockIndex % 2
    const lastPrevColumn = (prevLen - 1) % 2

    let targetIndex = prevLen - 1
    if (currentColumn !== lastPrevColumn) {
      targetIndex = prevLen - 2
    }

    if (targetIndex >= 0) {
      highlightedBlock.value = prevGroup.blocks[targetIndex]!.name
    } else {
      highlightedBlock.value = prevGroup.blocks[prevLen - 1]!.name
    }
  }
}

function highlightNext(down = false) {
  const isTwoColumn = window.innerWidth > 520
  const sameColumn = down && isTwoColumn

  if (!highlightedBlock.value) {
    highlightedBlock.value = getFirstFilteredBlock()
    return
  }

  let groupIndex = -1
  let blockIndex = -1

  for (let i = 0; i < filteredGroups.value.length; i++) {
    const foundIndex = filteredGroups.value[i]!.blocks.findIndex((b) => b.name === highlightedBlock.value)
    if (foundIndex !== -1) {
      groupIndex = i
      blockIndex = foundIndex
      break
    }
  }

  if (groupIndex === -1) return

  const step = sameColumn ? 2 : 1
  const newBlockIndex = blockIndex + step
  const currentGroupBlocks = filteredGroups.value[groupIndex]!.blocks

  if (newBlockIndex < currentGroupBlocks.length) {
    highlightedBlock.value = currentGroupBlocks[newBlockIndex]!.name
    return
  }

  if (groupIndex < filteredGroups.value.length - 1) {
    const nextGroup = filteredGroups.value[groupIndex + 1]!

    if (!sameColumn) {
      highlightedBlock.value = nextGroup.blocks[0]!.name
      return
    }

    const currentColumn = blockIndex % 2

    if (currentColumn === 0) {
      highlightedBlock.value = nextGroup.blocks[0]!.name
    } else {
      if (nextGroup.blocks.length > 1) {
        highlightedBlock.value = nextGroup.blocks[1]!.name
      } else {
        highlightedBlock.value = nextGroup.blocks[0]!.name
      }
    }
  }
}

async function close() {
  emit(
    'close',
    async () => {
      await popup.value!.close()
      setTimeout(() => prevFocus?.focus())
    },
    picked.value,
  )
}
</script>

<style scoped>
.p-title {
  font-weight: 500;
}

.p-block-picker-search {
  position: relative;
}

.p-block-picker-search :deep(.pui-input-control) {
  padding-right: calc(1.5rem + 0.5em);
}

.p-block-picker-search :deep(.pui-button) {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  border-radius: calc(var(--pui-radius) - 0.25rem);
}

.p-block-picker-tags {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.p-block-picker-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.p-block-picker-tags-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  height: 1.5rem;
  color: hsl(var(--pui-muted-foreground));
}

.p-block-picker-tag {
  --pui-foreground: var(--pui-muted-foreground);
}

.p-block-picker-tag-label {
  font-size: 0.75rem;
}

.p-block-picker-group {
  margin-top: 1rem;
}

.p-block-picker-group-label {
  display: block;
  margin-bottom: 0.5em;
  font-weight: 600;
  text-transform: uppercase;
  font-size: calc(1em - 0.1875rem);
  line-height: calc(1em + 0.5rem);
}

.p-block-picker-blocks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.p-block-picker-block {
  display: flex;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 0.75rem;
  background-color: transparent;
  border-width: 1px;
  border-radius: var(--pui-radius);
  color: hsl(var(--pui-secondary-foreground));
  text-align: left;
  transition: var(--pui-transition);
  transition-property: background-color, border-color, box-shadow, color;
}

.p-block-picker-block[disabled] {
  pointer-events: none;
}

.p-block-picker-block:hover,
.p-block-picker-block-highlighted {
  background-color: hsl(var(--pui-accent));
  border-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.p-block-picker-block:focus-visible {
  box-shadow:
    0 0 0 0.125rem hsl(var(--pui-background)),
    0 0 0 0.25rem hsl(var(--pui-ring)),
    0 0 #0000;
  outline: 0.125rem solid transparent;
  outline-offset: 0.125rem;
}

.p-block-picker-block-icon {
  flex-shrink: 0;
  margin-top: 0.0625rem;
  color: hsl(var(--pui-muted-foreground));
  font-size: 1.25rem;
}

.p-block-picker-block-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.p-block-picker-block-title {
  font-weight: 500;
  line-height: 1.375rem;
}

.p-block-picker-block-description {
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.8125rem;
  line-height: 1.25rem;
  transition: var(--pui-transition);
  transition-property: background-color, border-color, box-shadow, color;
}

.p-block-picker-block:hover .p-block-picker-block-description {
  color: hsl(var(--pui-foreground));
}

.p-block-picker-block-no-results {
  margin-top: 0.75rem;
}

@media (max-width: 520px) {
  .p-block-picker-blocks {
    grid-template-columns: 1fr;
  }
}
</style>
