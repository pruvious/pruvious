<template>
  <component
    :data-selection="dataSelection"
    :is="tag"
    ref="root"
    class="p-rich-text"
    :class="{
      'p-rich-text-focused': isFocused,
      'p-rich-text-ready': isReady,
    }"
  ></component>
</template>

<script lang="ts" setup>
import { puiIsMac } from '@pruvious/ui/pui/hotkeys'
import { normalizeWhitespace } from '@pruvious/utils'
import { refDebounced, useDebounceFn } from '@vueuse/core'
import { chainCommands, exitCode, toggleMark } from 'prosemirror-commands'
import { keymap } from 'prosemirror-keymap'
import { DOMParser, DOMSerializer, Schema, type NodeSpec } from 'prosemirror-model'
import { EditorState, Plugin, PluginKey, TextSelection, Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import type { EditableTextNextFocus } from '../../../modules/pruvious/preview/utils/rich-text'
import type { RichTextCustomOptions } from '../../../server/fields/richText'
import { LinkNodeView } from '../../utils/pruvious/dashboard/rich-text/link'
import { createPlaceholderPlugin } from '../../utils/pruvious/dashboard/rich-text/placeholder'
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
      | 'div'
      | 'section'
      | 'article'
      | 'aside'
      | 'p'
      | 'h1'
      | 'h2'
      | 'h3'
      | 'h4'
      | 'h5'
      | 'h6'
      | 'blockquote'
      | 'pre'
      | 'ul'
      | 'ol'
      | 'li'
      | 'span'
      | 'code'
      | 'a'
      | 'button'
      | 'label'
      | 'strong'
      | 'em'
      | 'small'
      | (string & {})
    >,
    required: true,
  },

  /**
   * Whether to normalize whitespace in the HTML content.
   * When enabled, consecutive whitespace characters will be collapsed into a single space, and leading/trailing whitespace will be trimmed.
   *
   * @default true
   */
  normalizeWhitespace: {
    type: Boolean,
    default: true,
  },

  /**
   * Controls whether to allow line breaks in the content.
   *
   * @default true
   */
  allowLineBreaks: {
    type: Boolean,
    default: true,
  },

  /**
   * Marks that can be used in rich text content.
   *
   * Marks apply inline formatting like bold, italic, or links to text.
   * Each mark has a tag name, optional parse tags, attributes, keyboard shortcut, icon, and label.
   *
   * The keys in the `marks` object are identifiers you can reference in toolbar configs and formatting functions.
   *
   * @default {}
   */
  marks: {
    type: Object as PropType<Required<RichTextCustomOptions<string>>['marks']>,
    default: () => ({}),
  },

  /**
   * The toolbar configuration for the rich text editor.
   * You can set the following values:
   *
   * - `'auto'` (default) - The toolbar will automatically show available marks based on the field's `marks` option and standard items.
   * - `false` - The toolbar will be hidden and no formatting options will be available.
   * - An array of mark identifiers, standard toolbar items, or custom groups to show in the toolbar.
   *
   * @default 'auto'
   */
  toolbar: {
    type: [Array, Boolean, String] as PropType<
      Required<Required<RichTextCustomOptions<string>>['ui']>['liveEditor']['toolbar']
    >,
    default: 'auto',
  },

  /**
   * The placeholder text to display when the rich text element is empty.
   * By default, no placeholder is shown.
   *
   * @default ''
   */
  placeholder: {
    type: String,
    default: '',
  },

  /**
   * Whether the rich text element is disabled (read-only).
   * When disabled, the content cannot be edited.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  'update:modelValue': [html: string, text: string]
  'commit': [html: string, text: string]
  'focus': []
  'blur': []
  'unfocus': []
  'undo': []
  'redo': []
  'onInsert': [position: 'before' | 'after']
  'enterKey': [valueBefore: string, valueAfter: string]
  'deleteStart': [value: string]
  'deleteEnd': [value: string]
  'deleteBlock': []
  'selectPrevious': [selection?: EditableTextNextFocus['selection']]
  'selectNext': [selection?: EditableTextNextFocus['selection']]
  'duplicate': []
  'moveUp': []
  'moveDown': []
  'paste': [text: string]
}>()

const root = useTemplateRef<HTMLElement>('root')
const isFocused = ref(false)
const isReady = refDebounced(isFocused, 100)
const schema = new Schema({
  nodes: {
    text: {
      group: 'inline',
    },
    ...((props.allowLineBreaks
      ? {
          hardBreak: {
            inline: true,
            group: 'inline',
            selectable: false,
            parseDOM: [{ tag: 'br' }],
            toDOM: () => ['br'],
          } satisfies NodeSpec,
        }
      : {}) as { hardBreak: NodeSpec }),
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
    dispatch(state.tr.replaceSelectionWith(schema.nodes.hardBreak.create()).scrollIntoView())
  }
  return true
})
console.log({ marks: props.marks, toolbar: props.toolbar })
const keymapPlugin = keymap({
  'Mod-i': toggleItalic,
  'Mod-b': toggleBold,
  // 'Mod-u': toggleUnderline, @todo
  // 'Mod-k': toggleLink, @todo
  // 'Mod-e': toggleCode, @todo
  'Mod-Enter': () => onModeEnter('after'),
  'Mod-Shift-Enter': () => onModeEnter('before'),
  ...(props.allowLineBreaks ? { 'Shift-Enter': hardBreak } : {}),
  'Enter': onEnter,
  'Delete': onDelete,
  ...(puiIsMac() ? { 'Ctrl-d': onDelete } : undefined),
  'Backspace': onBackspace,
  'Mod-Backspace': onModBackspace,
  'Mod-z': onUndo,
  'Mod-y': onRedo,
  'Mod-Shift-z': onRedo,
  'ArrowUp': onArrowPrev,
  'ArrowLeft': onArrowPrev,
  'ArrowDown': onArrowNext,
  'ArrowRight': onArrowNext,
  'Tab': onTab,
  'Shift-Tab': onShiftTab,
  'Mod-d': onDuplicate,
  'Mod-ArrowUp': onMoveUp,
  'Mod-ArrowDown': onMoveDown,
  'Home': onHome,
  'End': onEnd,
  'Escape': onEscape,
})
const focusPlugin = new Plugin({
  props: {
    handleDOMEvents: {
      focus: (view) => {
        isFocused.value = true
        emit('focus')

        const toolbarState = toolbarPluginKey.getState(view.state)
        if (toolbarState && toolbarState.forceHide) {
          const tr = view.state.tr.setMeta(toolbarPluginKey, { forceHide: false })
          const newState = view.state.apply(tr)
          view.updateState(newState)
        }
      },
      blur: (view) => {
        isFocused.value = false
        const html = getNormalizedHTML(view.state)
        const newState = createState(html)
        view.updateState(newState)
        emit('blur')
      },
    },
  },
})
const selectionPlugin = new Plugin({
  state: {
    init() {},
    apply(_tr, _value, oldState, newState) {
      if (!oldState.selection.eq(newState.selection)) {
        dataSelection.value = `${newState.selection.from},${newState.selection.to}`
      }
    },
  },
})
const placeholderPlugin = createPlaceholderPlugin(props.placeholder)
const toolbarPluginKey = new PluginKey('toolbar')
const toolbarPlugin = new Plugin({
  key: toolbarPluginKey,
  state: {
    init() {
      return { forceHide: false }
    },
    apply(tr, value) {
      const meta = tr.getMeta(toolbarPluginKey)
      if (meta && 'forceHide' in meta) {
        return { forceHide: meta.forceHide }
      }

      if (tr.selectionSet || tr.docChanged) {
        return { forceHide: false }
      }

      return value
    },
  },
  view: (view) => new ToolbarPluginView(view, isFocused, toolbarPluginKey),
})
const emitModelValue = () => emit('update:modelValue', currentValue, currentText)
const commit = () => emit('commit', currentValue, currentText)
const commitDebounced = useDebounceFn(commit, 250)
const dataSelection = ref<string>()

defineExpose({ getSelection, setSelection })

let view: EditorView | undefined
let currentValue = ''
let currentText = ''

watch(
  () => props.modelValue,
  (html) => {
    if (view && html !== currentValue) {
      const newState = createState(html)
      view?.updateState(newState)
      currentValue = html
      currentText = view.state.doc.textContent
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
      dispatchTransaction(tr) {
        const newState = view!.state.apply(tr)
        view!.updateState(newState)

        if (tr.docChanged) {
          currentValue = getNormalizedHTML(newState)
          currentText = newState.doc.textContent
          emitModelValue()
          commitDebounced()
        }
      },
      editable: () => !props.disabled,
      handlePaste(_, event) {
        const data = event.clipboardData?.getData('text')

        if (data?.startsWith('{"pruviousClipboardDataType":"')) {
          emit('paste', data)
          return true
        }

        return false
      },
    },
  )
  currentValue = getNormalizedHTML(view.state)
  currentText = view.state.doc.textContent
})

onBeforeUnmount(() => {
  view?.destroy()
})

function createState(content: string) {
  const element = document.createElement('div')
  element.innerHTML = content
  const doc = DOMParser.fromSchema(schema).parse(element)
  return EditorState.create({
    schema,
    doc,
    plugins: [focusPlugin, keymapPlugin, placeholderPlugin, selectionPlugin, toolbarPlugin],
    selection: view ? TextSelection.create(doc, Math.min(view.state.selection.from, doc.content.size)) : undefined,
  })
}

function getHTML(state: EditorState) {
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(state.doc.content)
  const div = document.createElement('div')
  div.appendChild(fragment)
  return div.innerHTML
}

function getNormalizedHTML(state: EditorState) {
  const html = getHTML(state)
  return props.normalizeWhitespace ? normalizeWhitespace(html) : html
}

function onModeEnter(position: 'before' | 'after') {
  emit('onInsert', position)
  return false
}

function onEnter(state: EditorState) {
  const { $from } = state.selection
  const before = state.doc.slice(0, $from.pos)
  const after = state.doc.slice($from.pos)
  const serializer = DOMSerializer.fromSchema(schema)

  const divBefore = document.createElement('div')
  divBefore.appendChild(serializer.serializeFragment(before.content))

  const divAfter = document.createElement('div')
  divAfter.appendChild(serializer.serializeFragment(after.content))

  emit('enterKey', divBefore.innerHTML, divAfter.innerHTML)

  return true
}

function onBackspace(state: EditorState, dispatch?: (tr: Transaction) => void) {
  if (state.selection.empty && state.selection.$from.parentOffset === 0) {
    if (state.storedMarks && state.storedMarks.length > 0) {
      dispatch?.(state.tr.setStoredMarks([]))
    }
    emit('deleteStart', getHTML(state))
    return true
  }
  return false
}

function onModBackspace() {
  emit('deleteBlock')
  return true
}

function onDelete(state: EditorState) {
  if (state.selection.empty && state.selection.$from.parentOffset === state.selection.$from.parent.content.size) {
    emit('deleteEnd', getHTML(state))
    return true
  }
  return false
}

function onUndo() {
  emit('undo')
  return true
}

function onRedo() {
  emit('redo')
  return true
}

function onArrowPrev(state: EditorState) {
  if (state.selection.empty && state.selection.$from.parentOffset === 0) {
    emit('selectPrevious', Infinity)
    return true
  }
  return false
}

function onArrowNext(state: EditorState) {
  if (state.selection.empty && state.selection.$from.parentOffset === state.selection.$from.parent.content.size) {
    emit('selectNext', 0)
    return true
  }
  return false
}

function onTab() {
  emit('selectNext')
  return true
}

function onShiftTab() {
  emit('selectPrevious')
  return true
}

function onDuplicate() {
  emit('duplicate')
  return true
}

function onMoveUp() {
  emit('moveUp')
  return true
}

function onMoveDown() {
  emit('moveDown')
  return true
}

function onHome(state: EditorState) {
  const { $from } = state.selection

  if (!state.selection.empty || $from.parentOffset !== 0) {
    const selection = TextSelection.create(state.doc, $from.start())
    const tr = state.tr.setSelection(selection)
    const newState = state.apply(tr)
    view?.updateState(newState)
  }

  return true
}

function onEnd(state: EditorState) {
  const { $from } = state.selection

  if (!state.selection.empty || $from.parentOffset !== $from.parent.content.size) {
    const selection = TextSelection.create(state.doc, $from.end())
    const tr = state.tr.setSelection(selection)
    const newState = state.apply(tr)
    view?.updateState(newState)
  }

  return true
}

function onEscape(state: EditorState, dispatch?: (tr: Transaction) => void) {
  const toolbarState = toolbarPluginKey.getState(state)

  if (toolbarState && !toolbarState.forceHide) {
    dispatch?.(state.tr.setMeta(toolbarPluginKey, { forceHide: true }))
    return true
  }

  emit('unfocus')
  return true
}

function getSelection() {
  if (view) {
    const { from, to } = view.state.selection
    return { from, to }
  }
  return { from: 0, to: 0 }
}

function setSelection(from: number, to: number) {
  if (view) {
    const selection = TextSelection.create(
      view.state.doc,
      Math.min(from, view.state.doc.content.size),
      Math.min(to, view.state.doc.content.size),
    )
    const tr = view.state.tr.setSelection(selection)
    const newState = view.state.apply(tr)
    view.updateState(newState)
  }
}
</script>

<style>
.p-rich-text {
  position: relative;
  outline: none;
  cursor: text;
  white-space: pre-wrap;
}

.p-rich-text:not(.p-rich-text-ready) {
  caret-color: transparent;
}

.p-rich-text-toolbar {
  position: absolute;
  z-index: 999999;
  padding: 0.125rem;
  background-color: var(--pui-toolbar, #ffffff);
  border-radius: 0.5rem;
  box-sizing: border-box;
  color: var(--pui-toolbar-foreground, #260d1c);
  opacity: 0;
  visibility: hidden;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.p-rich-text-toolbar-visible {
  opacity: 1;
  visibility: visible;
}

.p-rich-text-placeholder {
  position: absolute;
  max-width: 100%;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  text-overflow: ellipsis;
  opacity: 0.5;
  filter: grayscale(1);
}
</style>
