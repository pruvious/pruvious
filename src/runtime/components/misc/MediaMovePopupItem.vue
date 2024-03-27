<template>
  <ul class="flex flex-col gap-2">
    <li v-for="{ children, disabled, name, path } of tree">
      <button
        v-pruvious-tooltip="{
          content:
            clickConfirmation?.id === `move-selection-to-${path}`
              ? __('pruvious-dashboard', 'Confirm to **move** the selected $selection to **$directory**', {
                  selection: `${selection.currentType.value}`,
                  directory: name,
                })
              : undefined,
          showOnCreate: clickConfirmation?.id === `move-selection-to-${path}`,
        }"
        :disabled="disabled"
        @click="moveTo(path, $event)"
        class="button w-full !justify-start"
        :class="{
          'button-primary': clickConfirmation?.id === `move-selection-to-${path}`,
          'button-white': clickConfirmation?.id !== `move-selection-to-${path}`,
        }"
      >
        <PruviousIconFolder />
        <span>{{ name }}</span>
      </button>

      <PruviousMediaMovePopupItem
        v-if="children.length"
        :selection="selection"
        :tree="children"
        @close="$emit('close')"
        class="ml-4 mt-2"
      />
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { type PropType } from '#imports'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { confirmClick, useClickConfirmation } from '../../composables/dashboard/confirm-click'
import { moveSelection, type MediaMoveTargetDirectory } from '../../composables/dashboard/media'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { MediaSelection } from '../../utils/dashboard/media-selection'

const props = defineProps({
  selection: {
    type: Object as PropType<MediaSelection>,
    required: true,
  },
  tree: {
    type: Array as PropType<MediaMoveTargetDirectory[]>,
    required: true,
  },
})

const emit = defineEmits<{
  close: []
}>()

const clickConfirmation = useClickConfirmation()

const PruviousMediaMovePopupItem = dashboardMiscComponent.MediaMovePopupItem()

await loadTranslatableStrings('pruvious-dashboard')

async function moveTo(directory: string, event: MouseEvent) {
  confirmClick({
    target: event.target as Element,
    id: `move-selection-to-${directory}`,
    success: async () => {
      emit('close')
      await moveSelection(props.selection, directory)
    },
  })
}
</script>
