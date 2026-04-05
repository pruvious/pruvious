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
  >
    <Teleport to="body">
      <div
        v-if="resolvedToolbarItems.length > 0"
        ref="toolbarEl"
        class="p-rich-text-toolbar"
        :class="{ 'p-rich-text-toolbar-visible': toolbarVisible }"
        :style="toolbarStyle"
      >
        <template
          v-for="(item, index) in resolvedToolbarItems"
          :key="item.type === 'mark' ? `mark:${item.name}` : item.type === 'standard' ? item.action : `group:${index}`"
        >
          <button
            v-if="item.type === 'mark'"
            :title="item.label"
            @mousedown.prevent.stop="onToggleMark(item.name)"
            class="p-rich-text-toolbar-btn"
            :class="{ 'p-rich-text-toolbar-btn-active': activeMarks.has(item.name) }"
          >
            <Icon :name="`tabler:${item.icon}`" mode="svg" />
          </button>
          <button
            v-else-if="item.type === 'standard'"
            :title="item.label"
            @mousedown.prevent.stop="onStandardAction(item.action)"
            class="p-rich-text-toolbar-btn"
          >
            <Icon :name="`tabler:${item.icon}`" mode="svg" />
          </button>
          <div v-else-if="item.type === 'group'" class="p-rich-text-toolbar-group">
            <button
              :title="item.tooltip"
              @mousedown.prevent.stop="toggleGroup(index)"
              class="p-rich-text-toolbar-btn"
              :class="{
                'p-rich-text-toolbar-btn-active': isGroupActive(item),
                'p-rich-text-toolbar-btn-open': openGroupIndex === index,
              }"
            >
              <Icon :name="`tabler:${item.icon}`" mode="svg" />
            </button>
            <div v-if="openGroupIndex === index" @mousedown.prevent.stop class="p-rich-text-toolbar-group-dropdown">
              <button
                v-for="subItem in item.items"
                :key="subItem.type === 'mark' ? `mark:${subItem.name}` : subItem.action"
                :title="subItem.label"
                @mousedown.prevent.stop="onGroupItemClick(subItem)"
                class="p-rich-text-toolbar-group-item"
                :class="{ 'p-rich-text-toolbar-btn-active': subItem.type === 'mark' && activeMarks.has(subItem.name) }"
              >
                <Icon v-if="subItem.icon" :name="`tabler:${subItem.icon}`" mode="svg" />
                <span>{{ subItem.label || ('name' in subItem ? subItem.name : subItem.action) }}</span>
              </button>
            </div>
          </div>
        </template>
      </div>
    </Teleport>
  </component>
</template>

<script lang="ts" setup>
import { usePreview } from '#pruvious/dashboard'
import { puiIsMac } from '@pruvious/ui/pui/hotkeys'
import { isObject, isString, normalizeWhitespace } from '@pruvious/utils'
import { refDebounced, useDebounceFn } from '@vueuse/core'
import { chainCommands, exitCode, toggleMark } from 'prosemirror-commands'
import { keymap } from 'prosemirror-keymap'
import { DOMParser, DOMSerializer, Schema, type MarkSpec, type MarkType, type NodeSpec } from 'prosemirror-model'
import { EditorState, Plugin, PluginKey, TextSelection, Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import type { EditableTextNextFocus } from '../../../modules/pruvious/preview/utils/rich-text'
import type { Mark as MarkDef, RichTextCustomOptions, StandardToolbarItem } from '../../../server/fields/richText'
import { createPlaceholderPlugin } from '../../utils/pruvious/dashboard/rich-text/placeholder'
import { ToolbarPluginView } from '../../utils/pruvious/dashboard/rich-text/toolbar'

const { maybeTranslate } = usePreview()

const tagAliases: Record<string, string> = { underline: 'u' }

const reservedShortcuts = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'Backspace',
  'Ctrl-d',
  'Delete',
  'End',
  'Enter',
  'Escape',
  'Home',
  'Mod-ArrowDown',
  'Mod-ArrowUp',
  'Mod-Backspace',
  'Mod-d',
  'Mod-Enter',
  'Mod-k',
  'Mod-Shift-Enter',
  'Mod-Shift-z',
  'Mod-y',
  'Mod-z',
  'Shift-Enter',
  'Shift-Tab',
  'Tab',
])

function resolveTag(markDef: MarkDef): string {
  const tag = markDef.tag ?? 'span'
  return tagAliases[tag] ?? tag
}

