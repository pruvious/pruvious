import { useEventListener } from '@vueuse/core'
import type { EditorState, PluginKey, PluginView } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'

export class ToolbarPluginView implements PluginView {
  toolbar: HTMLElement
  state: EditorState | null = null
  showTimeout: NodeJS.Timeout | undefined

  constructor(
    public view: EditorView,
    public isFocused: Ref<boolean>,
    public key: PluginKey,
  ) {
    this.toolbar = document.createElement('div')
    this.toolbar.className = 'p-rich-text-toolbar'
    document.body.appendChild(this.toolbar)

    watch(isFocused, () => this.update())
    useEventListener('resize', () => this.updatePosition())
    this.update()
  }

  update() {
    const state = this.key.getState(this.view.state)
    const isForceHidden = state?.forceHide || false
    const shouldBeVisible = this.isFocused.value && !isForceHidden

    if (shouldBeVisible) {
      this.toolbar.textContent = String(Math.random())
      this.updatePosition()
      this.show()
    } else {
      this.hide()
    }
  }

  protected show() {
    clearTimeout(this.showTimeout)
    this.showTimeout = setTimeout(() => {
      this.toolbar.classList.add('p-rich-text-toolbar-visible')
    }, 150)
  }

  protected hide() {
    clearTimeout(this.showTimeout)
    this.toolbar.classList.remove('p-rich-text-toolbar-visible')
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
