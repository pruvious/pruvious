import { Plugin } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export function createPlaceholderPlugin(text: string, dashboard = false) {
  return new Plugin({
    props: {
      decorations(state) {
        if (state.doc.content.size > 0) {
          return DecorationSet.empty
        }

        const placeholder = document.createElement('span')
        placeholder.className = dashboard
          ? 'p-rich-text-placeholder p-rich-text-placeholder-dashboard'
          : 'p-rich-text-placeholder'
        placeholder.textContent = text

        return DecorationSet.create(state.doc, [Decoration.widget(0, placeholder)])
      },
    },
  })
}
