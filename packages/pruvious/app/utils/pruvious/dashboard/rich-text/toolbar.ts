import { useEventListener } from '@vueuse/core'
import type { MarkType } from 'prosemirror-model'
import type { EditorState, PluginKey, PluginView } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'

function isMarkActive(state: EditorState, type: MarkType): boolean {
  const { from, $from, to, empty } = state.selection

  if (empty) {
    return !!type.isInSet(state.storedMarks || $from.marks())
  }

  return state.doc.rangeHasMark(from, to, type)
}

export class ToolbarPluginView implements PluginView {
  showTimeout: NodeJS.Timeout | undefined

  constructor(
    public view: EditorView,
    public isFocused: Ref<boolean>,
    public key: PluginKey,
    public toolbarPosition: Ref<{ top: number; left: number }>,
    public toolbarVisible: Ref<boolean>,
    public activeMarks: Ref<Set<string>>,
    public markNames: string[],
    public openGroupIndex: Ref<number | null>,
  ) {
    watch(isFocused, () => this.updateVisibility())
    watch(openGroupIndex, () => this.updateVisibility())
    useEventListener('resize', () => this.updatePosition())
    useEventListener(document, 'scroll', () => this.updatePosition(), { capture: true, passive: true })
    this.updateVisibility()
  }

  update() {
    const newActive = new Set<string>()

    for (const name of this.markNames) {
      const markType = this.view.state.schema.marks[name]

      if (markType && isMarkActive(this.view.state, markType)) {
        newActive.add(name)
      }
    }

    this.activeMarks.value = newActive
    this.updateVisibility()
  }

  protected updateVisibility() {
    const state = this.key.getState(this.view.state)
    const isForceHidden = state?.forceHide || false
    const hasOpenGroup = this.openGroupIndex.value !== null
    const shouldBeVisible = (this.isFocused.value || hasOpenGroup) && !isForceHidden && this.markNames.length > 0

    if (shouldBeVisible) {
      if (!hasOpenGroup) {
        this.updatePosition()
      }

      this.show()
    } else {
      this.hide()
    }
  }

  protected show() {
    clearTimeout(this.showTimeout)
    this.showTimeout = setTimeout(() => {
      this.toolbarVisible.value = true
    }, 150)
  }

  protected hide() {
    clearTimeout(this.showTimeout)
    this.toolbarVisible.value = false
  }

  protected updatePosition() {
    try {
      const { from, to, anchor } = this.view.state.selection
      const start = this.view.coordsAtPos(from)
      const end = this.view.coordsAtPos(to)
      const baseTop = from === anchor ? end.top : start.top
      const baseLeft = from === anchor ? end.left : start.left

      this.toolbarPosition.value = {
        top: baseTop + window.scrollY,
        left: baseLeft + window.scrollX,
      }
    } catch {}
  }

  destroy() {
    clearTimeout(this.showTimeout)
  }
}
