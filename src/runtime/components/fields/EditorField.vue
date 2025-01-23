<template>
  <div>
    <div class="relative flex w-full flex-col items-start gap-1">
      <div v-if="options.label || options.description" class="flex w-full items-end justify-between gap-4">
        <div
          v-if="options.label"
          :for="id"
          @click="editor.commands.focus()"
          @mouseenter="labelHovered = true"
          @mouseleave="labelHovered = false"
          class="flex cursor-default gap-1 whitespace-nowrap text-vs font-medium text-gray-900"
        >
          <span v-if="options.required" :title="__('pruvious-dashboard', 'Required')" class="text-red-500">*</span>
          <span>{{ __('pruvious-dashboard', options.label as any) }}</span>
        </div>

        <PruviousIconHelp
          v-if="options.description"
          v-pruvious-tooltip="__('pruvious-dashboard', options.description as any)"
          class="mb-0.5 h-4 w-4 shrink-0 text-gray-400"
        />
      </div>

      <div
        @click="toolbarStates.fullscreen.active && editor.commands.focus()"
        class="w-full bg-white font-sans text-sm leading-[1.42857142857] transition"
        :class="{
          'focus-within:border-primary-700 focus-within:ring hocus:border-primary-700':
            !disabled && !toolbarStates['fullscreen'].active,
          'border-primary-700': labelHovered && !disabled && !toolbarStates['fullscreen'].active,
          'scrollbar-thin fixed inset-0 z-40 overflow-y-auto': toolbarStates['fullscreen'].active,
          'rounded-md border': !toolbarStates['fullscreen'].active,
        }"
      >
        <div
          v-if="options.toolbar?.length || options.allowFullscreen"
          class="scrollbar-thin scrollbar-thin-bg sticky top-0 z-10 flex justify-between overflow-x-auto rounded-t-md bg-white"
          :class="{
            'sticky top-0 z-10 mx-auto max-w-4xl': toolbarStates['fullscreen'].active,
            'border-b': !toolbarStates['fullscreen'].active,
          }"
        >
          <div class="-mr-px flex shrink-0">
            <div
              v-for="item of options.toolbar"
              class="relative"
              :class="{
                'is-fullscreen mr-1 py-4': toolbarStates['fullscreen'].active,
                'border-r': !toolbarStates['fullscreen'].active,
              }"
            >
              <button
                v-if="
                  item === 'blockFormats' ||
                  item === 'blockquote' ||
                  item === 'bold' ||
                  item === 'bulletList' ||
                  item === 'center' ||
                  item === 'clear' ||
                  item === 'code' ||
                  item === 'codeBlock' ||
                  item === 'heading1' ||
                  item === 'heading2' ||
                  item === 'heading3' ||
                  item === 'heading4' ||
                  item === 'heading5' ||
                  item === 'heading6' ||
                  item === 'hardBreak' ||
                  item === 'highlight' ||
                  item === 'horizontalRule' ||
                  item === 'inlineFormats' ||
                  item === 'italic' ||
                  item === 'justify' ||
                  item === 'left' ||
                  item === 'link' ||
                  item === 'normalize' ||
                  item === 'orderedList' ||
                  item === 'paragraph' ||
                  item === 'redo' ||
                  item === 'right' ||
                  item === 'strike' ||
                  item === 'subscript' ||
                  item === 'superscript' ||
                  item === 'underline' ||
                  item === 'undo'
                "
                v-pruvious-tooltip="toolbarStates[item].disabled ? undefined : __('pruvious-dashboard', toolbarStates[item].tooltip as any)"
                :tabindex="toolbarStates[item].disabled ? -1 : 0"
                @click="
                  toolbarStates[item].disabled ? null : onClickToolbarButton(item, $event.target as HTMLButtonElement)
                "
                @mousedown.prevent.stop
                data-ignore-autofocus
                type="button"
                class="toolbar-button"
                :class="{
                  'toolbar-button-active': toolbarStates[item].active,
                  'toolbar-button-disabled': toolbarStates[item].disabled,
                  'toolbar-button-dropdown': item === 'blockFormats' || item === 'inlineFormats',
                }"
              >
                <PruviousIconPerspective v-if="item === 'blockFormats'" />
                <PruviousIconQuote v-if="item === 'blockquote'" />
                <PruviousIconBold v-if="item === 'bold'" />
                <PruviousIconList v-if="item === 'bulletList'" />
                <PruviousIconAlignCenter v-if="item === 'center'" />
                <PruviousIconClearFormatting v-if="item === 'clear'" />
                <PruviousIconCode v-if="item === 'code'" />
                <PruviousIconCodeDots v-if="item === 'codeBlock'" />
                <PruviousIconH2 v-if="item === 'heading2'" />
                <PruviousIconH3 v-if="item === 'heading3'" />
                <PruviousIconH4 v-if="item === 'heading4'" />
                <PruviousIconH1 v-if="item === 'heading1'" />
                <PruviousIconH5 v-if="item === 'heading5'" />
                <PruviousIconH6 v-if="item === 'heading6'" />
                <PruviousIconArrowBack v-if="item === 'hardBreak'" />
                <PruviousIconHighlight v-if="item === 'highlight'" />
                <PruviousIconSeparatorHorizontal v-if="item === 'horizontalRule'" />
                <PruviousIconPalette v-if="item === 'inlineFormats'" />
                <PruviousIconItalic v-if="item === 'italic'" />
                <PruviousIconAlignJustified v-if="item === 'justify'" />
                <PruviousIconAlignLeft v-if="item === 'left'" />
                <PruviousIconLink v-if="item === 'link'" />
                <PruviousIconListNumbers v-if="item === 'normalize'" />
                <PruviousIconListNumbers v-if="item === 'orderedList'" />
                <PruviousIconTypography v-if="item === 'paragraph'" />
                <PruviousIconArrowForwardUp v-if="item === 'redo'" />
                <PruviousIconAlignRight v-if="item === 'right'" />
                <PruviousIconUnderline v-if="item === 'underline'" />
                <PruviousIconStrikethrough v-if="item === 'strike'" />
                <PruviousIconSubscript v-if="item === 'subscript'" />
                <PruviousIconSuperscript v-if="item === 'superscript'" />
                <PruviousIconArrowBackUp v-if="item === 'undo'" />

                <span v-if="item === 'blockFormats' || item === 'inlineFormats'">
                  <PruviousIconChevronDown />
                </span>
              </button>
            </div>
          </div>

          <div
            class="sticky right-0"
            :class="{
              'py-4': toolbarStates['fullscreen'].active,
            }"
          >
            <button
              v-if="options.allowFullscreen"
              v-pruvious-tooltip="
                toolbarStates['fullscreen'].active
                  ? __('pruvious-dashboard', 'Exit full screen')
                  : __('pruvious-dashboard', 'Enter full screen')
              "
              @click="toolbarStates['fullscreen'].active = !toolbarStates['fullscreen'].active"
              @mousedown.prevent.stop
              data-ignore-autofocus
              type="button"
              class="toolbar-button"
              :class="{
                'bg-primary-50 text-primary-700': toolbarStates['fullscreen'].active,
                'border-l': !toolbarStates['fullscreen'].active,
              }"
            >
              <PruviousIconMinimize v-if="toolbarStates['fullscreen'].active" />
              <PruviousIconMaximize v-if="!toolbarStates['fullscreen'].active" />
            </button>
          </div>
        </div>

        <div
          @mousedown.prevent.stop
          ref="formatPopupEl"
          class="scrollbar-thin fixed left-0 top-full z-10 flex max-h-36 w-64 flex-col items-start gap-2 overflow-y-auto border bg-white p-2"
          :class="{
            'rounded-md': toolbarStates['fullscreen'].active,
            'pointer-events-none invisible opacity-0':
              !editor?.isFocused ||
              ((!blockFormatsPopupVisible || !filteredBlockFormats.length) &&
                (!inlineFormatsPopupVisible || !filteredInlineFormats.length)),
          }"
          :style="{
            top: `${formatPopupPosition.top}px`,
            left: `${formatPopupPosition.left}px`,
          }"
        >
          <template v-if="blockFormatsPopupVisible && editor?.isFocused">
            <component
              v-for="format of filteredBlockFormats"
              v-model="format.active"
              :is="CheckboxField"
              :options="{ label:format.label ? __('pruvious-dashboard', format.label as any) : format.className }"
              @click.prevent
              @mousedown="onClickFormatCheckbox(format, onBlockFormatChange)"
              @update:modelValue="onBlockFormatChange(format)"
            />
          </template>

          <template v-if="inlineFormatsPopupVisible && editor?.isFocused">
            <component
              v-for="format of filteredInlineFormats"
              v-model="format.active"
              :is="CheckboxField"
              :options="{ label:format.label ? __('pruvious-dashboard', format.label as any) : format.className }"
              @click.prevent
              @mousedown="onClickFormatCheckbox(format, onInlineFormatChange)"
              @update:modelValue="onInlineFormatChange(format)"
            />
          </template>
        </div>

        <div class="relative" :class="{ 'mx-auto max-w-4xl pb-4': toolbarStates['fullscreen'].active }">
          <div
            @click=";(blockFormatsPopupVisible = false), (inlineFormatsPopupVisible = false)"
            @keydown.escape="
              ;(toolbarStates['fullscreen'].active = false),
                (blockFormatsPopupVisible = false),
                (inlineFormatsPopupVisible = false)
            "
            ref="containerEl"
          ></div>

          <div
            v-if="hoverInfo"
            v-pruvious-tooltip="{ content: hoverInfo.content, showOnCreate: true }"
            class="absolute"
            :style="{
              left: `${hoverInfo.offset[0]}px`,
              top: `${hoverInfo.offset[1]}px`,
            }"
          ></div>
        </div>
      </div>

      <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
    </div>

    <PruviousPopup v-model:visible="linkPopupVisible" @hotkey="onLinkPopupHotkey" width="24rem">
      <template #header>
        <h2 class="truncate text-sm">
          {{ editingLink ? __('pruvious-dashboard', 'Edit link') : __('pruvious-dashboard', 'Add link') }}
        </h2>
      </template>

      <div class="flex flex-col gap-4 p-4">
        <component
          v-model="linkUrl"
          :errors="{ [`${id}.linkUrl`]: linkUrlError }"
          :fieldKey="`${id}.linkUrl`"
          :is="LinkField"
          :options="{ label: __('pruvious-dashboard', 'Hyperlink'), required: true }"
          :record="record"
          @update:modelValue="onLinkUrlChange()"
        />

        <component
          v-model="linkTargetSwitcher"
          :is="ButtonGroupField"
          :options="{
            label: __('pruvious-dashboard', 'Open in new tab'),
            choices: {
              _self: __('pruvious-dashboard', 'No'),
              _blank: __('pruvious-dashboard', 'Yes'),
              custom: __('pruvious-dashboard', 'Custom target'),
            },
          }"
          @update:modelValue="onLinkTargetSwitcherChange()"
        />

        <component
          v-show="linkTargetSwitcher === 'custom' && linkTarget !== null"
          :is="TextField"
          :modelValue="linkTarget ?? ''"
          :options="{ label: __('pruvious-dashboard', 'Target') }"
          @update:modelValue="linkTarget = $event"
        />

        <component
          v-model="linkRel"
          :is="TextField"
          :options="{
            label: __('pruvious-dashboard', 'Relationship (rel)'),
            description: __(
              'pruvious-dashboard',
              'The **rel** attribute specifies the relationship between the current document and the linked document.',
            ),
            placeholder: 'e.g., noopener noreferrer nofollow',
          }"
          :suggestions="onRelationshipSuggestions"
        />
      </div>

      <div class="flex gap-2 border-t p-4">
        <button v-if="editingLink" @click="removeLink()" type="button" class="button button-white">
          <span>{{ __('pruvious-dashboard', 'Remove') }}</span>
        </button>

        <div class="ml-auto flex gap-2">
          <button @click="closeLinkPopup()" type="button" class="button button-white">
            <span>{{ __('pruvious-dashboard', 'Cancel') }}</span>
          </button>

          <button @click="onLinkChange()" type="button" class="button">
            <span>{{ editingLink ? __('pruvious-dashboard', 'Update') : __('pruvious-dashboard', 'Add') }}</span>
          </button>
        </div>
      </div>
    </PruviousPopup>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from '#imports'
