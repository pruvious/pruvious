import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { EditorToolbarItem } from '@pruvious/shared'
import { Debounce, clearArray, isUrl, isUrlPath, uniqueArray } from '@pruvious/utils'
import { Editor, Extension, Extensions, Mark, mergeAttributes } from '@tiptap/core'
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
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ClickService } from 'src/app/services/click.service'
import { IdService } from 'src/app/services/id.service'

const Hover = Extension.create({
  name: 'hover',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('hover'),
        props: {
          handleDOMEvents: {
            mouseover(_, event) {
              // @todo preview active formats and links with event.target (don't change the event.target becaue it will loop)
            },
            mouseout(_, event) {
              // @todo preview active formats and links with event.target (don't change the event.target becaue it will loop)
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
        _append: null,
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
      _append: { default: this.options.HTMLAttributes['_append'] },
    }
  },
})

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css'],
})
export class EditorComponent extends BaseComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input()
  value: string = ''

  @Output()
  valueChange: EventEmitter<string> = new EventEmitter()

  @Output()
  edited: EventEmitter<string> = new EventEmitter()

  @Input()
  label: string = ''

  @Input()
  description: string = ''

  @Input()
  toolbar: EditorToolbarItem[] = ['bold', 'italic', 'underline']

  @Input()
  blockFormats: { className: string; label?: string; tags?: string[] }[] = []

  filteredBlockFormats: { className: string; label?: string; tags?: string[]; active: boolean }[] =
    []

  blockFormatsPopupVisible: boolean = false

  @Input()
  inlineFormats: { className: string; label?: string }[] = []

  filteredInlineFormats: { className: string; label?: string; active: boolean }[] = []

  inlineFormatsPopupVisible: boolean = false

  @Input()
  allowFullscreen: boolean = true

  @Input()
  placeholder: string = ''

  @Input()
  required: boolean = false

  @Input()
  disabled: boolean = false

  @Input()
  error: string | null = null

  @Input()
  key: string = ''

  @ViewChild('wrapper')
  wrapperEl!: ElementRef<HTMLDivElement>

  @ViewChild('container')
  containerEl!: ElementRef<HTMLDivElement>

  @ViewChild('formatPopup')
  formatPopupEl!: ElementRef<HTMLDivElement>

  formatPopupPosition: { top: number; left: number } = { top: 0, left: 0 }

  labelHovered: boolean = false

  toolbarStates: Record<
    EditorToolbarItem,
    { active: boolean; disabled: boolean; tooltip: string }
  > = {
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
  }

  protected editor?: Editor

  linkPopupVisible: boolean = false

  editingLink: boolean = false

  linkUrl: string = ''

  linkTarget: string | null = null

  linkTargetSwitcher: '_self' | '_blank' | 'custom' = '_self'

  linkAppend: string = ''

  linkLinked: boolean = false

  linkUrlError: string = ''

  id: string = this.idService.generate()

  constructor(
    protected click: ClickService,
    protected idService: IdService,
    protected sanitizer: DomSanitizer,
  ) {
    super()
  }

  ngAfterViewInit(): void {
    const extensions: Extensions = []
    const nodeTypes: string[] = ['paragraph']

    this.toolbar.forEach((item) => {
      if (item === 'blockquote') {
        if (!nodeTypes.includes('blockquote')) {
          const classExtension = this.getClassExtensions()

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
          const classExtension = this.getClassExtensions()

          extensions.push(
            BulletList.extend({
              addAttributes() {
                return classExtension
              },
            }),
          )
        }

        if (!nodeTypes.includes('listItem')) {
          const classExtension = this.getClassExtensions()

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
          const classExtension = this.getClassExtensions()

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
          const classExtension = this.getClassExtensions()

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
          const classExtension = this.getClassExtensions()

          extensions.push(
            OrderedList.extend({
              addAttributes() {
                return {
                  start: {
                    default: 1,
                    parseHTML: (element) => {
                      return element.hasAttribute('start')
                        ? parseInt(element.getAttribute('start') || '', 10)
                        : 1
                    },
                  },
                  ...classExtension,
                }
              },
            }),
          )
        }

        if (!nodeTypes.includes('listItem')) {
          const classExtension = this.getClassExtensions()

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
      this.toolbar.some((item) => {
        return item === 'center' || item === 'justify' || item === 'left' || item === 'right'
      })
    ) {
      extensions.push(TextAlign.configure({ types: uniqueArray(nodeTypes) }))
    }

    const paragraphClassExtension = this.getClassExtensions()

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
      Placeholder.configure({ placeholder: this.placeholder }),
      SpanClass,
      Text,
      TextStyle,
    )

    this.editor = new Editor({
      element: this.containerEl.nativeElement,
      extensions: uniqueArray(extensions),
      content: this.value,
      editable: !this.disabled,
    })

    this.editor.on('blur', () => {
      this.updateStates()
      this.blockFormatsPopupVisible = false
      this.inlineFormatsPopupVisible = false
      this.edited.emit(this.value)
    })

    this.editor.on('focus', () => this.updateStates())
    this.editor.on('selectionUpdate', () => this.updateStates())
    this.editor.on('transaction', () => this.updateStates())

    this.editor.on('update', () => {
      this.value = this.editor!.getHTML()
      this.valueChange.emit(this.value)
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !changes['value'].firstChange && this.editor) {
      if (this.value !== this.editor.getHTML()) {
        this.editor.commands.setContent(this.value)
      }
    }

    if (
      changes['disabled'] &&
      changes['disabled'].previousValue !== changes['disabled'].currentValue
    ) {
      this.editor?.setOptions({ editable: !this.disabled })
      this.updateStates()
    }
  }

  onClickLabel(): void {
    this.editor?.commands.focus()
  }

  onClickToolbarButton(
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
  ): void {
    if (name === 'blockFormats' || name === 'inlineFormats') {
      if (name === 'blockFormats') {
        this.inlineFormatsPopupVisible = false
      } else {
        this.blockFormatsPopupVisible = false
      }
    } else {
      this.inlineFormatsPopupVisible = false
      this.blockFormatsPopupVisible = false
    }

    if (name === 'blockFormats' || name === 'inlineFormats') {
      const rect = button?.getBoundingClientRect()

      if (name === 'blockFormats') {
        this.inlineFormatsPopupVisible = false
      } else {
        this.blockFormatsPopupVisible = false
      }

      this[`${name}PopupVisible`] = !this[`${name}PopupVisible`]
      this.formatPopupPosition.top = rect ? rect.top + rect.height : 0
      this.formatPopupPosition.left = rect ? rect.left - 1 : 0

      if (
        this.formatPopupPosition.left + this.formatPopupEl.nativeElement.offsetWidth >
        window.innerWidth - 16
      ) {
        this.formatPopupPosition.left -=
          this.formatPopupPosition.left +
          this.formatPopupEl.nativeElement.offsetWidth -
          window.innerWidth +
          16
      }

      if (button) {
        setTimeout(() => {
          this.click
            .outside(`editor-${name}`, button)
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe(() => {
              this[`${name}PopupVisible`] = false
              this.click.remove(`editor-${name}`)
            })
        })
      }
    } else if (name === 'blockquote') {
      this.editor?.commands.toggleBlockquote()
    } else if (name === 'bulletList') {
      this.editor?.commands.toggleBulletList()
    } else if (name === 'center') {
      this.editor?.commands.setTextAlign('center')
    } else if (name === 'clear') {
      this.editor?.commands.unsetAllMarks()
      this.removeBlockFormats()
    } else if (name === 'codeBlock') {
      this.editor?.commands.toggleCodeBlock()
    } else if (
      name === 'heading1' ||
      name === 'heading2' ||
      name === 'heading3' ||
      name === 'heading4' ||
      name === 'heading5' ||
      name === 'heading6'
    ) {
      this.editor?.commands.toggleHeading({ level: +name.replace(/[^0-9]/g, '') as any })
    } else if (name === 'hardBreak') {
      this.editor?.commands.setHardBreak()
    } else if (name === 'horizontalRule') {
      this.editor?.commands.setHorizontalRule()
    } else if (name === 'justify') {
      this.editor?.commands.setTextAlign('justify')
    } else if (name === 'left') {
      this.editor?.commands.setTextAlign('left')
    } else if (name === 'link') {
      this.openLinkPopup()
    } else if (name === 'normalize') {
      this.editor?.chain().clearNodes().unsetAllMarks().run()
    } else if (name === 'orderedList') {
      this.editor?.commands.toggleOrderedList()
    } else if (name === 'paragraph') {
      this.editor?.commands.setParagraph()
    } else if (name === 'redo') {
      this.editor?.commands.redo()
    } else if (name === 'right') {
      this.editor?.commands.setTextAlign('right')
    } else if (name === 'subscript') {
      this.editor?.chain().unsetMark('superscript').setMark('subscript').run()
    } else if (name === 'superscript') {
      this.editor?.chain().unsetMark('subscript').setMark('superscript').run()
    } else if (name === 'undo') {
      this.editor?.commands.undo()
    } else {
      this.editor?.commands.toggleMark(name)
    }
  }

  @Debounce(50)
  protected updateStates(): void {
    const e = this.editor
    const f = !!e?.isFocused && !this.disabled
    const path = this.getSelectionPath()
    const textStyle = e?.getAttributes('spanClass')
    const textStyleClasses: string[] =
      textStyle && textStyle['_fr--'] ? textStyle['_fr--'].split(' ') : []

    clearArray(this.filteredBlockFormats).push(
      ...this.blockFormats
        .filter((format) => {
          return (
            !format.tags ||
            format.tags.includes('*') ||
            format.tags.some((tag) => path.some((node) => node.tag === tag))
          )
        })
        .map((format) => ({
          className: format.className,
          label: format.label,
          tags: format.tags,
          active: path.some((node) => node.classes.includes(format.className)),
        })),
    )

    clearArray(this.filteredInlineFormats).push(
      ...this.inlineFormats.map((format) => ({
        className: format.className,
        label: format.label,
        active: textStyleClasses.includes(format.className),
      })),
    )

    this.toolbarStates.blockFormats.active = f && this.filteredBlockFormats.some((f) => f.active)
    this.toolbarStates.blockquote.active = f && !!e?.isActive('blockquote')
    this.toolbarStates.bold.active = f && !!e?.isActive('bold')
    this.toolbarStates.bulletList.active = f && !!e?.isActive('bulletList')
    this.toolbarStates.center.active = f && !!e?.isActive({ textAlign: 'center' })
    this.toolbarStates.code.active = f && !!e?.isActive('code')
    this.toolbarStates.codeBlock.active = f && !!e?.isActive('codeBlock')
    this.toolbarStates.hardBreak.active = f && !!e?.isActive('hardBreak')
    this.toolbarStates.highlight.active = f && !!e?.isActive('highlight')
    this.toolbarStates.heading1.active = f && !!e?.isActive('heading', { level: 1 })
    this.toolbarStates.heading2.active = f && !!e?.isActive('heading', { level: 2 })
    this.toolbarStates.heading3.active = f && !!e?.isActive('heading', { level: 3 })
    this.toolbarStates.heading4.active = f && !!e?.isActive('heading', { level: 4 })
    this.toolbarStates.heading5.active = f && !!e?.isActive('heading', { level: 5 })
    this.toolbarStates.heading6.active = f && !!e?.isActive('heading', { level: 6 })
    this.toolbarStates.horizontalRule.active = f && !!e?.isActive('horizontalRule')
    this.toolbarStates.italic.active = f && !!e?.isActive('italic')
    this.toolbarStates.inlineFormats.active = f && this.filteredInlineFormats.some((f) => f.active)
    this.toolbarStates.justify.active = f && !!e?.isActive({ textAlign: 'justify' })
    this.toolbarStates.left.active = f && !!e?.isActive({ textAlign: 'left' })
    this.toolbarStates.link.active = f && !!e?.isActive('link')
    this.toolbarStates.orderedList.active = f && !!e?.isActive('orderedList')
    this.toolbarStates.paragraph.active = f && !!e?.isActive('paragraph')
    this.toolbarStates.right.active = f && !!e?.isActive({ textAlign: 'right' })
    this.toolbarStates.strike.active = f && !!e?.isActive('strike')
    this.toolbarStates.subscript.active = f && !!e?.isActive('subscript')
    this.toolbarStates.superscript.active = f && !!e?.isActive('superscript')
    this.toolbarStates.underline.active = f && !!e?.isActive('underline')

    this.toolbarStates.blockFormats.disabled = !f || !this.filteredBlockFormats.length
    this.toolbarStates.blockquote.disabled = !f || !e?.can().toggleBlockquote?.call(null)
    this.toolbarStates.bold.disabled = !f || !e?.can().toggleBold?.call(null)
    this.toolbarStates.bulletList.disabled = !f || !e?.can().toggleBulletList?.call(null)
    this.toolbarStates.center.disabled = !f || !e?.can().setTextAlign?.call(null, 'center')
    this.toolbarStates.clear.disabled = !f
    this.toolbarStates.code.disabled = !f || !e?.can().toggleCode?.call(null)
    this.toolbarStates.codeBlock.disabled = !f || !e?.can().toggleCodeBlock?.call(null)
    this.toolbarStates.hardBreak.disabled = !f || !e?.can().setHardBreak?.call(null)
    this.toolbarStates.highlight.disabled = !f || !e?.can().setHighlight?.call(null)
    this.toolbarStates.heading1.disabled = !f || !e?.can().toggleHeading?.call(null, { level: 1 })
    this.toolbarStates.heading2.disabled = !f || !e?.can().toggleHeading?.call(null, { level: 2 })
    this.toolbarStates.heading3.disabled = !f || !e?.can().toggleHeading?.call(null, { level: 3 })
    this.toolbarStates.heading4.disabled = !f || !e?.can().toggleHeading?.call(null, { level: 4 })
    this.toolbarStates.heading5.disabled = !f || !e?.can().toggleHeading?.call(null, { level: 5 })
    this.toolbarStates.heading6.disabled = !f || !e?.can().toggleHeading?.call(null, { level: 6 })
    this.toolbarStates.horizontalRule.disabled = !f || !e?.can().setHorizontalRule?.call(null)
    this.toolbarStates.italic.disabled = !f || !e?.can().toggleItalic?.call(null)
    this.toolbarStates.inlineFormats.disabled = !f || !this.filteredInlineFormats.length
    this.toolbarStates.justify.disabled = !f || !e?.can().setTextAlign?.call(null, 'justify')
    this.toolbarStates.left.disabled = !f || !e?.can().setTextAlign?.call(null, 'left')
    this.toolbarStates.link.disabled = !f || !e?.can().toggleLink?.call(null, { href: '' })
    this.toolbarStates.normalize.disabled = !f
    this.toolbarStates.orderedList.disabled = !f || !e?.can().toggleOrderedList?.call(null)
    this.toolbarStates.paragraph.disabled = !f || !e?.can().setParagraph?.call(null)
    this.toolbarStates.redo.disabled = !f || !e?.can().redo?.call(null)
    this.toolbarStates.right.disabled = !f || !e?.can().setTextAlign?.call(null, 'right')
    this.toolbarStates.strike.disabled = !f || !e?.can().toggleStrike?.call(null)
    this.toolbarStates.subscript.disabled = !f || !e?.can().toggleSubscript?.call(null)
    this.toolbarStates.superscript.disabled = !f || !e?.can().toggleSuperscript?.call(null)
    this.toolbarStates.underline.disabled = !f || !e?.can().toggleUnderline?.call(null)
    this.toolbarStates.undo.disabled = !f || !e?.can().undo?.call(null)
  }

  onBlockFormatChange(format: {
    className: string
    label?: string
    tags?: string[]
    active: boolean
  }): void {
    for (const node of this.getSelectionPath()) {
      if (!format.tags || format.tags.includes('*') || format.tags.includes(node.tag)) {
        if (format.active) {
          if (!node.classes.includes(format.className)) {
            node.classes.push(format.className)
          }
        } else {
          const index = node.classes.indexOf(format.className)

          if (index > -1) {
            node.classes.splice(index, 1)
          }
        }

        this.editor?.commands.updateAttributes(node.name, {
          '_fr--': node.classes.sort().join(' '),
        })
      }
    }
  }

  onInlineFormatChange(format: { className: string; label?: string; active: boolean }): void {
    const textStyle = this.editor?.getAttributes('spanClass')
    const textStyleClasses: string[] =
      textStyle && textStyle['_fr--'] ? textStyle['_fr--'].split(' ') : []

    if (format.active) {
      textStyleClasses.push(format.className)
    } else {
      const index = textStyleClasses.indexOf(format.className)

      if (index > -1) {
        textStyleClasses.splice(index, 1)
      }
    }

    if (textStyleClasses.length) {
      ;(this.editor?.commands as any).setSpanClass(uniqueArray(textStyleClasses).join(' '))
    } else {
      ;(this.editor?.commands as any).unsetSpanClass()
    }
  }

  removeBlockFormats() {
    this.getSelectionPath().forEach((node) => {
      this.editor?.commands.updateAttributes(node.name, { '_fr--': '' })
    })
  }

  protected getSelectionPath(): { tag: string; name: string; classes: string[] }[] {
    return (
      (this.editor?.state.selection.$anchor as any).path
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

  protected getClassExtensions() {
    return {
      '_fr--': {
        default: '',
        renderHTML: (attributes: any) => {
          return attributes['_fr--'] ? { '_fr--': attributes['_fr--'] } : {}
        },
      },
    }
  }

  onClickFormatCheckbox(format: any, method: any) {
    format.active = !format.active
    method.call(this, format)
  }

  onLinkUrlChange(): void {
    this.linkLinked = /^\$[1-9][0-9]*$/.test(this.linkUrl)
  }

  onLinkTargetSwitcherChange(): void {
    this.linkTarget =
      this.linkTargetSwitcher === '_self'
        ? null
        : this.linkTargetSwitcher === '_blank'
        ? '_blank'
        : ''
  }

  onLinkChange(): void {
    const trimmedUrl = this.linkUrl.trim()

    if (!trimmedUrl) {
      this.linkUrlError = 'This field is required'
    } else if (!isUrl(trimmedUrl) && !isUrlPath(trimmedUrl, true)) {
      this.linkUrlError = trimmedUrl.startsWith('http') ? 'Invalid URL' : 'Invalid URL path'
    } else {
      this.linkUrlError = ''
    }

    if (!this.linkUrlError) {
      this.linkPopupVisible = false

      if (trimmedUrl) {
        this.editor
          ?.chain()
          .focus()
          .extendMarkRange('link')
          .setLink({
            href: trimmedUrl,
            target: this.linkTarget?.trim() ?? null,
            rel: this.linkTarget?.trim() === '_blank' ? 'noopener noreferrer nofollow' : null,
            _append:
              trimmedUrl.match(/^\$[1-9][0-9]*$/) && this.linkAppend?.trim()
                ? this.linkAppend
                : null,
          } as any)
          .run()
      } else {
        this.editor?.chain().focus().extendMarkRange('link').unsetLink().run()
      }
    }
  }

  removeLink(): void {
    this.linkPopupVisible = false
    this.editor?.chain().focus().unsetLink().run()
  }

  openLinkPopup(): void {
    const attrs = this.editor?.getAttributes('link') ?? {}
    this.linkPopupVisible = true
    this.editingLink = !!this.editor?.isActive('link')
    this.linkUrlError = ''
    this.linkUrl = attrs['href'] ?? ''
    this.linkTarget = attrs['target'] ?? null
    this.linkTargetSwitcher = !this.linkTarget
      ? '_self'
      : this.linkTarget === '_blank'
      ? '_blank'
      : 'custom'
    this.linkAppend = attrs['_append'] ?? ''
    this.onLinkUrlChange()
  }

  closeLinkPopup(): void {
    this.linkPopupVisible = false
    this.editor?.commands.focus()
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy()
    this.editor?.destroy()
  }
}
