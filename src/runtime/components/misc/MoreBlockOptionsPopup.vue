<template>
  <div>
    <PruviousPopup :visible="visible" @hotkey="onHotkey" @update:visible="emit('update:visible', $event)" width="16rem">
      <template v-if="selectedBlock" #header>
        <h2 class="truncate text-sm">
          {{ __('pruvious-dashboard', blocks[tree.blocks[selectedBlock].item.block.name].label as any) }}
        </h2>
      </template>

      <div v-if="selectedBlock" class="flex flex-col gap-4 p-4">
        <div class="flex flex-col gap-2">
          <button
            @click="$emit('duplicate'), $emit('update:visible', false)"
            type="button"
            class="button button-white w-full"
          >
            <PruviousIconCopy />
            <span>{{ __('pruvious-dashboard', 'Duplicate') }}</span>
          </button>

          <button
            @click="$emit('copy'), $emit('update:visible', false)"
            type="button"
            class="button button-white w-full"
          >
            <PruviousIconClipboardCopy />
            <span>{{ __('pruvious-dashboard', 'Copy') }}</span>
          </button>

          <button
            @click="$emit('cut'), $emit('update:visible', false)"
            type="button"
            class="button button-white w-full"
          >
            <PruviousIconCut />
            <span>{{ __('pruvious-dashboard', 'Cut') }}</span>
          </button>

          <button
            v-if="canPaste"
            @click="$emit('paste'), $emit('update:visible', false)"
            type="button"
            class="button button-white w-full"
          >
            <PruviousIconClipboard />
            <span>{{ __('pruvious-dashboard', 'Paste after') }}</span>
          </button>

          <button
            v-if="
              allowConvertingToPreset && canCreatePresets && tree.blocks[selectedBlock].item.block.name !== 'Preset'
            "
            @click="openConvertToPresetPopup()"
            type="button"
            class="button button-white w-full"
          >
            <PruviousIconTransform />
            <span>{{ __('pruvious-dashboard', 'Convert to preset') }}</span>
          </button>

          <button
            v-if="
          tree.blocks[selectedBlock].item.block.name === 'Preset' && (tree.blocks[selectedBlock].item.block.fields as any).preset
        "
            @click="detachPreset()"
            type="button"
            class="button button-white w-full"
          >
            <PruviousIconComponents />
            <span>{{ __('pruvious-dashboard', 'Detach preset') }}</span>
          </button>
        </div>
      </div>
    </PruviousPopup>

    <PruviousPopup v-model:visible="convertToPresetPopupVisible" @hotkey="onConvertToPresetPopupHotkey" width="24rem">
      <template v-if="selectedBlock" #header>
        <h2 class="truncate text-sm">
          {{ __('pruvious-dashboard', 'Convert block to preset') }}
        </h2>
      </template>

      <form @submit.prevent="convertToPreset()" class="flex flex-col gap-4 p-4">
        <component
          v-model="convertToPresetName"
          :errors="convertToPresetErrors"
          :is="TextField"
          :options="(dashboard.collections.presets.fields.name.options as any)"
          fieldKey="name"
        />

        <div class="flex justify-end gap-2">
          <button @click="convertToPresetPopupVisible = false" type="button" class="button button-white">
            <span>{{ __('pruvious-dashboard', 'Cancel') }}</span>
          </button>
          <button type="submit" class="button">
            <span>
              {{ __('pruvious-dashboard', 'Create') }}
            </span>
          </button>
        </div>
      </form>
    </PruviousPopup>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch, type PropType } from '#imports'
import type { CastedBlockData, CastedFieldType } from '#pruvious'
import { blocks } from '#pruvious/blocks'
import { dashboardMiscComponent, textFieldComponent, usePruviousDashboard } from '#pruvious/dashboard'
import { usePruviousClipboard } from '../../composables/dashboard/clipboard'
import type { HotkeyAction } from '../../composables/dashboard/hotkeys'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { BlockTree, type BlocksRepeaterItem } from '../../utils/dashboard/block-tree'
import { BlockTreeItem } from '../../utils/dashboard/block-tree-item'
import { pruviousFetch } from '../../utils/fetch'
import { getProperty, isObject } from '../../utils/object'
import { getCapabilities } from '../../utils/users'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  tree: {
    type: Object as PropType<BlockTree>,
    required: true,
  },
  selectedBlock: {
    type: String as PropType<string | null>,
    default: null,
  },
})

const emit = defineEmits<{
  'update:visible': [boolean]
  'update:selectedBlock': [string | null]
  'copy': []
  'cut': []
  'delete': []
  'duplicate': []
  'paste': []
  'updated': []
}>()