function buildAttrsObject(attrs: MarkDef['attrs']): Record<string, string> | undefined {
  if (attrs) {
    if ('class' in attrs) {
      return { class: Array.isArray(attrs.class) ? attrs.class.join(' ') : attrs.class }
    }

    if ('style' in attrs && isObject(attrs.style)) {
      return {
        style: Object.entries(attrs.style)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; '),
      }
    }

    return attrs as Record<string, string>
  }
}

function buildParseDOM(tag: string, attrs: MarkDef['attrs'], parseTags?: string[]) {
  const entries: { tag: string; getAttrs?: (node: HTMLElement) => Record<string, never> | false }[] = []
  const attrsObj = buildAttrsObject(attrs)

  if (attrsObj && tag === 'span') {
    entries.push({
      tag,
      getAttrs: (node: HTMLElement) => {
        if ('class' in (attrs ?? {})) {
          const expected = attrsObj.class!
          return expected.split(' ').every((c) => node.classList.contains(c)) ? {} : false
        }

        if ('style' in (attrs ?? {}) && isObject((attrs as any).style)) {
          return Object.entries((attrs as any).style).every(([k, v]) => node.style.getPropertyValue(k) === v)
            ? {}
            : false
        }

        return Object.entries(attrsObj).every(([k, v]) => node.getAttribute(k) === v) ? {} : false
      },
    })
  } else {
    entries.push({ tag })
  }

  for (const parseTag of parseTags ?? []) {
    entries.push({ tag: parseTag })
  }

  return entries
}

interface ResolvedMarkToolbarItem {
  type: 'mark'
  name: string
  icon: string
  label?: string
}

interface ResolvedStandardToolbarItem {
  type: 'standard'
  action: StandardToolbarItem
  icon: string
  label?: string
}

interface ResolvedGroupToolbarItem {
  type: 'group'
  icon: string
  tooltip?: string
  items: (ResolvedMarkToolbarItem | ResolvedStandardToolbarItem)[]
}

type ResolvedToolbarItem = ResolvedMarkToolbarItem | ResolvedStandardToolbarItem | ResolvedGroupToolbarItem

const standardToolbarItems: Record<string, { icon: string; label: string }> = {
  clearFormatting: { icon: 'clear-formatting', label: 'Clear formatting' },
  undo: { icon: 'arrow-back-up', label: 'Undo' },
  redo: { icon: 'arrow-forward-up', label: 'Redo' },
}

function resolveStringEntry(
  entry: string,
  marks: Record<string, MarkDef>,
): ResolvedMarkToolbarItem | ResolvedStandardToolbarItem | undefined {
  if (entry.startsWith('mark:')) {
    const markName = entry.slice(5)
    const markDef = marks[markName]

    if (markDef) {
      return {
        type: 'mark',
        name: markName,
        icon: markDef.icon ?? 'asterisk',
        label: maybeTranslate(markDef.label),
      }
    }
  } else if (entry in standardToolbarItems) {
    const std = standardToolbarItems[entry]!

    return {
      type: 'standard',
      action: entry as StandardToolbarItem,
      icon: std.icon,
      label: std.label,
    }
  }
}

function resolveToolbarItems(
  toolbar: RichTextCustomOptions<string>['ui'] extends infer U
    ? U extends { liveEditor?: { toolbar?: infer T } }
      ? T
      : never
    : never,
  marks: Record<string, MarkDef>,
): ResolvedToolbarItem[] {
  if (toolbar === false) return []

  const entries: (string | { icon?: string; tooltip?: string | Function; items: string[] })[] =
    toolbar === 'auto' || toolbar === undefined
      ? [...Object.keys(marks).map((name) => `mark:${name}`), 'clearFormatting']
      : (toolbar as any[])

  const items: ResolvedToolbarItem[] = []

  for (const entry of entries) {
    if (isString(entry)) {
      const resolved = resolveStringEntry(entry, marks)

      if (resolved) {
        items.push(resolved)
      }
    } else if (isObject(entry) && 'items' in entry) {
      const groupItems: (ResolvedMarkToolbarItem | ResolvedStandardToolbarItem)[] = []

      for (const subEntry of (entry as { items: string[] }).items) {
        const resolved = resolveStringEntry(subEntry, marks)

        if (resolved) {
          groupItems.push(resolved as ResolvedMarkToolbarItem | ResolvedStandardToolbarItem)
        }
      }

      if (groupItems.length > 0) {
        items.push({
          type: 'group',
          icon: (entry as any).icon ?? 'paint',
          tooltip: maybeTranslate((entry as any).tooltip),
          items: groupItems,
        })
      }
    }
  }

  return items
}

