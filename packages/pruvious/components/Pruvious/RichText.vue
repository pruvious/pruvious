<template>
  <component :is="tag" ref="root" class="p-rich-text"></component>
</template>

<script lang="ts" setup>
import { useDebounceFn } from '@vueuse/core'
import { chainCommands, exitCode, toggleMark } from 'prosemirror-commands'
import { keymap } from 'prosemirror-keymap'
import { DOMParser, DOMSerializer, Schema } from 'prosemirror-model'
import { EditorState, Plugin, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { LinkNodeView } from '../../utils/pruvious/dashboard/rich-text/link'

const props = defineProps({
  /**
   * The HTML content of the rich text element.
   */
  modelValue: {
    type: String,
    required: true,
  },

  /**
   * The HTML tag name to use for the root element when rendering this component.
   */
  tag: {
    type: String as PropType<
      'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote' | 'pre' | 'ul' | 'ol' | 'li' | (string & {})
    >,
    required: true,
  },

  /**
   * The placeholder text to display when the rich text element is empty.
   * By default, no placeholder is shown.
   *
   * @todo implement this
   */
  placeholder: {
    type: String,
  },
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'commit': [value: string]
  'focus': []
  'blur': []
  'undo': []
  'redo': []
  'enterKey': []
  'deleteKey': []
}>()

const root = useTemplateRef<HTMLElement>('root')
const focused = ref(false)
const schema = new Schema({
  nodes: {
    text: {
      group: 'inline',
    },
    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [{ tag: 'br' }],
      toDOM: () => ['br'],
    },
    root: {
      group: 'block',
      content: 'inline*',
      marks: '_',
      toDOM: () => [props.tag, 0],
      parseDOM: [{ tag: props.tag }],
    },
  },
  marks: {
    em: {
      toDOM: () => ['em', 0],
      parseDOM: [{ tag: 'em' }, { tag: 'i' }],
    },
    strong: {
      toDOM: () => ['strong', 0],
      parseDOM: [{ tag: 'strong' }, { tag: 'b' }],
    },
  },
  topNode: 'root',
})
const toggleItalic = toggleMark(schema.marks.em, null, { removeWhenPresent: false })
const toggleBold = toggleMark(schema.marks.strong, null, { removeWhenPresent: false })
const hardBreak = chainCommands(exitCode, (state, dispatch) => {
  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView())
  }
  return true
})
const keymapPlugin = keymap({
  'Mod-i': toggleItalic,
  'Mod-b': toggleBold,
  'Mod-Enter': hardBreak,
  'Shift-Enter': hardBreak,
  'Enter': onEnter,
  'Delete': onDelete,
  'Backspace': onDelete,
  'Mod-z': onUndo,
  'Mod-y': onRedo,
  'Mod-Shift-z': onRedo,
})
const focusPlugin = new Plugin({
  props: {
    handleDOMEvents: {
      focus: () => {
        focused.value = true
        emit('focus')
        saveSelection()
      },
      blur: (view) => {
        focused.value = false
        const html = getHTML(view.state)
        emit('blur')
        emit('update:modelValue', html)
        emit('commit', html)
      },
    },
  },
})
const emitModelValue = (state: EditorState) => emit('update:modelValue', getHTML(state))
const commit = (state: EditorState) => emit('commit', getHTML(state))
const commitDebounced = useDebounceFn((state: EditorState) => {
  commit(state)
  saveSelection()
  savedSelections.splice(100, savedSelections.length)
}, 250)
const savedSelections: { html: string; from: number; to: number }[] = []

let view: EditorView | undefined

watch(
  () => props.modelValue,
  (html) => {
    if (view && html !== getHTML(view.state)) {
      let newState = createState(html)
      const savedSelection = savedSelections.find((s) => s.html === html)
      if (savedSelection) {
        const { from, to } = savedSelection
        const selection = TextSelection.create(
          newState.doc,
          Math.min(from, newState.doc.content.size),
          Math.min(to, newState.doc.content.size),
        )
        const tr = newState.tr.setSelection(selection)
        newState = newState.apply(tr)
      }
      view?.updateState(newState)
    }
  },
  { flush: 'post' },
)

onMounted(() => {
  view = new EditorView(
    { mount: root.value! },
    {
      state: createState(props.modelValue),
      nodeViews: {
        strong: (node, view, getPos) => new LinkNodeView(node, view, getPos),
      },
      dispatchTransaction(transaction) {
        const oldState = view!.state
        const newState = view!.state.apply(transaction)
        view!.updateState(newState)
        if (transaction.docChanged) {
          emitModelValue(newState)
          commitDebounced(newState)
        }
        if (!oldState.selection.eq(newState.selection)) {
          saveSelection()
        }
      },
    },
  )
})

onBeforeUnmount(() => {
  view?.destroy()
})

function createState(content: string) {
  const element = document.createElement('div')
  element.innerHTML = content
  return EditorState.create({
    schema,
    doc: DOMParser.fromSchema(schema).parse(element),
    plugins: [focusPlugin, keymapPlugin],
  })
}

function getHTML(state: EditorState) {
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(state.doc.content)
  const div = document.createElement('div')
  div.appendChild(fragment)
  return div.innerHTML
}

function onEnter() {
  emit('enterKey')
  return true
}

function onDelete(state: EditorState) {
  if (state.selection.empty && state.selection.$from.parentOffset === 0) {
    emit('deleteKey')
    return true
  }
  return false
}

function onUndo() {
  emit('undo')
  return false
}

function onRedo() {
  emit('redo')
  return false
}

function saveSelection() {
  if (view) {
    const { from, to } = view.state.selection
    const html = getHTML(view.state)
    const lastSavedSelection = savedSelections[0]
    if (lastSavedSelection?.html === html) {
      lastSavedSelection.from = from
      lastSavedSelection.to = to
    } else {
      savedSelections.unshift({ html, from, to })
    }
  }
}
</script>

<style>
.p-rich-text {
  outline: none;
  white-space: pre-wrap;
}

.p-rich-text-tooltip {
  position: absolute;
  z-index: 999999;
  display: none;
  padding: 0.125rem;
  background-color: hsl(var(--pui-primary));
  border: 1px solid hsl(var(--pui-border));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  box-sizing: border-box;
  color: hsl(var(--pui-primary-foreground));
}
</style>
