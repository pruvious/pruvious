<template>
  <PruviousPreviewRectExtend>
    <div class="p-preview-rect">
      <template v-for="{ path, block, el, highlighted, focused, deepest } of rects">
        <PruviousBlockRect
          v-if="routeReference && blocks[block]"
          :block="blocks[block]"
          :deepest="deepest"
          :editable="isEditable"
          :el="el"
          :focused="focused"
          :highlighted="highlighted"
          :key="path"
          :name="block"
          :path="path"
        />
      </template>
    </div>
  </PruviousPreviewRectExtend>
</template>

<script lang="ts" setup>
import { preloadTranslatableStrings, usePruviousRoute } from '#pruvious/app'
import { usePreview } from '#pruvious/dashboard'
import type { BlockName } from '#pruvious/server'

const proute = usePruviousRoute()
const { isEditable, dashboardLanguage, routeReferences, blocks, highlightedBlocks, focusedBlocks } = usePreview()
const routeReference = computed(() => (proute.value ? routeReferences.value[proute.value.ref] : null))
const rects = computed(() => {
  const results: {
    path: string
    block: BlockName
    el: HTMLElement
    highlighted: boolean
    focused: boolean
    deepest: boolean
  }[] = []
  for (const [i, { path, name, el }] of highlightedBlocks.value.entries()) {
    results.push({
      path,
      block: name,
      el,
      highlighted: true,
      focused: false,
      deepest: i === highlightedBlocks.value.length - 1,
    })
  }
  for (const [i, { path, name, el }] of focusedBlocks.value.entries()) {
    const existing = results.find((r) => r.path === path && r.block === name)
    if (existing) {
      existing.focused = true
      existing.deepest = i === focusedBlocks.value.length - 1
    } else {
      results.push({
        path,
        block: name,
        el,
        highlighted: false,
        focused: true,
        deepest: i === focusedBlocks.value.length - 1,
      })
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

await preloadTranslatableStrings('pruvious-dashboard', dashboardLanguage.value as any)
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