import { prefixPrimaryLanguage, primaryLanguage, type PublicPagesOptions, type StandardFieldOptions } from '#pruvious'
import {
  buttonGroupFieldComponent,
  checkboxFieldComponent,
  dashboardMiscComponent,
  linkFieldComponent,
  textFieldComponent,
} from '#pruvious/dashboard'
import { Editor, Extension, Mark, mergeAttributes, type Extensions } from '@tiptap/core'
import Blockquote from '@tiptap/extension-blockquote'
import Bold from '@tiptap/extension-bold'
import BulletList from '@tiptap/extension-bullet-list'
import Code from '@tiptap/extension-code'
import CodeBlock from '@tiptap/extension-code-block'
import Document from '@tiptap/extension-document'
import Dropcursor from '@tiptap/extension-dropcursor'
import HardBreak from '@tiptap/extension-hard-break'
import Heading from '@tiptap/extension-heading'
import Highlight from '@tiptap/extension-highlight'
import History from '@tiptap/extension-history'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Italic from '@tiptap/extension-italic'
import Link from '@tiptap/extension-link'
import ListItem from '@tiptap/extension-list-item'
import OrderedList from '@tiptap/extension-ordered-list'
import Paragraph from '@tiptap/extension-paragraph'
import Placeholder from '@tiptap/extension-placeholder'
import Strike from '@tiptap/extension-strike'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Text from '@tiptap/extension-text'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { debounce } from 'perfect-debounce'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import type { HotkeyAction } from '../../composables/dashboard/hotkeys'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { clearArray, searchByKeywords, uniqueArray } from '../../utils/array'
import { pruviousFetch } from '../../utils/fetch'
import { isUrl, isUrlPath, joinRouteParts, resolveCollectionPathPrefix } from '../../utils/string'

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: string

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['editor']

  /**
   * Represents the unique identifier of the field within the form.
   * If not provided, a unique identifier will be automatically generated.
   */
  fieldKey?: string

  /**
   * Represents a dictionary of all errors, where the key is the complete field name and the value is the associated error message.
   * The field name is represented in dot-notation (e.g., `repeater.0.subfieldName`).
   */
  errors?: Record<string, string>

  /**
   * Indicates whether the field is disabled.
   * By default, the field is enabled.
   */
  disabled?: boolean

  /**
   * The current collection record as a reactive key-value object, containing all field names and their values.
   */
  record?: Record<string, any>

  /**
   * When set to `true`, the field will won't autofocus in popups.
   */
  ignoreAutofocus?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [string]
}>()

