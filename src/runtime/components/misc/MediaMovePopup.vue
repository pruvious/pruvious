<template>
  <PruviousPopup
    :order="1"
    :visible="visible"
    @hotkey="onHotkey"
    @update:visible="$emit('update:visible', $event)"
    width="32rem"
  >
    <template #header>
      <h2 class="truncate text-sm">
        {{
          __('pruvious-dashboard', 'Move $count $items to', {
            count: selection.count.value,
            items: selection.currentType.value,
          })
        }}
      </h2>
    </template>

    <PruviousMediaMovePopupItem
      :selection="selection"
      :tree="tree"
      @close="$emit('update:visible', false)"
      class="p-4"
    />
  </PruviousPopup>
</template>

<script lang="ts" setup>
import { ref, watch, type PropType } from '#imports'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import type { HotkeyAction } from '../../composables/dashboard/hotkeys'
import { useMediaDirectories, type MediaMoveTargetDirectory } from '../../composables/dashboard/media'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import type { MediaDirectoryTreeItem } from '../../utils/dashboard/media-directory'
import { MediaSelection } from '../../utils/dashboard/media-selection'

const props = defineProps({
  directory: {
    type: String,
    default: '',
  },
  selection: {
    type: Object as PropType<MediaSelection>,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  'update:visible': [boolean]
}>()

const mediaDirectories = useMediaDirectories()

const tree = ref<MediaMoveTargetDirectory[]>([])

const PruviousMediaMovePopupItem = dashboardMiscComponent.MediaMovePopupItem()
const PruviousPopup = dashboardMiscComponent.Popup()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      const newTree = buildTree(mediaDirectories.value)
      tree.value = [
        {
          name: __('pruvious-dashboard', 'Root folder'),
          path: '',
          children: newTree.tree,
          disabled: props.directory === '',
        },
      ]

      if (!newTree.hasValidTargets && props.directory === '') {
        pruviousToasterShow({
          message: __('pruvious-dashboard', 'There are no folders where the selected $selection can be moved to', {
            selection: `${props.selection.currentType.value}`,
          }),
        })
      }
    }
  },
)

function onHotkey(action: HotkeyAction) {
  if (action === 'close') {
    emit('update:visible', false)
  }
}

function buildTree(
  item: MediaDirectoryTreeItem,
  parent = '',
  disabled = false,
): { tree: MediaMoveTargetDirectory[]; hasValidTargets: boolean } {
  const tree: MediaMoveTargetDirectory[] = []
  let hasValidTargets = false

  for (const [name, { children }] of Object.entries(item)) {
    const path = `${parent}${name}/`
    const itemDisabled = disabled || path === props.directory || !!props.selection.directories.value[path]
    const subtree = buildTree(children, path, disabled || !!props.selection.directories.value[path])
    hasValidTargets ||= !itemDisabled || subtree.hasValidTargets
    tree.push({ name, path, children: subtree.tree, disabled: itemDisabled })
  }

  return { tree, hasValidTargets }
}
</script>
