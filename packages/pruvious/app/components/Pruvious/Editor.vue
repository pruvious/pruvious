<template>
  <div
    ref="root"
    class="p-editor"
    :class="{
      'p-editor-focused': isFocused,
      'p-editor-disabled': disabled,
    }"
  >
    <div v-if="resolvedToolbar.length > 0" class="p-editor-toolbar">
      <template v-for="(item, index) in resolvedToolbar" :key="`item-${index}`">
        <span v-if="item.type === 'separator'" class="p-editor-toolbar-separator" />

        <div v-else-if="item.type === 'blockType'" ref="blockTypeWrapperRef" class="p-editor-toolbar-block-type">
          <button
            :disabled="disabled"
            :title="__('pruvious-dashboard', 'Block type')"
            @click="toggleBlockMenu"
            @mousedown.prevent
            ref="blockTypeBtnRef"
            type="button"
            class="pui-raw p-editor-toolbar-btn p-editor-toolbar-block-type-btn"
            :class="{ 'p-editor-toolbar-btn-open': blockMenuOpen }"
          >
            <span>{{ currentBlockLabel }}</span>
            <Icon mode="svg" name="tabler:chevron-down" />
          </button>
          <Teleport to="body">
            <PUIDropdown
              v-if="blockMenuOpen"
              :handleControls="false"
              :reference="blockTypeBtnRef?.[0]"
              :restoreFocus="false"
              :size="-1"
              @close="blockMenuOpen = false"
              class="p-editor-dropdown"
            >
              <PUIDropdownItem
                v-for="block in availableBlocks"
                :key="block.key"
                :title="block.label"
                @click="onBlockTypeClick(block.key)"
                @mousedown.prevent
                :class="{ 'p-editor-dropdown-item-active': activeBlock === block.key }"
              >
                <Icon v-if="block.icon" :name="`tabler:${block.icon}`" mode="svg" />
                <span>{{ block.label }}</span>
              </PUIDropdownItem>
            </PUIDropdown>
          </Teleport>
        </div>

        <button
          v-else-if="item.type === 'mark'"
          :disabled="disabled"
          :title="item.label"
          @click="onToggleMark(item.name)"
          @mousedown.prevent
          type="button"
          class="pui-raw p-editor-toolbar-btn"
          :class="{ 'p-editor-toolbar-btn-active': activeMarks.has(item.name) }"
        >
          <Icon :name="`tabler:${item.icon}`" mode="svg" />
        </button>

        <button
          v-else-if="item.type === 'standard'"
          :disabled="disabled || isStandardDisabled(item.action)"
          :title="item.label"
          @click="onStandardAction(item.action)"
          @mousedown.prevent
          type="button"
          class="pui-raw p-editor-toolbar-btn"
          :class="{
            'p-editor-toolbar-btn-active': item.action === 'link' && activeMarks.has('link'),
          }"
        >
          <Icon :name="`tabler:${item.icon}`" mode="svg" />
        </button>

        <template v-else-if="item.type === 'group'">
          <button
            :disabled="disabled"
            :ref="(el) => setGroupButtonRef(item.index, el)"
            :title="item.tooltip"
            @click="toggleGroup(item.index)"
            @mousedown.prevent
            type="button"
            class="pui-raw p-editor-toolbar-btn"
            :class="{
              'p-editor-toolbar-btn-active': isGroupActive(item),
              'p-editor-toolbar-btn-open': openGroupIndex === item.index,
            }"
          >
            <Icon :name="`tabler:${item.icon}`" mode="svg" />
          </button>
          <Teleport to="body">
            <PUIDropdown
              v-if="openGroupIndex === item.index"
              :handleControls="false"
              :reference="groupButtonRefs.get(item.index)"
              :restoreFocus="false"
              :size="-1"
              @close="openGroupIndex = null"
              class="p-editor-dropdown"
            >
              <PUIDropdownItem
                v-for="sub in item.items"
                :key="sub.type === 'mark' ? `mark:${sub.name}` : sub.action"
                :title="sub.label || ('name' in sub ? sub.name : sub.action)"
                @click="onGroupItemClick(sub)"
                @mousedown.prevent
                :class="{
                  'p-editor-dropdown-item-active':
                    (sub.type === 'mark' && activeMarks.has(sub.name)) ||
                    (sub.type === 'standard' && sub.action === 'link' && activeMarks.has('link')),
                }"
              >
                <Icon v-if="sub.icon" :name="`tabler:${sub.icon}`" mode="svg" />
                <span>{{ sub.label || ('name' in sub ? sub.name : sub.action) }}</span>
              </PUIDropdownItem>
            </PUIDropdown>
          </Teleport>
        </template>
      </template>
    </div>

    <div ref="editorMount" class="p-editor-surface" />

    <Teleport to="body">
      <PruviousDashboardRichTextLinkPopup
        v-if="linkPopupVisible"
        :disabled="disabled"
        :href="linkPopupAttrs.href"
        :options="linksOptions"
        :rel="linkPopupAttrs.rel"
        :target="linkPopupAttrs.target"
        @close="$event().then(() => (linkPopupVisible = false))"
        @save="applyLink"
      />
    </Teleport>
  </div>
</template>

<script lang="ts">
import type { EditorBlockKey } from '../../../server/fields/editor'

