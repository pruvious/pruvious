<template>
  <component :is="tag" ref="root" class="p-rich-text"></component>
</template>

<script lang="ts" setup>
import '@pruvious/ui/assets/pui/css/01-variables.css'
import { useDebounceFn } from '@vueuse/core'
import { chainCommands, exitCode, toggleMark } from 'prosemirror-commands'
import { keymap } from 'prosemirror-keymap'
import { DOMParser, DOMSerializer, Schema } from 'prosemirror-model'
import { EditorState, Plugin } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { LinkNodeView } from '../../utils/pruvious/dashboard/rich-text/link'
import { ToolbarPluginView } from '../../utils/pruvious/dashboard/rich-text/toolbar'

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
  'Enter': nextBlock,
})
const focusPlugin = new Plugin({
  props: {
    handleDOMEvents: {
      focus: () => {
        focused.value = true
      },
      blur: (view) => {
        focused.value = false
        const html = getHTML(view.state)
        emit('update:modelValue', html)
        emit('commit', html)
      },
    },
  },
})
const toolbarPlugin = new Plugin({ view: (view) => new ToolbarPluginView(view, focused) })
const emitDebounced = useDebounceFn((state: EditorState) => emit('update:modelValue', getHTML(state)), 250)

let view: EditorView | undefined

watch(
  () => props.modelValue,
  (html) => {
    if (view && html !== getHTML(view.state)) {
      const state = createState(html)
      view?.updateState(state)
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
        const newState = view!.state.apply(transaction)
        view!.updateState(newState)
        if (transaction.docChanged) {
          emitDebounced(newState)
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
    plugins: [focusPlugin, keymapPlugin, toolbarPlugin],
  })
}

function getHTML(state: EditorState) {
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(state.doc.content)
  const div = document.createElement('div')
  div.appendChild(fragment)
  return div.innerHTML
}

function nextBlock() {
  console.log('@todo')
  return true
}
</script>

<style>
.p-rich-text {
  outline: none;
  white-space: pre-wrap;
}

.p-rich-text-tooltip {
  position: absolute;
  z-index: 99999;
  display: none;
  padding: 0.125rem;
  background-color: hsl(var(--pui-primary));
  border: 1px solid hsl(var(--pui-border));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  box-sizing: border-box;
  color: hsl(var(--pui-primary-foreground));
}
</style>