let editor: Editor
let lastClickedToolbarButton: HTMLButtonElement | null = null

const dashboard = usePruviousDashboard()

const ButtonGroupField = buttonGroupFieldComponent()
const CheckboxField = checkboxFieldComponent()
const PruviousInputError = dashboardMiscComponent.InputError()
const PruviousPopup = dashboardMiscComponent.Popup()
const TextField = textFieldComponent()
const LinkField = linkFieldComponent()

const blockFormatsPopupVisible = ref<boolean>(false)
const containerEl = ref<HTMLElement>()
const editingLink = ref<boolean>(false)
const filteredBlockFormats = ref<{ className: string; label?: string; tags?: string[]; active: boolean }[]>([])
const filteredInlineFormats = ref<{ className: string; label?: string; active: boolean }[]>([])
const formatPopupEl = ref<HTMLElement>()
const formatPopupPosition = ref<{ top: number; left: number }>({ top: 0, left: 0 })
const hoverInfo = ref<{ content: string; offset: [number, number]; target: HTMLElement } | null>(null)
const hoverInfoCounter = ref<number>(0)
const id = pruviousUnique('editor-field')
const inlineFormatsPopupVisible = ref<boolean>(false)
const labelHovered = ref<boolean>(false)
const linkLinked = ref(false)
const linkPopupVisible = ref<boolean>(false)
const linkRel = ref('')
const linkTarget = ref<string | null>(null)
const linkTargetSwitcher = ref<'_self' | '_blank' | 'custom'>('_self')
const linkUrl = ref('')
const linkUrlError = ref('')
const toolbarStates = ref<
  Record<
    NonNullable<StandardFieldOptions['editor']['toolbar']>[number] | 'fullscreen',
    { active: boolean; disabled: boolean; tooltip: string }
  >