const EDITOR_BLOCK_KEYS: readonly EditorBlockKey[] = [
  'paragraph',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'bulletList',
  'orderedList',
  'blockquote',
  'codeBlock',
  'hr',
] as const
</script>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { isObject, isString, kebabCase, normalizeWhitespace } from '@pruvious/utils'
import { useDebounceFn } from '@vueuse/core'
import { baseKeymap, chainCommands, exitCode, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands'
import { history, redo, undo } from 'prosemirror-history'
import { inputRules, textblockTypeInputRule, wrappingInputRule } from 'prosemirror-inputrules'
import { keymap } from 'prosemirror-keymap'
import {
  DOMParser,
  DOMSerializer,
  Schema,
  type MarkSpec,
  type MarkType,
  type NodeSpec,
  type NodeType,
} from 'prosemirror-model'
import { liftListItem, sinkListItem, splitListItem, wrapInList } from 'prosemirror-schema-list'
import { EditorState, Plugin, TextSelection, type Command } from 'prosemirror-state'
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view'
import type { EditorCustomOptions, EditorStandardToolbarItem } from '../../../server/fields/editor'
import type { LinksOptions, Mark as MarkDef, ToolbarGroup } from '../../../server/fields/richText'

const reservedShortcuts = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'Backspace',
  'Delete',
  'Enter',
  'Escape',
  'Mod-Alt-0',
  'Mod-Alt-1',
  'Mod-Alt-2',
  'Mod-Alt-3',
  'Mod-Alt-4',
  'Mod-Alt-5',
  'Mod-Alt-6',
  'Mod-Enter',
  'Mod-k',
  'Mod-Shift-7',
  'Mod-Shift-8',
  'Mod-Shift-9',
  'Mod-Shift-Enter',
  'Mod-Shift-z',
  'Mod-y',
  'Mod-z',
  'Shift-Enter',
  'Shift-Tab',
  'Tab',
])

