import { HttpErrorResponse } from '@angular/common/http'
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import {
  Block,
  BlockRecord,
  Choice,
  ConditionalLogic,
  flattenFields,
  getAllowedPageBlocks,
  getDefaultFieldValue,
  getPageLayoutChoices,
  getPageLayoutChoicesByType,
  getPageTypeChoices,
  nanoid,
  RepeaterField,
  sanitizeAllowedBlocks,
  standardPageColumns,
  standardPageFields,
} from '@pruvious-test/shared'
import {
  clearArray,
  Debounce,
  debounceParallel,
  isObject,
  lowercaseFirstLetter,
} from '@pruvious-test/utils'
import { ToastrService } from 'ngx-toastr'
import { firstValueFrom, takeUntil } from 'rxjs'
import { SortableOptions } from 'sortablejs'
import { HistoryComponent } from 'src/app/components/history.component'
import { ApiService, Page, Preview } from 'src/app/services/api.service'
import { BlockService } from 'src/app/services/block.service'
import { ClickService } from 'src/app/services/click.service'
import { ConfigService } from 'src/app/services/config.service'
import { DialogService } from 'src/app/services/dialog.service'
import { DragImageService } from 'src/app/services/drag-image.service'
import { MediaService, PickRequirements } from 'src/app/services/media.service'
import { StateService } from 'src/app/services/state.service'
import { blur } from 'src/app/utils/dom'
import { getHotkeyAction } from 'src/app/utils/hotkeys'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
})
export class PageComponent extends HistoryComponent implements OnInit, AfterViewInit, OnDestroy {
  page!: Partial<Page>

  preview!: Preview

  exists!: boolean

  public: boolean = false

  nuxtBaseUrl: string = ''

  previewUrl: string = ''

  pageLink: string = ''

  validator = new Validator()

  conditionalLogic = new ConditionalLogic({}, [], Object.values(this.blockService.blocks))

  selectedBlock?: BlockRecord

  selectedBlockConfig?: Block

  selectedBlockKey: string = 'blocks'

  softReloads: number = 0

  hardReloads: number = 0

  @ViewChild('blocks')
  blocksEl!: ElementRef<HTMLDivElement>

  @ViewChild('iframe')
  iframeEl?: ElementRef<HTMLIFrameElement>

  sortableBlocksOptions: SortableOptions = {
    group: 'blocks',
    emptyInsertThreshold: 0,
    onStart: (event) => {
      this.zone.run(() => {
        this.sorting = true
        this.blockService.dragging = event.item.dataset['block']!
        document.body.classList.add('sorting')
      })
    },
    onEnd: () => {
      this.zone.run(() => {
        this.endSorting()
      })
    },
    onUpdate: () => {
      this.zone.run(() => {
        const original = [...this.page.blocks!]
        this.blocksEl.nativeElement.style.height = `${this.blocksEl.nativeElement.offsetHeight}px`
        this.page.blocks = []

        setTimeout(() => {
          this.page.blocks = original
          this.blocksEl.nativeElement.removeAttribute('style')
          this.endSorting()
          this.pushHistoryState()
          this.reload()
        })
      })
    },
    onAdd: () => {
      this.zone.run(() => {
        this.endSorting()
        this.pushHistoryState()
        this.reload()
      })
    },
    onRemove: () => {
      this.zone.run(() => {
        this.endSorting()
        this.pushHistoryState()
        this.reload()
      })
    },
    setData: (dataTransfer, el) => {
      this.zone.run(() => {
        this.dragImage.label = el.dataset['blockLabel']!
        dataTransfer.setDragImage(this.dragImage.element!, -16, 10)
        dataTransfer.effectAllowed = 'move'
      })
    },
  }

  slotsEnabled: Record<string, boolean> = {}

  tabs: {
    label: 'Page' | 'SEO' | 'Options' | 'Block'
    visible: boolean
    errors: number
  }[] = [
    { label: 'Page', visible: true, errors: 0 },
    { label: 'SEO', visible: true, errors: 0 },
    { label: 'Options', visible: false, errors: 0 },
    { label: 'Block', visible: false, errors: 0 },
  ]

  activeTab: 'Page' | 'SEO' | 'Options' | 'Block' = 'Page'