function buildMarksSpec(marks: Record<string, MarkDef>): Record<string, MarkSpec> {
  const specs: Record<string, MarkSpec> = {}

  for (const [name, markDef] of Object.entries(marks)) {
    const tag = resolveTag(markDef)
    const attrsObj = buildAttrsObject(markDef.attrs)

    specs[name] = {
      toDOM: () => (attrsObj ? [tag, attrsObj, 0] : [tag, 0]),
      parseDOM: buildParseDOM(tag, markDef.attrs, markDef.parseTags),
    }
  }

  return specs
}

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
const resolvedMarks = buildMarksSpec(props.marks)
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
  marks: resolvedMarks,
  topNode: 'root',
})
const markToggleCommands: Record<string, ReturnType<typeof toggleMark>> = {}
const markShortcuts: Record<string, ReturnType<typeof toggleMark>> = {}

for (const [name, markDef] of Object.entries(props.marks)) {
  if (schema.marks[name]) {
    markToggleCommands[name] = toggleMark(schema.marks[name], null, { removeWhenPresent: false })
    if (markDef.shortcut && !reservedShortcuts.has(markDef.shortcut)) {
      markShortcuts[markDef.shortcut] = markToggleCommands[name]
    }
  }
}

const hardBreak = chainCommands(exitCode, (state, dispatch) => {
  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(schema.nodes.hardBreak.create()).scrollIntoView())
  }
  return true
})
const keymapPlugin = keymap({
  ...markShortcuts,
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
        openGroupIndex.value = null
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
        openGroupIndex.value = null
      }
    },
  },
})
const placeholderPlugin = createPlaceholderPlugin(props.placeholder)
const toolbarPluginKey = new PluginKey('toolbar')
const toolbarEl = useTemplateRef<HTMLElement>('toolbarEl')
const toolbarPosition = ref({ top: 0, left: 0 })
const toolbarVisible = ref(false)
const activeMarks = ref(new Set<string>())
const resolvedToolbarItems = resolveToolbarItems(props.toolbar, props.marks)
const toolbarBuffer = 4
const toolbarStyle = computed(() => {
  const el = toolbarEl.value
  const width = el?.offsetWidth ?? 0
  const height = el?.offsetHeight ?? 0
  const viewportWidth = document.documentElement.clientWidth

  let top = toolbarPosition.value.top - height - 4
  let left = toolbarPosition.value.left - width / 2

  if (top < toolbarBuffer) {
    top = toolbarBuffer
  }

  if (left < toolbarBuffer) {
    left = toolbarBuffer
  } else if (left + width > viewportWidth - toolbarBuffer) {
    left = viewportWidth - toolbarBuffer - width
  }

  return { top: `${top}px`, left: `${left}px` }
})
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
  view: (editorView) =>
    new ToolbarPluginView(
      editorView,
      isFocused,
      toolbarPluginKey,
      toolbarPosition,
      toolbarVisible,
      activeMarks,
      Object.keys(props.marks),
      openGroupIndex,
    ),
})
const emitModelValue = () => emit('update:modelValue', currentValue, currentText)
const commit = () => emit('commit', currentValue, currentText)
const commitDebounced = useDebounceFn(commit, 250)
const dataSelection = ref<string>()

const openGroupIndex = ref<number | null>(null)

function toggleGroup(index: number) {
  openGroupIndex.value = openGroupIndex.value === index ? null : index
}

function isGroupActive(item: ResolvedGroupToolbarItem): boolean {
  return item.items.some((sub) => sub.type === 'mark' && activeMarks.value.has(sub.name))
}

function onGroupItemClick(subItem: ResolvedMarkToolbarItem | ResolvedStandardToolbarItem) {
  if (subItem.type === 'mark') {
    onToggleMark(subItem.name)
  } else {
    onStandardAction(subItem.action)
  }

  openGroupIndex.value = null
}

function onToggleMark(markName: string) {
  openGroupIndex.value = null

  if (view && markToggleCommands[markName]) {
    markToggleCommands[markName](view.state, view.dispatch)
  }
}

function onStandardAction(action: StandardToolbarItem) {
  openGroupIndex.value = null

  if (view) {
    if (action === 'clearFormatting') {
      const { from, to } = view.state.selection
      if (from !== to) {
        const tr = view.state.tr

        for (const markType of Object.values(view.state.schema.marks) as MarkType[]) {
          tr.removeMark(from, to, markType)
        }

        view.dispatch(tr)
      }
    } else if (action === 'undo') {
      emit('undo')
    } else if (action === 'redo') {
      emit('redo')
    }
  }
}

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
  if (openGroupIndex.value !== null) {
    openGroupIndex.value = null
    return true
  }

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
  display: flex;
  gap: 0.125rem;
  padding: 0.25rem;
  background-color: var(--p-editable-text-toolbar, hsl(0 0% 100%));
  border-radius: 0.375rem;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
  color: var(--p-editable-text-toolbar-foreground, hsl(228 11% 44%));
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition-property: opacity, visibility;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.p-rich-text-toolbar-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.p-rich-text-toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.625rem;
  height: 1.625rem;
  padding: 0;
  border: none;
  border-radius: 0.25rem;
  background: none;
  color: var(--p-editable-text-toolbar-foreground, hsl(228 11% 44%));
  cursor: pointer;
  transition: background-color 150ms;
}