const props = defineProps({
  /**
   * The HTML content of the editor.
   */
  modelValue: {
    type: String,
    required: true,
  },

  /**
   * Allowed block types. Defaults to all built-in blocks.
   */
  blocks: {
    type: Array as PropType<EditorBlockKey[]>,
    default: () => [...EDITOR_BLOCK_KEYS],
  },

  /**
   * Marks that can be used inside block content.
   */
  marks: {
    type: Object as PropType<Required<EditorCustomOptions<string>>['marks']>,
    default: () => ({}),
  },

  /**
   * Link configuration. `false` disables links; `true` or an object enables them.
   */
  links: {
    type: [Boolean, Object] as PropType<boolean | LinksOptions>,
    default: false,
  },

  /**
   * Toolbar configuration.
   */
  toolbar: {
    type: [Array, Boolean, String] as PropType<'auto' | false | (string | ToolbarGroup)[]>,
    default: 'auto',
  },

  /**
   * Placeholder shown when the editor is empty.
   */
  placeholder: {
    type: String,
    default: '',
  },

  /**
   * Disables editing.
   */
  disabled: {
    type: Boolean,
    default: false,
  },

  /**
   * Normalize whitespace in serialized HTML before emitting.
   */
  normalizeWhitespace: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits<{
  'update:modelValue': [html: string]
  'commit': [html: string]
  'focus': []
  'blur': []
  'linkApplied': [html: string]
}>()

const root = useTemplateRef<HTMLElement>('root')
const editorMount = useTemplateRef<HTMLElement>('editorMount')
const blockTypeBtnRef = useTemplateRef<HTMLElement[]>('blockTypeBtnRef')
const blockTypeWrapperRef = useTemplateRef<HTMLElement[]>('blockTypeWrapperRef')
const isFocused = ref(false)
const blockMenuOpen = ref(false)
const activeMarks = ref(new Set<string>())
const activeBlock = ref<EditorBlockKey | null>(null)
const linkPopupVisible = ref(false)
const linkPopupAttrs = ref<{ href: string; target: string; rel: string }>({ href: '', target: '', rel: '' })
const canUndo = ref(false)
const canRedo = ref(false)
let savedLinkRange: { from: number; to: number; isExistingLink: boolean } | null = null

const linksEnabled = computed(() => !!props.links)
const linksOptions = computed<LinksOptions>(() => (isObject(props.links) ? props.links : {}))

const blockKeys = computed<EditorBlockKey[]>(() => {
  const list = props.blocks && props.blocks.length > 0 ? props.blocks : [...EDITOR_BLOCK_KEYS]
  return EDITOR_BLOCK_KEYS.filter((k) => list.includes(k))
})

const blockMeta: Record<EditorBlockKey, { label: string; icon: string }> = {
  paragraph: { label: __('pruvious-dashboard', 'Paragraph'), icon: 'pilcrow' },
  h1: { label: __('pruvious-dashboard', 'Heading $level', { level: 1 }), icon: 'h-1' },
  h2: { label: __('pruvious-dashboard', 'Heading $level', { level: 2 }), icon: 'h-2' },
  h3: { label: __('pruvious-dashboard', 'Heading $level', { level: 3 }), icon: 'h-3' },
  h4: { label: __('pruvious-dashboard', 'Heading $level', { level: 4 }), icon: 'h-4' },
  h5: { label: __('pruvious-dashboard', 'Heading $level', { level: 5 }), icon: 'h-5' },
  h6: { label: __('pruvious-dashboard', 'Heading $level', { level: 6 }), icon: 'h-6' },
  bulletList: { label: __('pruvious-dashboard', 'Bullet list'), icon: 'list' },
  orderedList: { label: __('pruvious-dashboard', 'Ordered list'), icon: 'list-numbers' },
  blockquote: { label: __('pruvious-dashboard', 'Blockquote'), icon: 'quote' },
  codeBlock: { label: __('pruvious-dashboard', 'Code block'), icon: 'code' },
  hr: { label: __('pruvious-dashboard', 'Divider'), icon: 'minus' },
}

const availableBlocks = computed(() =>
  blockKeys.value.map((key) => ({ key, label: blockMeta[key].label, icon: blockMeta[key].icon })),
)

const currentBlockLabel = computed(() =>
  activeBlock.value && blockMeta[activeBlock.value]
    ? blockMeta[activeBlock.value].label
    : __('pruvious-dashboard', 'Block type'),
)

function resolveTag(markDef: MarkDef): string {
  return markDef.tag ?? 'span'
}

function buildAttrsObject(attrs: MarkDef['attrs']): Record<string, string> | undefined {
  if (!attrs) return
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

function buildLinkMarkSpec(): MarkSpec {
  return {
    attrs: { href: { default: '' }, target: { default: '' }, rel: { default: '' } },
    inclusive: false,
    parseDOM: [
      {
        tag: 'a[href]',
        getAttrs(node) {
          const el = node as HTMLElement
          return {
            href: el.getAttribute('href') ?? '',
            target: el.getAttribute('target') ?? '',
            rel: el.getAttribute('rel') ?? '',
          }
        },
      },
    ],
    toDOM(mark) {
      const attrs: Record<string, string> = { href: mark.attrs.href }
      if (mark.attrs.target) attrs.target = mark.attrs.target
      if (mark.attrs.rel) attrs.rel = mark.attrs.rel
      return ['a', attrs, 0]
    },
  }
}

function buildMarksSpec(marks: Record<string, MarkDef>): Record<string, MarkSpec> {
  const specs: Record<string, MarkSpec> = {}

  for (const [name, markDef] of Object.entries(marks)) {
    const tag = resolveTag(markDef)
    const attrsObj = buildAttrsObject(markDef.attrs)
    const dashboardStyleStr = markDef.dashboardStyle
      ? Object.entries(markDef.dashboardStyle)
          .map(([k, v]) => `${kebabCase(k)}: ${v}`)
          .join('; ')
      : undefined

    let toDOMAttrs: Record<string, string> | undefined

    if (attrsObj && dashboardStyleStr) {
      toDOMAttrs = { ...attrsObj, style: [attrsObj.style, dashboardStyleStr].filter(Boolean).join('; ') }
    } else if (attrsObj) {
      toDOMAttrs = attrsObj
    } else if (dashboardStyleStr) {
      toDOMAttrs = { style: dashboardStyleStr }
    }

    specs[name] = {
      toDOM: () => (toDOMAttrs ? [tag, toDOMAttrs, 0] : [tag, 0]),
      parseDOM: buildParseDOM(tag, markDef.attrs, markDef.parseTags),
    }
  }

  return specs
}

const allowedBlockSet = new Set(blockKeys.value)

const nodes: Record<string, NodeSpec> = {
  doc: { content: 'block+' },
  text: { group: 'inline' },
  hardBreak: {
    inline: true,
    group: 'inline',
    selectable: false,
    parseDOM: [{ tag: 'br' }],
    toDOM: () => ['br'],
  },
  paragraph: {
    group: 'block',
    content: 'inline*',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0],
  },
}

if (
  allowedBlockSet.has('h1') ||
  allowedBlockSet.has('h2') ||
  allowedBlockSet.has('h3') ||
  allowedBlockSet.has('h4') ||
  allowedBlockSet.has('h5') ||
  allowedBlockSet.has('h6')
) {
  nodes.heading = {
    attrs: { level: { default: 1 } },
    group: 'block',
    content: 'inline*',
    defining: true,
    parseDOM: ([1, 2, 3, 4, 5, 6] as const)
      .filter((l) => allowedBlockSet.has(`h${l}` as EditorBlockKey))
      .map((l) => ({ tag: `h${l}`, attrs: { level: l } })),
    toDOM: (node) => [`h${node.attrs.level}`, 0],
  }
}

if (allowedBlockSet.has('blockquote')) {
  nodes.blockquote = {
    group: 'block',
    content: 'block+',
    defining: true,
    parseDOM: [{ tag: 'blockquote' }],
    toDOM: () => ['blockquote', 0],
  }
}

if (allowedBlockSet.has('codeBlock')) {
  nodes.codeBlock = {
    group: 'block',
    content: 'text*',
    marks: '',
    code: true,
    defining: true,
    parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
    toDOM: () => ['pre', ['code', 0]],
  }
}

if (allowedBlockSet.has('hr')) {
  nodes.horizontalRule = {
    group: 'block',
    parseDOM: [{ tag: 'hr' }],
    toDOM: () => ['hr'],
  }
}

if (allowedBlockSet.has('bulletList') || allowedBlockSet.has('orderedList')) {
  nodes.listItem = {
    content: 'paragraph block*',
    defining: true,
    parseDOM: [{ tag: 'li' }],
    toDOM: () => ['li', 0],
  }

  if (allowedBlockSet.has('bulletList')) {
    nodes.bulletList = {
      group: 'block',
      content: 'listItem+',
      parseDOM: [{ tag: 'ul' }],
      toDOM: () => ['ul', 0],
    }
  }

  if (allowedBlockSet.has('orderedList')) {
    nodes.orderedList = {
      group: 'block',
      content: 'listItem+',
      parseDOM: [{ tag: 'ol' }],
      toDOM: () => ['ol', 0],
    }
  }
}

const marksSpec: Record<string, MarkSpec> = {
  ...(linksEnabled.value ? { link: buildLinkMarkSpec() } : {}),
  ...buildMarksSpec(props.marks),
}

const schema = new Schema({ nodes, marks: marksSpec })

const markToggleCommands: Record<string, ReturnType<typeof toggleMark>> = {}
const markShortcuts: Record<string, ReturnType<typeof toggleMark>> = {}

for (const [name, markDef] of Object.entries(props.marks)) {
  const markType = schema.marks[name]
  if (!markType) continue
  markToggleCommands[name] = toggleMark(markType, null, { removeWhenPresent: false })
  if (markDef.shortcut && !reservedShortcuts.has(markDef.shortcut)) {
    markShortcuts[markDef.shortcut] = markToggleCommands[name]
  }
}

function setParagraphCommand(): Command {
  return (state, dispatch) => setBlockType(schema.nodes.paragraph!)(state, dispatch)
}

function setHeadingCommand(level: number): Command {
  return (state, dispatch) => {
    const headingType = schema.nodes.heading
    if (!headingType) return false
    return setBlockType(headingType, { level })(state, dispatch)
  }
}

function wrapInBlockquoteCommand(): Command {
  return (state, dispatch) => {
    const type = schema.nodes.blockquote
    if (!type) return false
    return wrapIn(type)(state, dispatch)
  }
}

function setCodeBlockCommand(): Command {
  return (state, dispatch) => {
    const type = schema.nodes.codeBlock
    if (!type) return false
    return setBlockType(type)(state, dispatch)
  }
}

function insertHorizontalRuleCommand(): Command {
  return (state, dispatch) => {
    const type = schema.nodes.horizontalRule
    if (!type) return false
    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(type.create()).scrollIntoView())
    }
    return true
  }
}