>({
  blockFormats: { active: false, disabled: false, tooltip: 'Block formats' },
  blockquote: { active: false, disabled: false, tooltip: 'Blockquote' },
  bold: { active: false, disabled: false, tooltip: 'Bold' },
  bulletList: { active: false, disabled: false, tooltip: 'Bullet list' },
  center: { active: false, disabled: false, tooltip: 'Center' },
  clear: { active: false, disabled: false, tooltip: 'Clear formatting' },
  code: { active: false, disabled: false, tooltip: 'Code' },
  codeBlock: { active: false, disabled: false, tooltip: 'Code block' },
  fullscreen: { active: false, disabled: false, tooltip: 'Full screen' },
  heading1: { active: false, disabled: false, tooltip: 'Heading 1' },
  heading2: { active: false, disabled: false, tooltip: 'Heading 2' },
  heading3: { active: false, disabled: false, tooltip: 'Heading 3' },
  heading4: { active: false, disabled: false, tooltip: 'Heading 4' },
  heading5: { active: false, disabled: false, tooltip: 'Heading 5' },
  heading6: { active: false, disabled: false, tooltip: 'Heading 6' },
  hardBreak: { active: false, disabled: false, tooltip: 'Hard break' },
  highlight: { active: false, disabled: false, tooltip: 'Highlight' },
  horizontalRule: { active: false, disabled: false, tooltip: 'Horizontal rule' },
  inlineFormats: { active: false, disabled: false, tooltip: 'Inline formats' },
  italic: { active: false, disabled: false, tooltip: 'Italic' },
  justify: { active: false, disabled: false, tooltip: 'Justify' },
  left: { active: false, disabled: false, tooltip: 'Align left' },
  link: { active: false, disabled: false, tooltip: 'Link' },
  normalize: { active: false, disabled: false, tooltip: 'Normalize text' },
  orderedList: { active: false, disabled: false, tooltip: 'Ordered list' },
  paragraph: { active: false, disabled: false, tooltip: 'Paragraph' },
  redo: { active: false, disabled: false, tooltip: 'Redo' },
  right: { active: false, disabled: false, tooltip: 'Align right' },
  strike: { active: false, disabled: false, tooltip: 'Strikethrough' },
  subscript: { active: false, disabled: false, tooltip: 'Subscript' },
  superscript: { active: false, disabled: false, tooltip: 'Superscript' },
  underline: { active: false, disabled: false, tooltip: 'Underline' },
  undo: { active: false, disabled: false, tooltip: 'Undo' },
})

const Hover = Extension.create({
  name: 'hover',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('hover'),
        props: {
          handleDOMEvents: {
            mouseover(_, event) {
              const target = event.target as HTMLElement
              const fr = target.getAttribute('_fr--')

              if (target.nodeName === 'A') {
                const link = target.getAttribute('href')
                const match = link ? link.match(/^([a-z0-9-]+):([1-9][0-9]*?)([#\?].*)?$/) : null

                if (link && match) {
                  const counter = ++hoverInfoCounter.value
                  const c = Object.values(dashboard.value.collections)
                    .filter((c) => c.publicPages)
                    .find((c) => c.name === match[1])

                  if (c) {
                    const pathField = (c.publicPages as PublicPagesOptions).pathField ?? 'path'

                    pruviousFetch<Record<string, any>>(`collections/${c.name}/${match[2]}`, {
                      query: { select: uniqueArray(['id', 'language', pathField]).filter(Boolean).join(',') },
                      dispatchEvents: false,
                    }).then((response) => {
                      if (response.success && hoverInfoCounter.value === counter) {
                        const path = joinRouteParts(
                          response.data.language === primaryLanguage && !prefixPrimaryLanguage
                            ? ''
                            : response.data.language,
                          resolveCollectionPathPrefix(c, response.data.language, primaryLanguage),
                          response.data[pathField],
                        )

                        hoverInfo.value = {
                          content: `<span class="break-all">${path}</span>`,
                          offset: [target.offsetLeft + target.offsetWidth / 2, target.offsetTop],
                          target,
                        }
                      } else {
                        hoverInfo.value = {
                          content: '!!' + __('pruvious-dashboard', 'Invalid link') + '!!',
                          offset: [target.offsetLeft + target.offsetWidth / 2, target.offsetTop],
                          target,
                        }
                      }
                    })
                  } else {
                    hoverInfo.value = {
                      content: '!!' + __('pruvious-dashboard', 'Invalid link') + '!!',
                      offset: [target.offsetLeft + target.offsetWidth / 2, target.offsetTop],
                      target,
                    }
                  }
                } else if (link) {
                  hoverInfo.value = {
                    content: `<span class="break-all">${link}</span>`,
                    offset: [target.offsetLeft + target.offsetWidth / 2, target.offsetTop],
                    target,
                  }
                }
              } else if (fr) {
                hoverInfo.value = {
                  content: fr,
                  offset: [target.offsetLeft + target.offsetWidth / 2, target.offsetTop],
                  target,
                }
              }
            },
            mouseout(_, event) {
              if (hoverInfo.value?.target === event.target) {
                hoverInfo.value = null
              }
            },
          },
        },
      }),
    ]
  },
})