  mediaPickerVisible: boolean = false

  mediaPickerRequirements?: PickRequirements

  languages: Choice[] = []

  types: Choice[] = []

  protected allLayouts: Choice[] = []

  layouts: Choice[] = []

  backTooltip: string = 'Show all ' + lowercaseFirstLetter(this.config.pages.labels!.item!.plural)

  publishDateDescription: string = `You can schedule the ${lowercaseFirstLetter(
    this.config.pages.labels!.item!.singular,
  )} to be published at a specific date and time in the future.`

  baseTitleDescription: string = `Whether the base title defined in the SEO settings should be displayed together with the ${lowercaseFirstLetter(
    this.config.pages.labels!.item!.singular,
  )} title.`

  visibleDescription: string = `Discourage search engines from indexing this ${lowercaseFirstLetter(
    this.config.pages.labels!.item!.singular,
  )}. It is up to search engines to honor this request.`

  sharingImageDescription: string = `An image that appears when someone shares this ${lowercaseFirstLetter(
    this.config.pages.labels!.item!.singular,
  )} link on a social network. The optimal image size is 1600 × 900 pixels.`

  metaTagsDescription: string = `The **&lt;meta&gt;** tags for this ${lowercaseFirstLetter(
    this.config.pages.labels!.item!.singular,
  )}. Values entered here will override other automatically generated meta tags.`

  metaTagSubFields = (
    standardPageFields.find((field) => field.name === 'metaTags') as RepeaterField
  ).subFields

  confirm?: string

  allowedBlocks: string[] = []

  rootBlocks: string[] = []

  resolution: string = ''

  iframeFocused: boolean = false

  blockFocused: boolean = false

  hasVisibleCustomFields: boolean = flattenFields(this.config.pages.fields ?? []).some(
    (field) => field.visible !== false,
  )

  id = nanoid()

  protected sorting: boolean = false

  constructor(
    public blockService: BlockService,
    public config: ConfigService,
    protected api: ApiService,
    protected click: ClickService,
    protected dialog: DialogService,
    protected dragImage: DragImageService,
    protected media: MediaService,
    protected route: ActivatedRoute,
    protected router: Router,
    protected state: StateService,
    protected toastr: ToastrService,
    protected zone: NgZone,
  ) {
    super()
  }