const clipboard = usePruviousClipboard()
const dashboard = usePruviousDashboard()
const user = useUser()

const allowConvertingToPreset = ref(false)
const canPaste = computed(
  () =>
    clipboard.value?.pruviousClipboardType === 'block' &&
    props.selectedBlock &&
    props.tree.getAllowedParentBlocks(props.selectedBlock).includes(clipboard.value.payload.block.name),
)
const convertToPresetPopupVisible = ref(false)
const convertToPresetErrors = ref<{ name?: string }>()
const convertToPresetName = ref('')
const userCapabilities = getCapabilities(user.value)

const canCreatePresets = user.value?.isAdmin || userCapabilities['collection-presets-create']

const PruviousPopup = dashboardMiscComponent.Popup()
const TextField = textFieldComponent()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.selectedBlock,
  () => {
    nextTick(() => {
      if (props.selectedBlock) {
        allowConvertingToPreset.value = props.tree.getAllowedParentBlocks(props.selectedBlock).includes('Preset')
      }
    })
  },
  { immediate: true },
)

function openConvertToPresetPopup() {
  emit('update:visible', false)

  convertToPresetPopupVisible.value = true
  convertToPresetErrors.value = {}
  convertToPresetName.value = ''
}

async function convertToPreset() {
  const response = await pruviousFetch<CastedFieldType['presets']>('collections/presets', {
    method: 'post',
    body: { name: convertToPresetName.value, blocks: [{ block: props.tree.blocks[props.selectedBlock!].item.block }] },
  })

  if (response.success) {
    const index = Number(props.selectedBlock!.split('.').pop())
    const prefix = props.selectedBlock!.split('.').slice(0, -1).join('.')
    const parent = getProperty<BlocksRepeaterItem[]>({ [props.tree.blocksField]: props.tree.data }, prefix)
    const preset: { block: CastedBlockData & { name: 'Preset' } } = {
      block: { name: 'Preset', fields: { preset: response.data.id }, slots: {} },
    }

    for (const key of Object.keys(props.tree.blocks)) {
      if (key === props.selectedBlock! || key.startsWith(`${props.selectedBlock}.`)) {
        delete props.tree.blocks[key]
      }
    }

    parent.splice(index, 1, preset)
    props.tree.blocks[props.selectedBlock!] = new BlockTreeItem(preset, props.selectedBlock!, props.tree)

    pruviousToasterShow({ message: __('pruvious-dashboard', 'The block has been converted into a preset') })

    convertToPresetPopupVisible.value = false

    nextTick(() => {
      emit('updated')
      emit('update:selectedBlock', props.selectedBlock)
    })
  } else if (isObject(response.error)) {
    convertToPresetErrors.value = response.error

    if (Object.keys(response.error).length > 1) {
      pruviousToasterShow({
        message: __(
          'pruvious-dashboard',
          'Please ensure all block fields are valid before converting the block to a preset',
        ),
      })
    }
  }
}

async function detachPreset() {
  const response = await pruviousFetch<CastedFieldType['presets']>(
    `collections/presets/${(props.tree.blocks[props.selectedBlock!].item.block.fields as any).preset}?select=blocks`,
  )

  if (response.success) {
    const index = Number(props.selectedBlock!.split('.').pop())
    const prefix = props.selectedBlock!.split('.').slice(0, -1).join('.')
    const parent = getProperty<BlocksRepeaterItem[]>({ [props.tree.blocksField]: props.tree.data }, prefix)
    const blocks = response.data.blocks

    parent.splice(index, 1, ...blocks)

    delete props.tree.blocks[props.selectedBlock!]

    if (blocks.length > 1) {
      props.tree.mutateBlockKeysAfterIndex(index, blocks.length - 1, prefix)
    } else if (blocks.length === 0) {
      props.tree.mutateBlockKeysAfterIndex(index, -1, prefix)
    }

    for (const [j, block] of blocks.entries()) {
      props.tree.blocks[`${prefix}.${index + j}`] = new BlockTreeItem(block, `${prefix}.${index + j}`, props.tree)
    }

    pruviousToasterShow({ message: __('pruvious-dashboard', 'Preset detached') })

    convertToPresetPopupVisible.value = false

    emit('update:selectedBlock', null)
    emit('updated')
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

  emit('update:visible', false)
}

function onHotkey(action: HotkeyAction) {
  if (action === 'close' || action === 'save') {
    emit('update:visible', false)
  }
}

function onConvertToPresetPopupHotkey(action: HotkeyAction) {
  if (action === 'close' || action === 'save') {
    convertToPresetPopupVisible.value = false
  }
}
</script>
