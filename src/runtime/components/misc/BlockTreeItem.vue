<template>
  <div class="pl-2">
    <div
      :data-block="blockKey"
      :title="__('pruvious-dashboard', (dashboard.blocks[blockData.name as BlockName].description ?? '' ) as any)"
      @click="$emit('update:selectedBlock', blockKey), $emit('clickBlock', blockKey)"
      @mousedown="
        (e) => {
          if (selectedBlock !== blockKey) {
            $emit('update:selectedBlock', blockKey)
            $emit('update:blockFocused', true)
            $emit('clickBlock', blockKey)
            e.preventDefault()
          }
        }
      "
      @mouseenter="$emit('highlight', blockKey)"
      @mouseleave="$emit('unhighlight', blockKey)"
      tabindex="0"
      class="relative flex h-9 min-w-[10rem] items-center gap-2 pr-2 outline-none transition"
      :class="{
        'cursor-move text-gray-900': selectedBlock === blockKey,
        'cursor-pointer text-gray-400': selectedBlock !== blockKey,
        'not-sorting:hover:text-primary-700': selectedBlock !== blockKey,
        'sorting:opacity-50': allDisabled,
      }"
    >
      <span v-html="icon" class="h-4 w-4 shrink-0"></span>

      <span class="truncate text-sm">
        {{ __('pruvious-dashboard', dashboard.blocks[blockData.name].label as any) }}
      </span>

      <span
        v-if="tree.blocks[blockKey].errorCount && !tree.blocks[blockKey].errorMessage"
        v-pruvious-tooltip.highlight-apostrophes="
          __('pruvious-dashboard', '$count $errors found', { count: tree.blocks[blockKey].errorCount })
        "
        class="errors"
      >
        {{ tree.blocks[blockKey].errorCount }}
      </span>

      <strong
        v-if="tree.blocks[blockKey].errorMessage"
        v-pruvious-tooltip.highlight-apostrophes="tree.blocks[blockKey].errorMessage"
        class="errors"
      >
        !
      </strong>

      <div v-if="!disabled" class="ml-auto hidden gap-2 parent-hocus:flex">
        <button
          v-pruvious-tooltip="__('pruvious-dashboard', 'Add block before')"
          @click="$emit('addBlockBefore')"
          tabindex="-1"
          type="button"
          class="h-4 w-4 text-gray-400 transition hocus:text-primary-700"
        >
          <PruviousIconPlus />
        </button>

        <button
          v-if="slotNames.length === 1"
          v-pruvious-tooltip="__('pruvious-dashboard', 'Add inner block')"
          @click="
            $emit('openAddBlockPopup', { treeOrSlot: tree.blocks[blockKey].slots[slotNames[0]], slot: slotNames[0] })
          "
          tabindex="-1"
          type="button"
          class="h-4 w-4 text-gray-400 transition hocus:text-primary-700"
        >
          <PruviousIconCirclePlus />
        </button>

        <button
          v-pruvious-tooltip="__('pruvious-dashboard', 'Delete')"
          @mousedown.prevent.stop="$emit('delete', blockKey)"
          tabindex="-1"
          type="button"
          class="h-4 w-4 text-gray-400 transition hocus:text-red-500"
        >
          <PruviousIconTrash />
        </button>

        <button
          v-pruvious-tooltip="__('pruvious-dashboard', 'More options')"
          @click="$emit('openMoreBlockOptionsPopup')"
          tabindex="-1"
          type="button"
          class="h-4 w-4 text-gray-400 transition hocus:text-primary-700"
        >
          <PruviousIconDotsVertical />
        </button>
      </div>
    </div>

    <div v-for="(slotName, i) of slotNames" class="ml-2 border-l pl-2">
      <div
        v-if="slotNames.length > 1"
        class="relative ml-2 flex h-9 items-center justify-between gap-2 pr-2 text-xs font-medium uppercase text-gray-400 transition before:absolute before:-left-4 before:top-1/2 before:w-2 before:border-b"
        :class="{ 'sorting:opacity-50': sortableGroups[i] !== 'blocks' }"
      >
        <span class="mt-px truncate">
          {{ tree.blocks[blockKey].slots[slotName]?.label }}
        </span>

        <button
          v-if="!disabled"
          v-pruvious-tooltip="__('pruvious-dashboard', 'Add inner block')"
          @click="$emit('openAddBlockPopup', { treeOrSlot: tree.blocks[blockKey].slots[slotName], slot: slotName })"
          type="button"
          class="hidden h-4 w-4 items-center text-gray-400 transition hocus:text-primary-700 parent-hocus:flex"
        >
          <PruviousIconCirclePlus />
        </button>
      </div>

      <div :data-key="`${blockKey}.block.slots.${slotName}`" ref="sortableEls" class="sortable-area">
        <PruviousBlockTreeItem
          v-for="({ block }, i) of ((blockData.slots as any)[slotName] as any)"
          :blockData="block"
          :blockFocused="blockFocused"
          :blockKey="`${blockKey}.block.slots.${slotName}.${i}`"
          :data-label="__('pruvious-dashboard', dashboard.blocks[block.name].label as any)"
          :disabled="disabled"
          :errors="errors"
          :index="i"
          :key="`${sortableKey}-${blockKey}.block.slots.${slotName}.${i}`"
          :selectedBlock="selectedBlock"
          :sortableBlockName="sortableBlockName"
          :sortableKey="sortableKey"
          :tree="tree"
          @addBlockBefore="
            $emit('openAddBlockPopup', {
              treeOrSlot: tree.blocks[blockKey].slots[slotName],
              slot: slotName,
              index: i,
            })
          "
          @clickBlock="$emit('clickBlock', $event)"
          @delete="$emit('delete', $event)"
          @highlight="$emit('highlight', $event)"
          @openAddBlockPopup="$emit('openAddBlockPopup', $event)"
          @openMoreBlockOptionsPopup="$emit('openMoreBlockOptionsPopup')"
          @sortEnd="$emit('sortEnd', $event)"
          @unhighlight="$emit('unhighlight', $event)"
          @update:blockFocused="$emit('update:blockFocused', $event)"
          @update:errors="$emit('update:errors', $event)"
          @update:selectedBlock="$emit('update:selectedBlock', $event)"
          @update:sortableBlockName="$emit('update:sortableBlockName', $event)"
          @update:sortableKey="$emit('update:sortableKey', $event)"
          @updated="$emit('updated')"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch, type PropType } from '#imports'