.p-rich-text-toolbar-btn:hover:not(.p-rich-text-toolbar-btn-active),
.p-rich-text-toolbar-btn-open:not(.p-rich-text-toolbar-btn-active) {
  background-color: var(--p-editable-text-toolbar-hover, hsl(240 4.8% 94%));
  color: var(--p-editable-text-toolbar-foreground-hover, hsl(324 49% 10%));
}

.p-rich-text-toolbar-btn-active {
  background-color: var(--p-editable-text-toolbar-active, hsl(209 71% 88%));
  color: var(--p-editable-text-toolbar-active-foreground, hsl(324 49% 10%));
}

.p-rich-text-toolbar-btn svg {
  width: 1rem;
  height: 1rem;
}

.p-rich-text-toolbar-group {
  position: relative;
}

.p-rich-text-toolbar-group-dropdown {
  position: absolute;
  top: 100%;
  left: -0.25rem;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: max-content;
  margin-top: 0.375rem;
  padding: 0.25rem;
  background-color: var(--p-editable-text-toolbar, hsl(0 0% 100%));
  border-radius: 0.375rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  color: var(--p-editable-text-toolbar-foreground, hsl(228 11% 44%));
}

.p-rich-text-toolbar-group-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 1.625rem;
  padding: 0 0.5rem;
  border: none;
  border-radius: 0.25rem;
  background: none;
  color: var(--p-editable-text-toolbar-foreground, hsl(228 11% 44%));
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.p-rich-text-toolbar-group-item:hover:not(.p-rich-text-toolbar-btn-active) {
  background-color: var(--p-editable-text-toolbar-hover, hsl(240 4.8% 94%));
  color: var(--p-editable-text-toolbar-foreground-hover, hsl(324 49% 10%));
}

.p-rich-text-toolbar-group-item.p-rich-text-toolbar-btn-active {
  background-color: var(--p-editable-text-toolbar-active, hsl(209 71% 88%));
  color: var(--p-editable-text-toolbar-active-foreground, hsl(324 49% 10%));
}

.p-rich-text-toolbar-group-item svg {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.p-rich-text-toolbar-group-item span {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.8125rem;
}

.dark .p-rich-text-toolbar {
  background-color: var(--p-editable-text-toolbar, hsl(231 16.7% 16.5%));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.32);
  color: var(--p-editable-text-toolbar-foreground, hsl(228 11% 65%));
}

.dark .p-rich-text-toolbar-btn {
  color: var(--p-editable-text-toolbar-foreground, hsl(228 11% 65%));
}

.dark .p-rich-text-toolbar-btn:hover:not(.p-rich-text-toolbar-btn-active),
.dark .p-rich-text-toolbar-btn-open:not(.p-rich-text-toolbar-btn-active) {
  background-color: var(--p-editable-text-toolbar-hover, hsl(231 16.7% 24%));
  color: var(--p-editable-text-toolbar-foreground-hover, hsl(0 0% 98%));
}

.dark .p-rich-text-toolbar-btn-active {
  background-color: var(--p-editable-text-toolbar-active, hsl(208 52% 28%));
  color: var(--p-editable-text-toolbar-active-foreground, hsl(0 0% 98%));
}

.dark .p-rich-text-toolbar-group-dropdown {
  background-color: var(--p-editable-text-toolbar, hsl(231 16.7% 16.5%));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.32);
  color: var(--p-editable-text-toolbar-foreground, hsl(228 11% 65%));
}

.dark .p-rich-text-toolbar-group-item {
  color: var(--p-editable-text-toolbar-foreground, hsl(228 11% 65%));
}

.dark .p-rich-text-toolbar-group-item:hover:not(.p-rich-text-toolbar-btn-active) {
  background-color: var(--p-editable-text-toolbar-hover, hsl(231 16.7% 24%));
  color: var(--p-editable-text-toolbar-foreground-hover, hsl(0 0% 98%));
}

.dark .p-rich-text-toolbar-group-item.p-rich-text-toolbar-btn-active {
  background-color: var(--p-editable-text-toolbar-active, hsl(208 52% 28%));
  color: var(--p-editable-text-toolbar-active-foreground, hsl(0 0% 98%));
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
