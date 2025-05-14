import { useEventListener } from '@vueuse/core'
import type { EditorState, PluginView } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'

export class ToolbarPluginView implements PluginView {
  tooltip: HTMLElement
  state: EditorState | null = null

  constructor(
    public view: EditorView,
    public focused: Ref<boolean>,
  ) {
    this.tooltip = document.createElement('div')
    this.tooltip.className = 'p-rich-text-tooltip'
    view.dom.parentNode!.appendChild(this.tooltip)

    this.update(view, null)

    watch(focused, () => {
      if (focused.value) {
        this.show()
      } else {
        this.hide()
      }
    })

    useEventListener('resize', () => this.updatePosition())
  }

  update(view: EditorView, lastState: EditorState | null) {
    if (
      !this.focused.value ||
      (lastState && lastState.doc.eq(view.state.doc) && lastState.selection.eq(view.state.selection))
    ) {
      return
    }

    this.show()
    this.tooltip.textContent = String(Math.random())
    this.updatePosition()
  }

  protected show() {
    this.tooltip.style.display = 'flex'
  }

  protected hide() {
    this.tooltip.style.removeProperty('display')
  }

  protected updatePosition() {
    const { from, to, anchor } = this.view.state.selection
    const start = this.view.coordsAtPos(from)
    const end = this.view.coordsAtPos(to)
    const box = this.tooltip.offsetParent!.getBoundingClientRect()
    const width = this.tooltip.offsetWidth
    const left = (from === anchor ? end.left : start.left) - box.left - width / 2
    this.tooltip.style.left = `${Math.min(Math.max(left, -box.left + 4), box.right - width - 4)}px`
    this.tooltip.style.bottom = `${from === anchor ? box.bottom - end.top : box.bottom - start.top}px`
  }

  destroy() {
    this.tooltip.remove()
  }
}
