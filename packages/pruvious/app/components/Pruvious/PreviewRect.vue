<template>
  <div class="p-preview-rect">
    <template v-for="{ path, block, el, highlighted, focused, deepest } of rects">
      <PruviousBlockRect
        v-if="routeReference && blocks[block]"
        :block="blocks[block]"
        :deepest="deepest"
        :editable="editable"
        :el="el"
        :focused="focused"
        :highlighted="highlighted"
        :name="block"
        :path="path"
      />
    </template>
  </div>
</template>

<script lang="ts" setup>
import {
  usePruviousPreviewBlocks,
  usePruviousPreviewFocusedBlocks,
  usePruviousPreviewHighlightedBlocks,
  usePruviousPreviewIsEditable,
  usePruviousPreviewRouteReferences,
  usePruviousRoute,
} from '#pruvious/client'
import type { BlockName } from '#pruvious/server'

const route = usePruviousRoute()
const routeReferences = usePruviousPreviewRouteReferences()
const routeReference = computed(() => (route.value ? routeReferences.value[route.value.ref] : null))
const highlighted = usePruviousPreviewHighlightedBlocks()
const focused = usePruviousPreviewFocusedBlocks()
const blocks = usePruviousPreviewBlocks()
const editable = usePruviousPreviewIsEditable()
const rects = computed(() => {
  const results: {
    path: string
    block: BlockName
    el: HTMLElement
    highlighted: boolean
    focused: boolean
    deepest: boolean
  }[] = []
  for (const [i, { path, block, el }] of highlighted.value.entries()) {
    results.push({ path, block, el, highlighted: true, focused: false, deepest: i === highlighted.value.length - 1 })
  }
  for (const [i, { path, block, el }] of focused.value.entries()) {
    const existing = results.find((r) => r.path === path && r.block === block)
    if (existing) {
      existing.focused = true
      existing.deepest = i === focused.value.length - 1
    } else {
      results.push({ path, block, el, highlighted: false, focused: true, deepest: i === focused.value.length - 1 })
    }
  }
  return results.sort(({ el: a }, { el: b }) => {
    if (a === b) {
      return 0
    } else if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1
    }
    return -1
  })
})
</script>

<style scoped>
.p-preview-rect {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 0;
}
</style>