const SpanClass = Mark.create({
  name: 'spanClass',
  addOptions() {
    return {
      HTMLAttributes: {
        '_fr--': null,
      },
    }
  },
  addAttributes() {
    return {
      '_fr--': {
        default: this.options.HTMLAttributes['_fr--'],
      },
    }
  },
  parseHTML() {
    return [{ tag: 'span[_fr--]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
  addCommands(): any {
    return {
      setSpanClass:
        (className: string) =>
        ({ chain }: any) => {
          return chain().setMark(this.name, { '_fr--': className }).run()
        },
      unsetSpanClass:
        () =>
        ({ chain }: any) => {
          return chain().unsetMark(this.name).run()
        },
    }
  },
})

const CustomLink = Link.extend({
  addOptions() {
    return {
      openOnClick: false,
      linkOnPaste: false,
      autolink: false,
      protocols: [],
      HTMLAttributes: {
        target: null,
        rel: null,
        class: null,
      },
      validate: undefined,
    }
  },
  addAttributes() {
    return {
      href: { default: null },
      target: { default: this.options.HTMLAttributes['target'] },
      rel: { default: this.options.HTMLAttributes['rel'] },
      class: { default: this.options.HTMLAttributes['class'] },
    }
  },
})

onMounted(() => {
  const extensions: Extensions = []
  const nodeTypes: string[] = ['paragraph']

  props.options.toolbar?.forEach((item) => {
    if (item === 'blockquote') {
      if (!nodeTypes.includes('blockquote')) {
        const classExtension = getClassExtensions()

        extensions.push(
          Blockquote.extend({
            addAttributes() {
              return classExtension
            },
          }),
        )
      }
      nodeTypes.push('blockquote')
    } else if (item === 'bold') {
      extensions.push(Bold)
    } else if (item === 'bulletList') {
      if (!nodeTypes.includes('bulletList')) {
        const classExtension = getClassExtensions()

        extensions.push(
          BulletList.extend({
            addAttributes() {
              return classExtension
            },
          }),
        )
      }

      if (!nodeTypes.includes('listItem')) {
        const classExtension = getClassExtensions()

        extensions.push(
          ListItem.extend({
            addAttributes() {
              return classExtension
            },
          }),
        )
      }

      nodeTypes.push('bulletList', 'listItem')
    } else if (item === 'code') {
      extensions.push(Code)
    } else if (item === 'codeBlock') {
      if (!nodeTypes.includes('codeBlock')) {
        const classExtension = getClassExtensions()

        extensions.push(
          CodeBlock.extend({
            addAttributes() {
              return {
                language: {
                  default: null,
                  parseHTML: (element) => {
                    const { languageClassPrefix } = this.options
                    const classNames = [...((element as any).firstElementChild?.classList || [])]
                    const languages = classNames
                      .filter((className) => className.startsWith(languageClassPrefix))
                      .map((className) => className.replace(languageClassPrefix, ''))
                    const language = languages[0]

                    if (!language) {
                      return null
                    }

                    return language
                  },
                  rendered: false,
                },
                ...classExtension,
              }
            },
          }),
        )
      }

      nodeTypes.push('codeBlock')
    } else if (
      item === 'heading1' ||
      item === 'heading2' ||
      item === 'heading3' ||
      item === 'heading4' ||
      item === 'heading5' ||
      item === 'heading6'
    ) {
      if (!nodeTypes.includes('heading')) {
        const classExtension = getClassExtensions()

        extensions.push(
          Heading.extend({
            addAttributes() {
              return {
                level: {
                  default: 1,
                  rendered: false,
                },
                ...classExtension,
              }
            },
          }),
        )

        nodeTypes.push('heading')
      }
    } else if (item === 'highlight') {
      extensions.push(Highlight)
    } else if (item === 'horizontalRule') {
      extensions.push(HorizontalRule)
    } else if (item === 'italic') {
      extensions.push(Italic)
    } else if (item === 'link') {
      extensions.push(CustomLink)
    } else if (item === 'orderedList') {
      if (!nodeTypes.includes('orderedList')) {
        const classExtension = getClassExtensions()

        extensions.push(
          OrderedList.extend({
            addAttributes() {
              return {
                start: {
                  default: 1,
                  parseHTML: (element) => {
                    return element.hasAttribute('start') ? parseInt(element.getAttribute('start') || '', 10) : 1
                  },
                },
                ...classExtension,
              }
            },
          }),
        )
      }

      if (!nodeTypes.includes('listItem')) {
        const classExtension = getClassExtensions()

        extensions.push(
          ListItem.extend({
            addAttributes() {
              return classExtension
            },
          }),
        )
      }

      nodeTypes.push('orderedList', 'listItem')
    } else if (item === 'strike') {
      extensions.push(Strike)
    } else if (item === 'subscript') {
      extensions.push(Subscript)
    } else if (item === 'superscript') {
      extensions.push(Superscript)
    } else if (item === 'underline') {
      extensions.push(Underline)
    }
  })

  if (
    props.options.toolbar?.some((item) => {
      return item === 'center' || item === 'justify' || item === 'left' || item === 'right'
    })
  ) {
    extensions.push(TextAlign.configure({ types: uniqueArray(nodeTypes) }))
  }

  const paragraphClassExtension = getClassExtensions()

  extensions.push(
    Document,
    Dropcursor,
    HardBreak,
    History,
    Hover,
    Paragraph.extend({
      addAttributes() {
        return paragraphClassExtension
      },
    }),
    Placeholder.configure({ placeholder: props.options.placeholder }),
    SpanClass,
    Text,
    TextStyle,
  )

  editor = new Editor({
    element: containerEl.value,
    extensions: uniqueArray(extensions),
    content: props.modelValue,
    editable: !props.disabled,
  })

  editor.on('blur', () => {
    updateStates()
    blockFormatsPopupVisible.value = false
    inlineFormatsPopupVisible.value = false
    emit('update:modelValue', editor!.getHTML())
  })

  editor.on('focus', () => updateStates())
  editor.on('selectionUpdate', () => updateStates())
  editor.on('transaction', () => updateStates())

  editor.on('update', () => {
    emit('update:modelValue', editor!.getHTML())
  })
})

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.modelValue,
  (value) => {
    if (editor && value !== editor?.getHTML()) {
      editor!.commands.setContent(value)
    }
  },
)

watch(
  () => props.disabled,
  (value) => {
    if (editor) {
      editor!.setOptions({ editable: !value })
      updateStates()
    }
  },
)

watch(
  () => blockFormatsPopupVisible.value || inlineFormatsPopupVisible.value,
  () => {
    let scrollParent = formatPopupEl.value!.parentElement

    while (scrollParent && scrollParent.nodeName !== 'BODY') {
      if (scrollParent.classList.contains('scrollbar-thin')) {
        break
      }

      scrollParent = scrollParent.parentElement
    }

    if (scrollParent) {
      if (blockFormatsPopupVisible.value || inlineFormatsPopupVisible.value) {
        scrollParent.addEventListener('scroll', onScrollOrResize)
        scrollParent.addEventListener('resize', onScrollOrResize)
        onScrollOrResize()
      } else {
        scrollParent.removeEventListener('scroll', onScrollOrResize)
        scrollParent.removeEventListener('resize', onScrollOrResize)
      }
    }
  },
)

function onScrollOrResize() {
  const rect = lastClickedToolbarButton?.getBoundingClientRect()

  formatPopupPosition.value.top = rect ? rect.top + rect.height : 0
  formatPopupPosition.value.left = rect ? rect.left - 1 : 0

  if (formatPopupPosition.value.left + formatPopupEl.value!.offsetWidth > window.innerWidth - 16) {
    formatPopupPosition.value.left -=
      formatPopupPosition.value.left + formatPopupEl.value!.offsetWidth - window.innerWidth + 16
  }
}

function onClickToolbarButton(
  name:
    | 'blockFormats'
    | 'blockquote'
    | 'bold'
    | 'bulletList'
    | 'center'
    | 'clear'
    | 'code'
    | 'codeBlock'
    | 'heading1'
    | 'heading2'
    | 'heading3'
    | 'heading4'
    | 'heading5'
    | 'heading6'
    | 'hardBreak'
    | 'highlight'
    | 'horizontalRule'
    | 'inlineFormats'
    | 'italic'
    | 'justify'
    | 'left'
    | 'link'
    | 'normalize'
    | 'orderedList'
    | 'paragraph'
    | 'redo'
    | 'right'
    | 'strike'
    | 'subscript'
    | 'superscript'
    | 'underline'
    | 'undo',
  button?: HTMLButtonElement,
) {
  if (button) {
    while (button.nodeName !== 'BUTTON') {
      button = button.parentElement as HTMLButtonElement
    }
  }

  lastClickedToolbarButton = button as HTMLButtonElement

  if (name === 'blockFormats' || name === 'inlineFormats') {
    if (name === 'blockFormats') {
      inlineFormatsPopupVisible.value = false
    } else {
      blockFormatsPopupVisible.value = false
    }
  } else {
    inlineFormatsPopupVisible.value = false
    blockFormatsPopupVisible.value = false
  }

  if (name === 'blockFormats' || name === 'inlineFormats') {
    if (name === 'blockFormats') {
      inlineFormatsPopupVisible.value = false
      blockFormatsPopupVisible.value = !blockFormatsPopupVisible.value
    } else {
      blockFormatsPopupVisible.value = false
      inlineFormatsPopupVisible.value = !inlineFormatsPopupVisible.value
    }
  } else if (name === 'blockquote') {
    editor?.commands.toggleBlockquote()
  } else if (name === 'bulletList') {
    editor?.commands.toggleBulletList()
  } else if (name === 'center') {
    editor?.commands.setTextAlign('center')
  } else if (name === 'clear') {
    editor?.commands.unsetAllMarks()
    removeBlockFormats()
  } else if (name === 'codeBlock') {
    editor?.commands.toggleCodeBlock()
  } else if (
    name === 'heading1' ||
    name === 'heading2' ||
    name === 'heading3' ||
    name === 'heading4' ||
    name === 'heading5' ||
    name === 'heading6'
  ) {
    editor?.commands.toggleHeading({ level: +name.replace(/[^0-9]/g, '') as any })
  } else if (name === 'hardBreak') {
    editor?.commands.setHardBreak()
  } else if (name === 'horizontalRule') {
    editor?.commands.setHorizontalRule()
  } else if (name === 'justify') {
    editor?.commands.setTextAlign('justify')
  } else if (name === 'left') {
    editor?.commands.setTextAlign('left')
  } else if (name === 'link') {
    openLinkPopup()
  } else if (name === 'normalize') {
    editor?.chain().clearNodes().unsetAllMarks().run()
  } else if (name === 'orderedList') {
    editor?.commands.toggleOrderedList()
  } else if (name === 'paragraph') {
    editor?.commands.setParagraph()
  } else if (name === 'redo') {
    editor?.commands.redo()
  } else if (name === 'right') {
    editor?.commands.setTextAlign('right')
  } else if (name === 'subscript') {
    editor?.chain().unsetMark('superscript').setMark('subscript').run()
  } else if (name === 'superscript') {
    editor?.chain().unsetMark('subscript').setMark('superscript').run()
  } else if (name === 'undo') {
    editor?.commands.undo()
  } else {
    editor?.commands.toggleMark(name)
  }
}

const updateStates = debounce(() => {
  const e = editor
  const f = !!e?.isFocused && !props.disabled
  const path = getSelectionPath()
  const textStyle = e?.getAttributes('spanClass')
  const textStyleClasses: string[] = textStyle && textStyle['_fr--'] ? textStyle['_fr--'].split(' ') : []

  clearArray(filteredBlockFormats.value).push(
    ...(props.options.blockFormats ?? [])
      .filter((format) => {
        return (
          !format.tags || format.tags.includes('*') || format.tags.some((tag) => path.some((node) => node.tag === tag))
        )
      })
      .map((format) => ({
        className: format.className,
        label: format.label,
        tags: format.tags,
        active: path.some((node) =>
          format.className
            .split(' ')
            .map((c) => c.trim())
            .filter(Boolean)
            .every((c) => node.classes.includes(c)),
        ),
      })),
  )

  clearArray(filteredInlineFormats.value).push(
    ...(props.options.inlineFormats ?? []).map((format) => ({
      className: format.className,
      label: format.label,
      active: format.className
        .split(' ')
        .map((c) => c.trim())
        .filter(Boolean)
        .every((c) => textStyleClasses.includes(c)),
    })),
  )

  toolbarStates.value.blockFormats.active = f && filteredBlockFormats.value.some((f) => f.active)
  toolbarStates.value.blockquote.active = f && !!e?.isActive('blockquote')
  toolbarStates.value.bold.active = f && !!e?.isActive('bold')
  toolbarStates.value.bulletList.active = f && !!e?.isActive('bulletList')
  toolbarStates.value.center.active = f && !!e?.isActive({ textAlign: 'center' })
  toolbarStates.value.code.active = f && !!e?.isActive('code')
  toolbarStates.value.codeBlock.active = f && !!e?.isActive('codeBlock')
  toolbarStates.value.hardBreak.active = f && !!e?.isActive('hardBreak')
  toolbarStates.value.highlight.active = f && !!e?.isActive('highlight')
  toolbarStates.value.heading1.active = f && !!e?.isActive('heading', { level: 1 })
  toolbarStates.value.heading2.active = f && !!e?.isActive('heading', { level: 2 })
  toolbarStates.value.heading3.active = f && !!e?.isActive('heading', { level: 3 })
  toolbarStates.value.heading4.active = f && !!e?.isActive('heading', { level: 4 })
  toolbarStates.value.heading5.active = f && !!e?.isActive('heading', { level: 5 })
  toolbarStates.value.heading6.active = f && !!e?.isActive('heading', { level: 6 })
  toolbarStates.value.horizontalRule.active = f && !!e?.isActive('horizontalRule')
  toolbarStates.value.italic.active = f && !!e?.isActive('italic')
  toolbarStates.value.inlineFormats.active = f && filteredInlineFormats.value.some((f) => f.active)
  toolbarStates.value.justify.active = f && !!e?.isActive({ textAlign: 'justify' })
  toolbarStates.value.left.active = f && !!e?.isActive({ textAlign: 'left' })
  toolbarStates.value.link.active = f && !!e?.isActive('link')
  toolbarStates.value.orderedList.active = f && !!e?.isActive('orderedList')
  toolbarStates.value.paragraph.active = f && !!e?.isActive('paragraph')
  toolbarStates.value.right.active = f && !!e?.isActive({ textAlign: 'right' })
  toolbarStates.value.strike.active = f && !!e?.isActive('strike')
  toolbarStates.value.subscript.active = f && !!e?.isActive('subscript')
  toolbarStates.value.superscript.active = f && !!e?.isActive('superscript')
  toolbarStates.value.underline.active = f && !!e?.isActive('underline')

  toolbarStates.value.blockFormats.disabled = !f || !filteredBlockFormats.value.length
  toolbarStates.value.blockquote.disabled = !f || !e?.can().toggleBlockquote?.call(null)
  toolbarStates.value.bold.disabled = !f || !e?.can().toggleBold?.call(null)
  toolbarStates.value.bulletList.disabled = !f || !e?.can().toggleBulletList?.call(null)
  toolbarStates.value.center.disabled = !f || !e?.can().setTextAlign?.call(null, 'center')
  toolbarStates.value.clear.disabled = !f
  toolbarStates.value.code.disabled = !f || !e?.can().toggleCode?.call(null)
  toolbarStates.value.codeBlock.disabled = !f || !e?.can().toggleCodeBlock?.call(null)
  toolbarStates.value.hardBreak.disabled = !f || !e?.can().setHardBreak?.call(null)
  toolbarStates.value.highlight.disabled = !f || !e?.can().setHighlight?.call(null)
  toolbarStates.value.heading1.disabled = !f || !e?.can().toggleHeading?.call(null, { level: 1 })
  toolbarStates.value.heading2.disabled = !f || !e?.can().toggleHeading?.call(null, { level: 2 })
  toolbarStates.value.heading3.disabled = !f || !e?.can().toggleHeading?.call(null, { level: 3 })
  toolbarStates.value.heading4.disabled = !f || !e?.can().toggleHeading?.call(null, { level: 4 })
  toolbarStates.value.heading5.disabled = !f || !e?.can().toggleHeading?.call(null, { level: 5 })
  toolbarStates.value.heading6.disabled = !f || !e?.can().toggleHeading?.call(null, { level: 6 })
  toolbarStates.value.horizontalRule.disabled = !f || !e?.can().setHorizontalRule?.call(null)
  toolbarStates.value.italic.disabled = !f || !e?.can().toggleItalic?.call(null)
  toolbarStates.value.inlineFormats.disabled = !f || !filteredInlineFormats.value.length
  toolbarStates.value.justify.disabled = !f || !e?.can().setTextAlign?.call(null, 'justify')
  toolbarStates.value.left.disabled = !f || !e?.can().setTextAlign?.call(null, 'left')
  toolbarStates.value.link.disabled = !f || !e?.can().toggleLink?.call(null, { href: '' })
  toolbarStates.value.normalize.disabled = !f
  toolbarStates.value.orderedList.disabled = !f || !e?.can().toggleOrderedList?.call(null)
  toolbarStates.value.paragraph.disabled = !f || !e?.can().setParagraph?.call(null)
  toolbarStates.value.redo.disabled = !f || !e?.can().redo?.call(null)
  toolbarStates.value.right.disabled = !f || !e?.can().setTextAlign?.call(null, 'right')
  toolbarStates.value.strike.disabled = !f || !e?.can().toggleStrike?.call(null)
  toolbarStates.value.subscript.disabled = !f || !e?.can().toggleSubscript?.call(null)
  toolbarStates.value.superscript.disabled = !f || !e?.can().toggleSuperscript?.call(null)
  toolbarStates.value.underline.disabled = !f || !e?.can().toggleUnderline?.call(null)
  toolbarStates.value.undo.disabled = !f || !e?.can().undo?.call(null)
}, 50)

function onBlockFormatChange(format: { className: string; label?: string; tags?: string[]; active: boolean }) {
  const classes = format.className
    .split(' ')
    .map((c) => c.trim())
    .filter(Boolean)

  for (const node of getSelectionPath()) {
    if (!format.tags || format.tags.includes('*') || format.tags.includes(node.tag)) {
      if (format.active) {
        node.classes = uniqueArray([...node.classes, ...classes])
      } else {
        for (const c of classes) {
          const index = node.classes.indexOf(c)

          if (index > -1) {
            node.classes.splice(index, 1)
          }
        }
      }

      editor?.commands.updateAttributes(node.name, {
        '_fr--': node.classes.sort().join(' '),
      })
    }
  }
}

function onInlineFormatChange(format: { className: string; label?: string; active: boolean }) {
  const textStyle = editor?.getAttributes('spanClass')
  const textStyleClasses: string[] = textStyle && textStyle['_fr--'] ? textStyle['_fr--'].split(' ') : []
  const classes = format.className
    .split(' ')
    .map((c) => c.trim())
    .filter(Boolean)

  if (format.active) {
    textStyleClasses.splice(0, textStyleClasses.length, ...uniqueArray([...textStyleClasses, ...classes]))
  } else {
    for (const c of classes) {
      const index = textStyleClasses.indexOf(c)

      if (index > -1) {
        textStyleClasses.splice(index, 1)
      }
    }
  }

  if (textStyleClasses.length) {
    ;(editor?.commands as any).setSpanClass(textStyleClasses.sort().join(' '))
  } else {
    ;(editor?.commands as any).unsetSpanClass()
  }
}

function removeBlockFormats() {
  getSelectionPath().forEach((node) => {
    editor?.commands.updateAttributes(node.name, { '_fr--': '' })
  })
}

function getSelectionPath(): { tag: string; name: string; classes: string[] }[] {
  return (
    (editor?.state.selection.$anchor as any).path
      .filter((node: any) => {
        return typeof node === 'object' && node.type.name !== 'doc'
      })
      .map((node: any) => ({
        tag:
          node.type.name === 'paragraph'
            ? 'p'
            : node.type.name === 'heading'
            ? `h${node.attrs.level}`
            : node.type.name === 'bulletList'
            ? 'ul'
            : node.type.name === 'orderedList'
            ? 'ol'
            : node.type.name === 'listItem'
            ? 'li'
            : node.type.name === 'codeBlock'
            ? 'pre'
            : node.type.name,
        name: node.type.name,
        classes: node.attrs['_fr--']?.split(' ').filter(Boolean) ?? [],
      }))
      .reverse() ?? []
  )
}

function getClassExtensions() {
  return {
    '_fr--': {
      default: '',
      renderHTML: (attributes: any) => {
        return attributes['_fr--'] ? { '_fr--': attributes['_fr--'] } : {}
      },
    },
  }
}

function onClickFormatCheckbox(format: any, method: any) {
  format.active = !format.active
  method.call(null, format)
}

function onLinkUrlChange() {
  linkLinked.value = /^\$[1-9][0-9]*$/.test(linkUrl.value)
}

function onLinkTargetSwitcherChange() {
  linkTarget.value = linkTargetSwitcher.value === '_self' ? null : linkTargetSwitcher.value === '_blank' ? '_blank' : ''
}

function onLinkChange() {
  const trimmedUrl = linkUrl.value.trim()
  const path = trimmedUrl.split('#')[0].split('?')[0]

  if (!trimmedUrl) {
    linkUrlError.value = __('pruvious-dashboard', 'This field is required')
  } else if (!isUrl(path) && !isUrlPath(path, true) && !path.startsWith('#')) {
    linkUrlError.value = trimmedUrl.startsWith('http')
      ? __('pruvious-dashboard', 'Invalid URL')
      : __('pruvious-dashboard', 'Invalid URL path')
  } else {
    linkUrlError.value = ''
  }

  if (!linkUrlError.value) {
    linkPopupVisible.value = false

    if (trimmedUrl) {
      editor
        ?.chain()
        .focus()
        .extendMarkRange('link')
        .setLink({
          href: trimmedUrl,
          target: linkTarget.value?.trim() ?? null,
          rel:
            linkRel.value
              .split(' ')
              .map((v) => v.trim())
              .filter(Boolean)
              .join(' ') || null,
        } as any)
        .run()
    } else {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run()
    }
  }
}

function removeLink() {
  linkPopupVisible.value = false
  editor?.chain().focus().unsetLink().run()
}

function openLinkPopup() {
  const attrs = editor?.getAttributes('link') ?? {}
  linkPopupVisible.value = true
  editingLink.value = !!editor?.isActive('link')
  linkUrlError.value = ''
  linkUrl.value = attrs['href'] ?? ''
  linkTarget.value = attrs['target'] ?? null
  linkRel.value = attrs['rel'] ?? ''
  linkTargetSwitcher.value = !linkTarget.value ? '_self' : linkTarget.value === '_blank' ? '_blank' : 'custom'
  onLinkUrlChange()
}

function onLinkPopupHotkey(action: HotkeyAction) {
  if (action === 'close') {
    closeLinkPopup()
  } else if (action === 'save') {
    onLinkChange()
  }
}

function closeLinkPopup() {
  linkPopupVisible.value = false
  editor?.commands.focus()
}

function onRelationshipSuggestions(keywords: string) {
  return searchByKeywords(
    ['noopener', 'noreferrer', 'nofollow', 'noopener noreferrer', 'noopener noreferrer nofollow'],
    keywords,
  ).map((value) => ({ value, label: value }))
}

onBeforeUnmount(() => {
  editor?.destroy()
})
</script>