  ngOnInit(): void {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false

    this.languages =
      this.config.cms.languages!.map((language) => ({
        label: language.label,
        value: language.code,
      })) ?? []

    this.resolve()
    this.refresh()

    const pageTab = this.tabs.find((tab) => tab.label === 'Page')!
    const seoTab = this.tabs.find((tab) => tab.label === 'SEO')!
    const optionsTab = this.tabs.find((tab) => tab.label === 'Options')!
    const blockTab = this.tabs.find((tab) => tab.label === 'Block')!

    optionsTab.visible = this.hasVisibleCustomFields

    this.blockService.selection$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((selection) => {
      this.selectedBlockConfig = selection
        ? this.blockService.blocks[selection.block.name]
        : undefined
      this.selectedBlock = this.selectedBlockConfig ? selection?.block : undefined
      this.selectedBlockKey = this.selectedBlockConfig
        ? this.blockService.resolveBlockKey(this.selectedBlock!, this.page.blocks!)
        : 'blocks'

      blockTab.visible =
        !!this.selectedBlockConfig && Object.keys(this.selectedBlockConfig.fields ?? {}).length > 0

      blockTab.errors = this.selectedBlock
        ? Object.keys(this.validator.errors).filter((key) => {
            return key !== this.selectedBlock!.id && key.startsWith(this.selectedBlock!.id)
          }).length
        : 0

      if (selection?.refreshed) {
        if (!blockTab.visible) {
          this.activeTab = 'Page'
        }
      } else {
        if (blockTab.visible) {
          this.activeTab = 'Block'

          this.iframeEl?.nativeElement.contentWindow?.postMessage(
            { action: 'scrollTo', blockId: this.selectedBlock!.id },
            '*',
          )
        } else if (this.activeTab === 'Block') {
          this.activeTab = 'Page'
        }
      }
    })

    this.blockService.dragging$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((blockName) => {
      this.iframeEl?.nativeElement.contentWindow?.postMessage(
        { action: blockName ? 'dragStart' : 'dragEnd' },
        '*',
      )
    })

    this.validator.update$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      pageTab.errors = Object.keys(this.validator.errors).filter((key) => {
        return (
          !key.startsWith('block-') &&
          standardPageColumns[key] &&
          key !== 'sharingImage' &&
          !key.startsWith('metaTags.')
        )
      }).length

      seoTab.errors = Object.keys(this.validator.errors).filter((key) => {
        return key === 'sharingImage' || key.startsWith('metaTags.')
      }).length

      optionsTab.errors = Object.keys(this.validator.errors).filter((key) => {
        return (
          !key.startsWith('block-') &&
          !standardPageColumns[key] &&
          key !== 'sharingImage' &&
          !key.startsWith('metaTags.')
        )
      }).length

      blockTab.errors = this.selectedBlock
        ? Object.keys(this.validator.errors).filter((key) => {
            return key !== this.selectedBlock!.id && key.startsWith(this.selectedBlock!.id)
          }).length
        : 0
    })

    this.media.choose$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((requirements) => {
      this.mediaPickerVisible = true
      this.mediaPickerRequirements = requirements
    })

    this.media.pathChanged$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      this.refresh(true)
    })

    this.config.languageChanged$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      const language = this.config.currentLanguage

      if (this.exists && this.page.translations![language]) {
        this.router.navigate(['../', this.page.translations![language]!.id], {
          relativeTo: this.route,
        })
      } else if (
        this.exists &&
        !this.page.translations![language] &&
        language !== this.page.language
      ) {
        const languageLabel = this.config.cms.languages!.find(
          (l) => l.code === this.config.currentLanguage,
        )!.label

        if (this.config.can['createPages']) {
          this.dialog
            .open({
              message: `The <strong class="text-primary-700">${languageLabel}</strong> translation of this ${lowercaseFirstLetter(
                this.config.pages.labels!.item!.singular,
              )} does not exist. Do you want to create it?`,
              buttons: [
                { label: 'Cancel', value: 'cancel', color: 'white' },
                { label: 'Create translation', value: 'create' },
              ],
            })
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe(async (action) => {
              this.config.currentLanguage = this.page.language!

              if (action === 'create') {
                const success = await this.addTranslation(language)

                if (success) {
                  this.router.navigate(['../', this.page.translations![language]!.id], {
                    relativeTo: this.route,
                  })
                }
              }
            })
        } else {
          this.dialog
            .open({
              message: `The <strong class="text-primary-700">${languageLabel}</strong> translation of this ${lowercaseFirstLetter(
                this.config.pages.labels!.item!.singular,
              )} does not exist.`,
              buttons: [{ label: 'Close', value: 'close', color: 'white' }],
            })
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe(() => {
              this.config.currentLanguage = this.page.language!
            })
        }
      } else if (language !== this.page.language) {
        this.page.language = language
        this.updateLanguageInPath()
        this.refresh()
        this.pushHistoryState()
      }
    })

    this.dialog.data$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((data) => {
      if (!data) {
        this.config.currentLanguage = this.page.language!
      }
    })
  }

  ngAfterViewInit(): void {
    this.refreshPreview()
  }

  protected resolve(): void {
    const language = this.config.currentLanguage

    this.page = this.route.snapshot.data['page'] ?? {
      public: true,
      title: '',
      baseTitle: true,
      path: language === this.config.cms.defaultLanguage ? '/' : `/${language}/`,
      language,
      visible: true,
      sharingImage: null,
      metaTags: [],
      type: 'default',
      layout: 'default',
      blocks: [],
      publishDate: null,
    }

    flattenFields(this.config.pages.fields ?? []).forEach((field) => {
      if (this.page[field.name] === undefined) {
        this.page[field.name] = getDefaultFieldValue(field)
      }
    })

    this.conditionalLogic
      .setFields([...standardPageFields, ...(this.config.pages.fields ?? [])])
      .setRecords(this.page)

    this.preview = this.route.snapshot.data['preview']
    this.exists = !!this.route.snapshot.data['page']

    this.updateTitle()
    this.pushHistoryState(true)

    clearArray(this.types).push(...getPageTypeChoices(this.config.pages))
    clearArray(this.allLayouts).push(...getPageLayoutChoices(this.config.pages))

    if (this.types.every((type) => type.value !== this.page.type)) {
      this.page.type = 'default'
    }

    this.onChangeType(this.page.type!)
  }

  onChangeType(type: string): void {
    clearArray(this.layouts).push(...getPageLayoutChoicesByType(type, this.config.pages))

    if (this.layouts.every((layout) => layout.value !== this.page.layout)) {
      this.page.layout = this.layouts.some((_layout) => _layout.value === 'default')
        ? 'default'
        : this.layouts[0].value
    }

    this.onChangeLayout(this.page.layout!, type)
  }

  onChangeLayout(layout: string, type: string): void {
    const { allowedBlocks, rootBlocks } = getAllowedPageBlocks(
      { ...this.page, type, layout },
      this.config.pages,
      Object.values(this.blockService.blocks),
    )

    const { sanitizedBlockRecords, errors } = sanitizeAllowedBlocks(
      this.page.blocks!,
      Object.values(this.blockService.blocks),
      allowedBlocks,
      rootBlocks,
    )

    if (errors.length) {
      this.dialog
        .open({
          title: 'Resolve block issues',
          message:
            '<ul class="allowed-blocks-errors"><li>' +
            errors
              .map((error) => {
                return (
                  error.message.replace(
                    /'(.*?)'/g,
                    '<strong class="text-primary-700">$1</strong>',
                  ) + ` (ID: ${error.blockId}).`
                )
              })
              .join('</li><li>') +
            '</li></ul>',
          buttons: [
            { label: 'Cancel', value: 'cancel', color: 'white' },
            {
              label: errors.length === 1 ? 'Remove block' : `Remove ${errors.length} blocks`,
              value: 'fix',
            },
          ],
        })
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe((action) => {
          if (action === 'fix') {
            this.allowedBlocks = allowedBlocks
            this.rootBlocks = rootBlocks
            this.page.blocks = sanitizedBlockRecords
            this.page.type = type
            this.page.layout = layout
            this.reload(false, false)
            this.pushHistoryState()
          } else {
            const prevType = this.page.type
            const prevLayout = this.page.layout
            this.page.type = ''
            this.page.layout = ''
            setTimeout(() => {
              this.page.type = prevType
              this.page.layout = prevLayout
            })
          }
        })
    } else {
      this.allowedBlocks = allowedBlocks
      this.rootBlocks = rootBlocks
      this.page.type = type
      this.page.layout = layout
      this.reload(false, false)
      this.pushHistoryState()
    }
  }

  protected updateAllowedBlocks(): void {
    const { allowedBlocks, rootBlocks } = getAllowedPageBlocks(
      this.page,
      this.config.pages,
      Object.values(this.blockService.blocks),
    )

    this.allowedBlocks = allowedBlocks
    this.rootBlocks = rootBlocks
  }

  reload(force: boolean = false, soft: boolean = true): void {
    debounceParallel(`reload-preview-${force}-${soft}`, () => this.instantReload(force, soft), 250)
  }

  instantReload(force: boolean = false, soft: boolean = true) {
    const state = JSON.stringify({ ...this.page, draftToken: undefined })
    const stateChanged = state !== JSON.stringify(this.preview.data)

    if (force || stateChanged) {
      this.preview.data = { ...this.page, draftToken: undefined }

      this.api
        .updatePreview(this.preview, 'page')
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe((preview) => {
          this.preview = preview
          this.refreshPreview(soft)
        })
    }
  }

  @Debounce(0)
  protected refreshPreview(soft: boolean = true): void {
    const path = this.page.path!.replace(/\/+$/, '').replace(/\/\/*/g, '/')
    const previewUrl = `${this.nuxtBaseUrl}${path}?__p=${this.preview.token}`

    if (previewUrl !== this.previewUrl) {
      soft = false
    }

    this.previewUrl = previewUrl

    if (soft) {
      this.softReload()
    } else {
      this.hardReload()
    }

    this.updateResolution()
  }

  @Debounce(25)
  protected async softReload(): Promise<void> {
    const softReloads = this.softReloads
    let pong: boolean = false

    while (!pong) {
      window.addEventListener(
        'message',
        (event: MessageEvent) => {
          if (!pong && isObject(event.data) && event.data.action === 'pong') {
            pong = true

            if (softReloads === this.softReloads) {
              this.iframeEl?.nativeElement.contentWindow?.postMessage({ action: 'softReload' }, '*')
              this.softReloads++
            }
          }
        },
        { once: true },
      )

      this.iframeEl?.nativeElement.contentWindow?.postMessage({ action: 'ping' }, '*')
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  @Debounce(25)
  protected async hardReload(): Promise<void> {
    const hardReloads = this.hardReloads
    let pong: boolean = false

    while (!pong) {
      window.addEventListener(
        'message',
        (event: MessageEvent) => {
          if (!pong && isObject(event.data) && event.data.action === 'pong') {
            pong = true

            if (hardReloads === this.hardReloads) {
              this.iframeEl?.nativeElement.contentWindow?.postMessage({ action: 'reload' }, '*')
              this.hardReloads++
            }
          }
        },
        { once: true },
      )

      this.iframeEl?.nativeElement.contentWindow?.postMessage({ action: 'ping' }, '*')
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  @HostListener('window:message', ['$event'])
  onPreviewMessage(event: MessageEvent): void {
    if (isObject(event.data)) {
      if (event.data.action === 'selectBlock') {
        this.blockService.selectById(event.data.blockId, this.page.blocks!)
      } else if (event.data.action === 'focus') {
        this.iframeFocused = true
      } else if (event.data.action === 'blur') {
        this.iframeFocused = false
      } else if (event.data.action === 'save') {
        setTimeout(() => this.onSubmit())
      } else if (event.data.action === 'undo') {
        this.undo()
      } else if (event.data.action === 'redo') {
        this.redo()
      } else if (event.data.action === 'paste') {
        this.onPaste()
      } else if (event.data.action === 'duplicate') {
        window.dispatchEvent(new CustomEvent('duplicateblock'))
      } else if (event.data.action === 'copy') {
        window.dispatchEvent(new CustomEvent('copyblock'))
      } else if (event.data.action === 'cut') {
        window.dispatchEvent(new CustomEvent('cutblock'))
      } else if (event.data.action === 'delete') {
        window.dispatchEvent(new CustomEvent('deleteblock'))
      }
    }
  }

  onHighlight(block: BlockRecord): void {
    this.iframeEl?.nativeElement.contentWindow?.postMessage(
      { action: 'highlight', blockId: block.id },
      '*',
    )
  }

  onUnhighlight(block: BlockRecord): void {
    this.iframeEl?.nativeElement.contentWindow?.postMessage(
      { action: 'unhighlight', blockId: block.id },
      '*',
    )
  }

  @HostListener('window:click-selected-block')
  onClickSelectedBlock(): void {
    if (this.selectedBlock) {
      ;(document.querySelector('button[data-tab-label="Block"]') as HTMLButtonElement)?.click()
      this.iframeEl?.nativeElement.contentWindow?.postMessage(
        { action: 'scrollTo', blockId: this.selectedBlock.id },
        '*',
      )
    }
  }

  pushHistoryState(reset: boolean = false): void {
    const changed = this.addState(JSON.stringify(this.page), Date.now(), reset)

    if (changed) {
      this.conditionalLogic.check()
      this.updateAllowedBlocks()
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.state.popupsOpen) {
      const action = getHotkeyAction(event)

      if (action === 'save') {
        event.preventDefault()
        blur()
        setTimeout(() => this.onSubmit())
      } else if (action === 'undo') {
        event.preventDefault()
        this.undo()
      } else if (action === 'redo') {
        event.preventDefault()
        this.redo()
      } else if (action === 'paste') {
        this.onPaste(event)
      }
    }
  }

  async onPaste(event?: Event): Promise<void> {
    let payload: string = ''

    try {
      payload = await navigator.clipboard.readText()
    } catch (_) {
      this.toastr.error('You must first allow the app access to the clipboard')
    }

    if (payload) {
      const block = this.blockService.parseStringifiedBlock(payload)

      if (block) {
        event?.preventDefault()

        let list: BlockRecord[] | undefined
        let index: number = -1

        this.blockService.changeBlockIds(block)

        if (this.selectedBlock) {
          list = this.blockService.getBlockListkById(this.selectedBlock.id, this.page.blocks!)

          if (list) {
            index = list.indexOf(this.selectedBlock) + 1
          } else {
            list = this.page.blocks!
            index = list.length
          }
        } else {
          list = this.page.blocks!
          index = list.length
        }

        const listCopy = [...list]
        listCopy.splice(index, 0, block)
        const { errors } = sanitizeAllowedBlocks(
          JSON.parse(
            JSON.stringify(this.page.blocks!).replace(
              JSON.stringify(list),
              JSON.stringify(listCopy),
            ),
          ),
          Object.values(this.blockService.blocks),
          this.allowedBlocks,
          this.rootBlocks,
        )
        const error = errors.find((error) => error.blockId === block.id)

        if (error) {
          this.toastr.error(error.message.replace(/'(.*?)'/g, '<strong>$1</strong>'))
        } else {
          list.splice(index, 0, block)
          this.toastr.success(`Pasted block <strong>${block.name}</strong> from the clipboard`)
          this.blockService.select(block)
          setTimeout(() => document.getElementById(block.id)?.focus())
          this.pushHistoryState()
          this.reload()
        }
      }
    }
  }

  onSubmit(): void {
    if (
      this.validator.isLocked ||
      (this.exists && !this.config.can['updatePages']) ||
      (!this.exists && !this.config.can['createPages'])
    ) {
      return
    }

    this.validator.reset().lock()

    const method = this.exists ? 'updatePage' : 'createPage'
    const itemLabel = this.config.pages.labels!.item!.singular

    this.api[method](this.page)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (page) => {
          if (this.exists) {
            this.toastr.success(`${itemLabel} updated`)
          } else {
            this.toastr.success(page.public ? `${itemLabel} published` : `${itemLabel} created`)
            this.clearStates()
            this.router.navigate(['/pages', page.id])
          }

          this.page = page
          this.config.currentLanguage = this.page.language!
          this.validator.unlock()
          this.conditionalLogic.setRecords(this.page)
          this.updateAllowedBlocks()
          this.updateTitle()
          this.pushHistoryState(true)
          this.refresh()
        },
        error: (response: HttpErrorResponse) => {
          this.validator.reset()

          if (response.status === 422) {
            this.validator.setFieldErrors(response.error)
          } else if (response.status === 400) {
            this.validator.setGeneralError(response.error.message)
          }

          if (this.validator.generalError) {
            this.toastr.error(this.validator.generalError)
          } else {
            const errorCount = Object.keys(this.validator.errors).length

            if (errorCount) {
              this.toastr.error(`Found ${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`)
            }
          }
        },
      })
  }

  async copyPageLinkToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.pageLink)
      this.toastr.success('Link copied to clipboard')
    } catch (_) {
      this.toastr.error('You must first allow the app access to the clipboard')
    }
  }

  protected refresh(instantReload: boolean = false): void {
    this.exists = !!this.page.id
    this.public = this.page.public!
    this.nuxtBaseUrl = this.config.siteBaseUrl.replace(/\/$/, '')
    this.pageLink =
      this.nuxtBaseUrl +
      this.page.path!.replace(/\/+$/, '') +
      (this.public ? '' : '?__d=' + this.page.draftToken)

    this.blockService.refreshSelection(this.page.blocks!)

    if (instantReload) {
      this.instantReload(true)
    } else {
      this.reload()
    }
  }

  @Debounce(0)
  protected delayedRefreshSelection(): void {
    this.blockService.refreshSelection(this.page.blocks!)
  }

  updateLanguageInPath(): void {
    for (const language of this.config.cms.languages!) {
      if (this.page.path!.startsWith(`/${language.code}/`)) {
        this.page.path! = this.page.path!.slice(`/${language.code}`.length)
        break
      } else if (this.page.path === `/${language.code}`) {
        this.page.path = '/'
      }
    }

    if (this.config.currentLanguage !== this.config.cms.defaultLanguage) {
      this.page.path! = `/${this.config.currentLanguage}${this.page.path!}`
    }
  }

  undo(): void {
    const state = this.setState(this.stateIndex - 1, Date.now())

    if (state !== null) {
      this.page = { ...JSON.parse(state), translations: this.page.translations }
      this.refresh(true)
      this.config.currentLanguage = this.page.language!
      this.conditionalLogic.setRecords(this.page).check()
      this.updateAllowedBlocks()
    }
  }

  redo(): void {
    const state = this.setState(this.stateIndex + 1, Date.now())

    if (state !== null) {
      this.page = { ...JSON.parse(state), translations: this.page.translations }
      this.refresh(true)
      this.config.currentLanguage = this.page.language!
      this.conditionalLogic.setRecords(this.page).check()
      this.updateAllowedBlocks()
    }
  }

  async addTranslation(language: string, duplicate: boolean = false): Promise<boolean> {
    const initialState = JSON.parse(this.initialState)

    let base: Record<string, any> = {}

    if (duplicate) {
      base = initialState
    } else {
      flattenFields(this.config.pages.fields ?? []).forEach((field) => {
        base[field.name] = getDefaultFieldValue(field)
      })
    }

    let path = initialState.path!

    for (const l of this.config.cms.languages!) {
      if (path.startsWith(`/${l.code}/`)) {
        path = path.slice(`/${l.code}`.length)
        break
      } else if (path === `/${l.code}`) {
        path = '/'
      }
    }

    if (language !== this.config.cms.defaultLanguage) {
      path = `/${language}${this.page.path!}`
    }

    while (
      (
        await firstValueFrom(
          this.api.getPages({ filters: { path: { $eqi: path } }, perPage: 1, language: '*' }),
        )
      ).meta.total
    ) {
      const match = path.match(/-([0-9]+)$/)

      if (match) {
        path = path.replace(/[0-9]+$/, (+match[1] + 1).toString())
      } else if (path && path !== '/') {
        path += '-1'
      } else {
        path += 'translation'
      }
    }

    return new Promise<boolean>((resolve) => {
      this.api
        .createPage({
          ...base,
          public: false,
          path,
          language,
          sharingImage: initialState.sharingImage,
          translationOf: initialState.id,
          publishDate: null,
        })
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe({
          next: (page) => {
            this.page.translations![language] = { id: page.id!, path: page.path!, url: page.url! }
            this.toastr.success('Translation created')
            resolve(true)
          },
          error: (response: HttpErrorResponse) => {
            if (response.status === 400) {
              this.toastr.error(response.error.message)
            } else if (response.status === 422) {
              this.toastr.error('Unable to create translation (try reloading this page)')
            }
            resolve(false)
          },
        })
    })
  }

  onDeletePage(event: MouseEvent): void {
    if (!this.confirm?.startsWith('delete-page-')) {
      event.stopPropagation()

      this.confirm = `delete-page-${this.page.id}`

      this.click.confirm(
        event.target as Element,
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined

          this.api
            .deletePage(this.page)
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe({
              next: () => {
                this.toastr.success(`${this.config.pages.labels!.item!.singular} deleted`)
                this.router.navigate(['..'], { relativeTo: this.route })
              },
              error: (response: HttpErrorResponse) => {
                if (response.status === 400) {
                  this.toastr.error(response.error.message)
                }
              },
            })
        },
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined
        },
      )
    }
  }

  @HostListener('window:resize')
  protected updateResolution(): void {
    this.resolution = this.iframeEl
      ? `${this.iframeEl.nativeElement.offsetWidth} × ${this.iframeEl.nativeElement.offsetHeight}`
      : ''
  }

  protected updateTitle(): void {
    this.config.setTitle(
      this.exists
        ? this.page.title || this.page.path!
        : `New ${lowercaseFirstLetter(this.config.pages.labels!.item!.singular)}`,
      this.config.pages.labels!.title!.plural,
    )
  }

  @HostListener('document:focusin')
  @HostListener('document:focusout')
  protected onFocus(): void {
    setTimeout(() => (this.blockFocused = !!document.activeElement?.id?.startsWith('block-')))
  }

  protected endSorting(): void {
    if (this.sorting) {
      this.sorting = false
      this.blockService.dragging = null
      document.body.classList.remove('sorting')
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy()
    this.endSorting()
    this.blockService.reset()
  }
}