function wrapInBulletListCommand(): Command {
  return (state, dispatch) => {
    const type = schema.nodes.bulletList
    if (!type) return false
    return wrapInList(type)(state, dispatch)
  }
}

function wrapInOrderedListCommand(): Command {
  return (state, dispatch) => {
    const type = schema.nodes.orderedList
    if (!type) return false
    return wrapInList(type)(state, dispatch)
  }
}

function setBlockByKey(key: EditorBlockKey): Command {
  switch (key) {
    case 'paragraph':
      return setParagraphCommand()
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return setHeadingCommand(parseInt(key.slice(1), 10))
    case 'bulletList':
      return wrapInBulletListCommand()
    case 'orderedList':
      return wrapInOrderedListCommand()
    case 'blockquote':
      return wrapInBlockquoteCommand()
    case 'codeBlock':
      return setCodeBlockCommand()
    case 'hr':
      return insertHorizontalRuleCommand()
  }
}

const hardBreakCmd = chainCommands(exitCode, (state, dispatch) => {
  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(schema.nodes.hardBreak!.create()).scrollIntoView())
  }
  return true
})

const listItemType = schema.nodes.listItem
const splitListItemCmd: Command = listItemType ? splitListItem(listItemType) : () => false
const liftListItemCmd: Command = listItemType ? liftListItem(listItemType) : () => false
const sinkListItemCmd: Command = listItemType ? sinkListItem(listItemType) : () => false

const headingKeymap: Record<string, Command> = {}
for (const level of [1, 2, 3, 4, 5, 6] as const) {
  if (allowedBlockSet.has(`h${level}` as EditorBlockKey)) {
    headingKeymap[`Mod-Alt-${level}`] = setHeadingCommand(level)
  }
}

const keymapPlugin = keymap({
  ...markShortcuts,
  ...(linksEnabled.value
    ? {
        'Mod-k': () => {
          openLinkPicker()
          return true
        },
      }
    : {}),
  'Mod-Alt-0': setParagraphCommand(),
  ...headingKeymap,
  ...(allowedBlockSet.has('bulletList') ? { 'Mod-Shift-8': wrapInBulletListCommand() } : {}),
  ...(allowedBlockSet.has('orderedList') ? { 'Mod-Shift-7': wrapInOrderedListCommand() } : {}),
  ...(allowedBlockSet.has('blockquote') ? { 'Mod-Shift-9': wrapInBlockquoteCommand() } : {}),
  ...(listItemType
    ? {
        'Enter': splitListItemCmd,
        'Tab': sinkListItemCmd,
        'Shift-Tab': liftListItemCmd,
      }
    : {}),
  'Shift-Enter': hardBreakCmd,
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
})

const baseKeymapPlugin = keymap(baseKeymap)