import type { BlockName, CastedBlockData } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { useSortable } from '@vueuse/integrations/useSortable'
import { nanoid } from 'nanoid'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { startMoving } from '../../composables/dashboard/move'
import { __ } from '../../composables/translatable-strings'
import type { BlockTree } from '../../utils/dashboard/block-tree'
import { defaultSortableOptions } from '../../utils/dashboard/defaults'
import type { AddBlockOptions } from './AddBlockPopup.vue'

const props = defineProps({
  blockData: {
    type: Object as PropType<CastedBlockData>,
    required: true,
  },
  blockKey: {
    type: String,
    required: true,
  },
  tree: {
    type: Object as PropType<BlockTree>,
    required: true,
  },
  errors: {
    type: Object as PropType<Record<string, string>>,
    required: true,
  },
  selectedBlock: {
    type: String as PropType<string | null>,
    default: null,
  },
  blockFocused: {
    type: Boolean,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  sortableBlockName: {
    type: String,
    required: true,
  },
  sortableKey: {
    type: Number,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  'update:errors': [Record<string, string>]
  'update:selectedBlock': [string | null]
  'update:sortableBlockName': [string]
  'update:blockFocused': [boolean]
  'update:sortableKey': [number]
  'updated': []
  'openAddBlockPopup': [AddBlockOptions]
  'openMoreBlockOptionsPopup': []
  'addBlockBefore': []
  'clickBlock': [string]
  'highlight': [string]
  'unhighlight': [string]
  'delete': [string]
  'sortEnd': [any]
}>()

const dashboard = usePruviousDashboard()

const icon = dashboard.value.blocks[props.blockData.name].icon
const slotNames = Object.keys(dashboard.value.blocks[props.blockData.name].slots)
const sortableGroups = ref<string[]>([])
const sortableEls = ref<HTMLElement[]>([])
const allDisabled = computed(() => sortableGroups.value.every((group) => group !== 'blocks'))

const PruviousBlockTreeItem = dashboardMiscComponent.BlockTreeItem()

onMounted(() => {
  for (const [i, el] of sortableEls.value.entries()) {
    const sortable = useSortable(el, (props.blockData.slots as any)[slotNames[i]], {
      ...defaultSortableOptions,
      group: sortableGroups.value[i] ?? 'blocks',
      emptyInsertThreshold: 0,
      onStart: (e: any) => {
        document.body.classList.add('is-sorting')
        emit('update:sortableBlockName', '')
        nextTick(() =>
          emit('update:sortableBlockName', props.tree.blocks[`${e.from.dataset.key}.${e.oldIndex}`].item.block.name),
        )
      },
      onUpdate: () => null,
      onEnd: (e: any) => emit('sortEnd', e),
      setData: (dataTransfer: DataTransfer, el: HTMLDivElement) => {
        startMoving({ dragImageLabel: __('pruvious-dashboard', el.dataset.label as any) })
        dataTransfer.setDragImage(document.getElementById('pruvious-drag-image')!, -16, 10)
        dataTransfer.effectAllowed = 'move'
      },
    })

    sortable.start()

    watch(
      () => props.sortableBlockName,
      () => {
        if (sortable) {
          sortableGroups.value[i] =
            `${props.blockKey}.block.slots.${slotNames[i]}` ===
              props.selectedBlock?.split('.').slice(0, -1).join('.') ||
            props.tree.blocks[props.blockKey].slots[slotNames[i]].allowedBlocks.includes(
              props.sortableBlockName as BlockName,
            )
              ? 'blocks'
              : nanoid()

          sortable.option('group', props.sortableBlockName ? sortableGroups.value[i] : 'blocks')
        }
      },
    )
  }
})
</script>
