import type { Node } from 'prosemirror-model'
import type { EditorView, NodeView } from 'prosemirror-view'

export class LinkNodeView implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement

  constructor(node: Node, view: EditorView, getPos: () => number | undefined) {
    this.dom = document.createElement('strong')
    this.contentDOM = this.dom
    this.dom.style.color = 'blue'

    // Example transaction
    // view.dispatch(view.state.tr.setNodeMarkup(getPos(), null, {
    //  src: node.attrs.src,
    //  alt,
    // }))
  }

  stopEvent() {
    return true
  }
}