const inputRulesPlugin = inputRules({
  rules: [
    ...([1, 2, 3, 4, 5, 6] as const)
      .filter((l) => allowedBlockSet.has(`h${l}` as EditorBlockKey) && schema.nodes.heading)
      .map((l) => textblockTypeInputRule(new RegExp(`^(#{${l}})\\s$`), schema.nodes.heading as NodeType, { level: l })),
    ...(allowedBlockSet.has('blockquote') && schema.nodes.blockquote
      ? [wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote)]
      : []),
    ...(allowedBlockSet.has('bulletList') && schema.nodes.bulletList
      ? [wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bulletList)]
      : []),
    ...(allowedBlockSet.has('orderedList') && schema.nodes.orderedList
      ? [
          wrappingInputRule(
            /^(\d+)\.\s$/,
            schema.nodes.orderedList,
            (_match) => ({}),
            (match, node) => node.childCount + node.attrs.order == +match[1]!,
          ),
        ]
      : []),
    ...(allowedBlockSet.has('codeBlock') && schema.nodes.codeBlock
      ? [textblockTypeInputRule(/^```$/, schema.nodes.codeBlock)]
      : []),
  ],
})

const focusPlugin = new Plugin({
  props: {
    handleDOMEvents: {
      focus: () => {
        isFocused.value = true
        emit('focus')
        return false
      },
      blur: (view, event) => {
        const next = (event as FocusEvent).relatedTarget as Node | null
        if (next && (root.value?.contains(next) || document.querySelector('.pui-dropdown')?.contains(next))) {
          return false
        }
        isFocused.value = false
        blockMenuOpen.value = false
        const normalized = getNormalizedHTML(view.state)
        if (normalized !== currentValue) {
          currentValue = normalized
        }
        emit('blur')
        emit('commit', currentValue)
        return false
      },
    },
  },
})

const placeholderPlugin = new Plugin({
  props: {
    decorations(state) {
      if (!props.placeholder) return DecorationSet.empty
      const { doc } = state
      if (doc.childCount !== 1) return DecorationSet.empty
      const first = doc.firstChild
      if (!first || first.type.name !== 'paragraph' || first.content.size > 0) {
        return DecorationSet.empty
      }
      const el = document.createElement('span')
      el.className = 'p-rich-text-placeholder p-rich-text-placeholder-dashboard'
      el.textContent = props.placeholder
      return DecorationSet.create(doc, [Decoration.widget(1, el)])
    },
  },
})

const stateTrackerPlugin = new Plugin({
  view: () => ({
    update(view) {
      updateActiveState(view.state)
    },
  }),
})

function updateActiveState(state: EditorState) {
  const marks = new Set<string>()
  const { from, to, empty, $from } = state.selection

  if (empty) {
    const stored = state.storedMarks ?? $from.marks()
    for (const m of stored) marks.add(m.type.name)
  } else {
    state.doc.nodesBetween(from, to, (node) => {
      if (node.isText) {
        for (const m of node.marks) marks.add(m.type.name)
      }
    })
  }

  activeMarks.value = marks
  activeBlock.value = detectActiveBlock(state)
  canUndo.value = (undo as any)(state)
  canRedo.value = (redo as any)(state)
}

function nodeToBlockKey(node: { type: { name: string }; attrs: Record<string, any> }): EditorBlockKey | null {
  const name = node.type.name
  if (name === 'paragraph') return 'paragraph'
  if (name === 'heading') return `h${node.attrs.level}` as EditorBlockKey
  if (name === 'bulletList') return 'bulletList'
  if (name === 'orderedList') return 'orderedList'
  if (name === 'blockquote') return 'blockquote'
  if (name === 'codeBlock') return 'codeBlock'
  if (name === 'horizontalRule') return 'hr'
  return null
}

function detectActiveBlock(state: EditorState): EditorBlockKey | null {
  const { from, to } = state.selection
  const found = new Set<EditorBlockKey>()
  const containerKeys = new Set<EditorBlockKey>(['bulletList', 'orderedList', 'blockquote'])

  state.doc.nodesBetween(from, to, (node) => {
    const key = nodeToBlockKey(node)
    if (!key) return true
    found.add(key)
    if (found.size > 1) return false
    return !containerKeys.has(key)
  })

  return found.size === 1 ? [...found][0]! : null
}

const standardMeta: Record<EditorStandardToolbarItem, { icon: string; label: string }> = {
  'blockType': { icon: 'chevron-down', label: __('pruvious-dashboard', 'Block type') },
  'clearFormatting': { icon: 'clear-formatting', label: __('pruvious-dashboard', 'Clear formatting') },
  'link': { icon: 'link', label: __('pruvious-dashboard', 'Link') },
  'undo': { icon: 'arrow-back-up', label: __('pruvious-dashboard', 'Undo') },
  'redo': { icon: 'arrow-forward-up', label: __('pruvious-dashboard', 'Redo') },
  '|': { icon: '', label: '' },
}

type ResolvedSubItem =
  | { type: 'mark'; name: string; icon: string; label: string }
  | { type: 'standard'; action: Exclude<EditorStandardToolbarItem, 'blockType' | '|'>; icon: string; label: string }

type ResolvedToolbarItem =
  | { type: 'separator' }
  | { type: 'blockType' }
  | ResolvedSubItem
  | { type: 'group'; index: number; icon: string; tooltip: string; items: ResolvedSubItem[] }

function resolveString(entry: string): ResolvedToolbarItem | undefined {
  if (entry === '|') return { type: 'separator' }
  if (entry === 'blockType') {
    if (blockKeys.value.length < 2) return
    return { type: 'blockType' }
  }
  return resolveSubItem(entry)
}

function resolveSubItem(entry: string): ResolvedSubItem | undefined {
  if (entry.startsWith('mark:')) {
    const name = entry.slice(5)
    const markDef = props.marks[name]
    if (!markDef) return
    const label = isString(markDef.label)
      ? markDef.label
      : ((markDef.label as any)?.({ _: (s: string) => s, __ }) ?? name)
    return { type: 'mark', name, icon: markDef.icon ?? 'asterisk', label }
  }

  if (entry === 'link' && !linksEnabled.value) return
  if (entry === 'clearFormatting' || entry === 'link' || entry === 'undo' || entry === 'redo') {
    const meta = standardMeta[entry]
    return { type: 'standard', action: entry, icon: meta.icon, label: meta.label }
  }
}

function translate(value: string | ((ctx: { _: any; __: any }) => string) | undefined): string {
  if (!value) return ''
  if (isString(value)) return value
  return (value as any)({ _: (s: string) => s, __ }) ?? ''
}

const resolvedToolbar = computed<ResolvedToolbarItem[]>(() => {
  if (props.toolbar === false) return []

  const hasInlineFormatting = Object.keys(props.marks).length > 0 || linksEnabled.value
  const entries: (string | ToolbarGroup)[] =
    props.toolbar === 'auto' || props.toolbar === undefined
      ? [
          ...(blockKeys.value.length > 1 ? ['blockType', '|'] : []),
          ...Object.keys(props.marks).map((name) => `mark:${name}`),
          ...(linksEnabled.value ? ['link'] : []),
          ...(hasInlineFormatting ? ['|', 'clearFormatting'] : []),
          '|',
          'undo',
          'redo',
        ]
      : (props.toolbar as any[])

  const items: ResolvedToolbarItem[] = []
  let lastWasSeparator = true
  let groupIndex = 0

  for (const entry of entries) {
    if (isString(entry)) {
      const resolved = resolveString(entry)
      if (!resolved) continue
      if (resolved.type === 'separator') {
        if (lastWasSeparator) continue
        items.push(resolved)
        lastWasSeparator = true
      } else {
        items.push(resolved)
        lastWasSeparator = false
      }
    } else if (entry && typeof entry === 'object' && Array.isArray((entry as ToolbarGroup).items)) {
      const subItems: ResolvedSubItem[] = []
      for (const subEntry of (entry as ToolbarGroup).items) {
        const resolvedSub = resolveSubItem(subEntry)
        if (resolvedSub) subItems.push(resolvedSub)
      }
      if (subItems.length === 0) continue
      items.push({
        type: 'group',
        index: groupIndex++,
        icon: (entry as ToolbarGroup).icon ?? 'paint',
        tooltip: translate((entry as ToolbarGroup).tooltip),
        items: subItems,
      })
      lastWasSeparator = false
    }
  }

  while (items.length > 0 && items[items.length - 1]!.type === 'separator') {
    items.pop()
  }

  return items
})

const openGroupIndex = ref<number | null>(null)
const groupButtonRefs = new Map<number, HTMLElement>()

function setGroupButtonRef(index: number, el: any) {
  if (el) {
    groupButtonRefs.set(index, el as HTMLElement)
  } else {
    groupButtonRefs.delete(index)
  }
}

function toggleGroup(index: number) {
  const next = openGroupIndex.value === index ? null : index
  if (next !== null) blockMenuOpen.value = false
  openGroupIndex.value = next
}

function isGroupActive(item: Extract<ResolvedToolbarItem, { type: 'group' }>): boolean {
  return item.items.some(
    (sub) =>
      (sub.type === 'mark' && activeMarks.value.has(sub.name)) ||
      (sub.type === 'standard' && sub.action === 'link' && activeMarks.value.has('link')),
  )
}

function onGroupItemClick(sub: ResolvedSubItem) {
  openGroupIndex.value = null
  if (sub.type === 'mark') {
    onToggleMark(sub.name)
  } else {
    onStandardAction(sub.action)
  }
}

function isStandardDisabled(action: Exclude<EditorStandardToolbarItem, 'blockType' | '|'>): boolean {
  if (!view) return true
  if (action === 'undo') return !canUndo.value
  if (action === 'redo') return !canRedo.value
  return false
}

function onToggleMark(name: string) {
  if (view && markToggleCommands[name]) {
    markToggleCommands[name](view.state, view.dispatch)
    view.focus()
  }
}

function onStandardAction(action: Exclude<EditorStandardToolbarItem, 'blockType' | '|'>) {
  if (!view) return

  if (action === 'clearFormatting') {
    const { from, to } = view.state.selection
    if (from === to) {
      view.dispatch(view.state.tr.setStoredMarks([]))
    } else {
      const tr = view.state.tr
      for (const markType of Object.values(view.state.schema.marks) as MarkType[]) {
        tr.removeMark(from, to, markType)
      }
      view.dispatch(tr)
    }
  } else if (action === 'link') {
    openLinkPicker()
  } else if (action === 'undo') {
    undo(view.state, view.dispatch)
  } else if (action === 'redo') {
    redo(view.state, view.dispatch)
  }

  view.focus()
}

function toggleBlockMenu() {
  if (!blockMenuOpen.value) openGroupIndex.value = null
  blockMenuOpen.value = !blockMenuOpen.value
}

function onBlockTypeClick(key: EditorBlockKey) {
  blockMenuOpen.value = false
  if (!view) return
  setBlockByKey(key)(view.state, view.dispatch)
  view.focus()
}

function getLinkRangeAndAttrs(): { from: number; to: number; attrs: Record<string, string> } | null {
  if (!view || !linksEnabled.value) return null

  const linkType = view.state.schema.marks.link
  if (!linkType) return null

  const { $from, from, to, empty } = view.state.selection

  if (!empty) {
    const node = $from.nodeAfter ?? $from.nodeBefore
    const mark = node?.marks.find((m) => m.type === linkType)
    return { from, to, attrs: mark ? { ...mark.attrs } : { href: '', target: '', rel: '' } }
  }

  const parent = $from.parent
  const offset = $from.parentOffset
  const start = $from.start()
  let markFrom = -1
  let markTo = -1
  let attrs: Record<string, string> | null = null

  parent.content.forEach((child, childOffset) => {
    const mark = child.marks.find((m) => m.type === linkType)
    if (mark && childOffset <= offset && offset <= childOffset + child.nodeSize) {
      markFrom = start + childOffset
      markTo = start + childOffset + child.nodeSize
      attrs = { ...mark.attrs }
    }
  })

  if (markFrom !== -1) return { from: markFrom, to: markTo, attrs: attrs! }
  return null
}

function openLinkPicker() {
  if (!view || !linksEnabled.value) return

  const existing = getLinkRangeAndAttrs()
  const { empty, from, to } = view.state.selection

  if (existing) {
    savedLinkRange = { from: existing.from, to: existing.to, isExistingLink: true }
    linkPopupAttrs.value = {
      href: existing.attrs.href || '',
      target: existing.attrs.target || '',
      rel: existing.attrs.rel || '',
    }
  } else if (!empty) {
    savedLinkRange = { from, to, isExistingLink: false }
    linkPopupAttrs.value = { href: '', target: '', rel: '' }
  } else {
    savedLinkRange = null
    linkPopupAttrs.value = { href: '', target: '', rel: '' }
  }

  linkPopupVisible.value = true
}

function findLinkRangeAt(approxFrom: number, approxTo: number): { from: number; to: number } | null {
  if (!view) return null

  const linkType = view.state.schema.marks.link
  if (!linkType) return null

  const { doc } = view.state
  let foundFrom = -1
  let foundTo = -1

  doc.nodesBetween(Math.max(0, approxFrom - 1), Math.min(doc.content.size, approxTo + 1), (node, pos) => {
    if (foundFrom !== -1) return false
    if (!node.isText || !node.marks.some((m) => m.type === linkType)) return undefined

    const $pos = doc.resolve(pos)
    const parent = $pos.parent
    const parentStart = pos - $pos.parentOffset
    let extentFrom = pos
    let extentTo = pos + node.nodeSize

    parent.content.forEach((child, childOffset) => {
      if (!child.marks.some((m) => m.type === linkType)) return
      const childFrom = parentStart + childOffset
      const childTo = childFrom + child.nodeSize
      if (childFrom <= extentTo && childTo >= extentFrom) {
        extentFrom = Math.min(extentFrom, childFrom)
        extentTo = Math.max(extentTo, childTo)
      }
    })

    foundFrom = extentFrom
    foundTo = extentTo
    return false
  })

  return foundFrom === -1 ? null : { from: foundFrom, to: foundTo }
}

function applyLink(value: { href: string; target: string; rel: string }) {
  if (!view) return

  const linkType = view.state.schema.marks.link
  if (!linkType) return

  const href = (value.href ?? '').trim()
  const saved = savedLinkRange
  let dispatched = false

  if (!href) {
    if (saved && saved.isExistingLink) {
      const range = findLinkRangeAt(saved.from, saved.to) ?? saved
      view.dispatch(view.state.tr.removeMark(range.from, range.to, linkType))
      dispatched = true
    }
  } else {
    const mark = linkType.create({ href, target: value.target ?? '', rel: value.rel ?? '' })

    if (saved) {
      const range = saved.isExistingLink ? (findLinkRangeAt(saved.from, saved.to) ?? saved) : saved
      const tr = view.state.tr.removeMark(range.from, range.to, linkType).addMark(range.from, range.to, mark)
      view.dispatch(tr)
    } else {
      const text = view.state.schema.text(href, [mark])
      view.dispatch(view.state.tr.replaceSelectionWith(text, false))
    }
    dispatched = true
  }

  savedLinkRange = null

  if (dispatched) {
    emit('linkApplied', currentValue)
  }
}

let view: EditorView | undefined
let currentValue = ''
const emitModelValue = () => emit('update:modelValue', currentValue)
const commitDebounced = useDebounceFn(() => emit('commit', currentValue), 250)

watch(
  () => props.modelValue,
  (html) => {
    if (view && html !== currentValue) {
      const newState = createState(html)
      view.updateState(newState)
      currentValue = html
    }
  },
  { flush: 'post' },
)

watch(
  () => props.disabled,
  () => view?.setProps({ editable: () => !props.disabled }),
)

onMounted(() => {
  view = new EditorView(
    { mount: editorMount.value! },
    {
      state: createState(props.modelValue),
      dispatchTransaction(tr) {
        const newState = view!.state.apply(tr)
        view!.updateState(newState)

        if (tr.docChanged) {
          currentValue = getNormalizedHTML(newState)
          emitModelValue()
          commitDebounced()
        }

        updateActiveState(newState)
      },
      editable: () => !props.disabled,
    },
  )
  currentValue = getNormalizedHTML(view.state)
  updateActiveState(view.state)
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
    plugins: [
      history(),
      keymapPlugin,
      baseKeymapPlugin,
      inputRulesPlugin,
      focusPlugin,
      placeholderPlugin,
      stateTrackerPlugin,
    ],
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

function syncFocusAfterDropdownClose() {
  nextTick(() => {
    if (view && !view.hasFocus() && isFocused.value) {
      isFocused.value = false
      emit('blur')
      emit('commit', currentValue)
    }
  })
}

watch(blockMenuOpen, (open) => {
  if (!open) syncFocusAfterDropdownClose()
})

watch(openGroupIndex, (next) => {
  if (next === null) syncFocusAfterDropdownClose()
})

function closeMenusOnOutsideClick(event: MouseEvent) {
  if (!blockMenuOpen.value && openGroupIndex.value === null) return
  const target = event.target as Node | null
  if (!target) return
  const dropdownEl = document.querySelector('.pui-dropdown') as HTMLElement | null
  if (dropdownEl?.contains(target)) return
  const blockTypeWrapper = blockTypeWrapperRef.value?.[0]
  if (blockMenuOpen.value && blockTypeWrapper?.contains(target)) return
  if (openGroupIndex.value !== null) {
    const groupBtn = groupButtonRefs.get(openGroupIndex.value)
    if (groupBtn?.contains(target)) return
  }
  blockMenuOpen.value = false
  openGroupIndex.value = null
}

onMounted(() => document.addEventListener('mousedown', closeMenusOnOutsideClick, true))
onBeforeUnmount(() => document.removeEventListener('mousedown', closeMenusOnOutsideClick, true))

defineExpose({ applyLink, focus: () => view?.focus() })
</script>

<style>
.p-editor {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

.p-editor.p-editor-disabled {
  --pui-foreground: var(--pui-muted-foreground);
  color: hsl(var(--pui-muted-foreground));
}

.p-editor-toolbar {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.125rem;
  padding: 0.25rem;
  background-color: hsl(var(--pui-card));
  border-bottom: 1px solid hsl(var(--pui-border));
  border-top-left-radius: calc(var(--pui-radius) - 0.1875rem);
  border-top-right-radius: calc(var(--pui-radius) - 0.1875rem);
}

.p-editor-toolbar-separator {
  width: 1px;
  height: 1rem;
  margin: 0 0.25rem;
  background-color: hsl(var(--pui-border));
}

.p-editor-toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  height: 1.625rem;
  min-width: 1.625rem;
  padding: 0 0.25rem;
  border-radius: 0.25rem;
  color: hsl(var(--pui-foreground));
  font-size: 0.8125rem;
  line-height: 1;
  transition: var(--pui-transition);
  transition-property: background-color, color;
}

.p-editor-toolbar-btn:hover:not(:disabled):not(.p-editor-toolbar-btn-active) {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.p-editor-toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.p-editor-toolbar-btn-active {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.pui-dropdown-item.p-editor-dropdown-item-active,
.pui-dropdown-item.p-editor-dropdown-item-active:focus {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.p-editor-dropdown .pui-dropdown-item + .pui-dropdown-item {
  margin-top: 1px;
}

.p-editor-toolbar-btn-open {
  background-color: hsl(var(--pui-accent));
  color: hsl(var(--pui-accent-foreground));
}

.p-editor-toolbar-btn svg {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.p-editor-toolbar-block-type {
  position: relative;
}

.p-editor-toolbar-block-type-btn {
  padding: 0 0.375rem;
  font-weight: 500;
}

.p-editor-toolbar-block-type-btn > span {
  min-width: 5rem;
  text-align: left;
}

.p-editor-surface {
  flex: 1 1 auto;
  min-height: calc(12rem + 3px);
  padding: 0.5rem;
  font-size: 1em;
  line-height: 1.5;
  color: hsl(var(--pui-foreground));
  white-space: pre-wrap;
  outline: none !important;
}

.p-editor-surface:focus,
.p-editor-surface:focus-visible {
  outline: none !important;
}

.p-editor-surface > * {
  margin: 0;
}

.p-editor-surface > * + * {
  margin-top: 0.75em;
}

.p-editor-surface h1,
.p-editor-surface h2,
.p-editor-surface h3,
.p-editor-surface h4,
.p-editor-surface h5,
.p-editor-surface h6 {
  font-weight: 600;
  line-height: 1.25;
}

.p-editor-surface h1 {
  font-size: 1.875em;
  font-weight: 700;
}

.p-editor-surface h2 {
  font-size: 1.5em;
  font-weight: 700;
}

.p-editor-surface h3 {
  font-size: 1.25em;
}

.p-editor-surface h4 {
  font-size: 1.125em;
}

.p-editor-surface h5 {
  font-size: 1em;
}

.p-editor-surface h6 {
  font-size: 0.875em;
  color: hsl(var(--pui-muted-foreground));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.p-editor-surface p {
  line-height: 1.6;
}

.p-editor-surface ul,
.p-editor-surface ol {
  padding-left: 1.5em;
}

.p-editor-surface ul {
  list-style: disc;
}

.p-editor-surface ol {
  list-style: decimal;
}

.p-editor-surface li {
  line-height: 1.6;
}

.p-editor-surface li > p {
  margin: 0;
}

.p-editor-surface li + li {
  margin-top: 0.25em;
}

.p-editor-surface li > ul,
.p-editor-surface li > ol {
  margin-top: 0.25em;
}

.p-editor-surface blockquote {
  padding: 0.25em 0 0.25em 0.875em;
  border-left: 3px solid hsl(var(--pui-border));
  color: hsl(var(--pui-muted-foreground));
  font-style: italic;
}

.p-editor-surface blockquote > * + * {
  margin-top: 0.5em;
}

.p-editor-surface pre {
  padding: 0.625em 0.875em;
  background-color: hsl(var(--pui-muted));
  border-radius: calc(var(--pui-radius) - 0.25rem);
  font-family: var(--pui-font-mono);
  font-size: 0.875em;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre;
}

.p-editor-surface pre code {
  background: none;
  padding: 0;
  font: inherit;
}

.p-editor-surface hr {
  height: 1px;
  margin: 0.5em 0;
  background-color: hsl(var(--pui-border));
  border: none;
}

.p-editor-surface a {
  color: hsl(var(--pui-primary));
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
