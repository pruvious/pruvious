import { useEventListener } from '@vueuse/core'
import type { EditorState, PluginView } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'

export class ToolbarPluginView implements PluginView {
  toolbar: HTMLElement
  state: EditorState | null = null

  constructor(
    public view: EditorView,
    public focused: Ref<boolean>,
  ) {
    this.toolbar = document.createElement('div')
    this.toolbar.className = 'p-rich-text-toolbar'
    document.body.appendChild(this.toolbar)

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
    this.toolbar.textContent = String(Math.random())
    this.updatePosition()
  }

  protected show() {
    this.toolbar.style.display = 'flex'
  }

  protected hide() {
    this.toolbar.style.removeProperty('display')
  }

  protected updatePosition() {
    if (this.toolbar.offsetParent) {
      const { from, to, anchor } = this.view.state.selection
      const start = this.view.coordsAtPos(from)
      const end = this.view.coordsAtPos(to)
      const width = this.toolbar.offsetWidth
      const height = this.toolbar.offsetHeight
      const baseTop = from === anchor ? end.top : start.top
      const baseLeft = from === anchor ? end.left : start.left

      let top = baseTop - height + window.scrollY
      let left = baseLeft - width / 2 + window.scrollX

      if (top < 0) {
        top = 0
      }

      if (left < 4) {
        left = 4
      } else if (left + width > document.documentElement.clientWidth - 4) {
        left = document.documentElement.clientWidth - 4 - width
      }

      this.toolbar.style.top = `${top}px`
      this.toolbar.style.left = `${left}px`
    }
  }

  destroy() {
    this.toolbar.remove()
  }
}
