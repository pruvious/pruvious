import { HttpErrorResponse } from '@angular/common/http'
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
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
  PresetRecord,
  sanitizeAllowedBlocks,
  standardPresetColumns,
  standardPresetFields,
} from '@pruvious-test/shared'
import { Debounce, debounceParallel, isObject, lowercaseFirstLetter } from '@pruvious-test/utils'
import { ToastrService } from 'ngx-toastr'
import { firstValueFrom, takeUntil } from 'rxjs'
import { SortableOptions } from 'sortablejs'
import { HistoryComponent } from 'src/app/components/history.component'
import { ApiService, Preview } from 'src/app/services/api.service'
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
  selector: 'app-preset',
  templateUrl: './preset.component.html',
})
export class PresetComponent extends HistoryComponent implements OnInit, AfterViewInit, OnDestroy {
  preset!: Partial<PresetRecord>

  preview!: Preview

  exists!: boolean

  public: boolean = false

  nuxtBaseUrl: string = ''

  previewUrl: string = ''

  validator = new Validator()

  conditionalLogic = new ConditionalLogic({}, [], Object.values(this.blockService.blocks))

  selectedBlock?: BlockRecord

  selectedBlockConfig?: Block

  selectedBlockKey: string = 'blocks'

  @ViewChild('blocks')
  blocksEl!: ElementRef<HTMLDivElement>

  @ViewChild('iframe')
  iframeEl?: ElementRef<HTMLIFrameElement>

  sortableBlocksOptions: SortableOptions = {
    group: 'blocks',
    emptyInsertThreshold: 0,
    onStart: (event) => {
      this.sorting = true
      this.blockService.dragging = event.item.dataset['block']!
      document.body.classList.add('sorting')
    },
    onEnd: () => {
      this.endSorting()
    },
    onUpdate: () => {
      const original = [...this.preset.blocks!]
      this.blocksEl.nativeElement.style.height = `${this.blocksEl.nativeElement.offsetHeight}px`
      this.preset.blocks = []

      setTimeout(() => {
        this.preset.blocks = original
        this.blocksEl.nativeElement.removeAttribute('style')
        this.endSorting()
        this.pushHistoryState()
        this.reload()
      })
    },
    onAdd: () => {
      this.endSorting()
      this.pushHistoryState()
      this.reload()
    },
    onRemove: () => {
      this.endSorting()
      this.pushHistoryState()
      this.reload()
    },
    setData: (dataTransfer, el) => {
      this.dragImage.label = el.dataset['blockLabel']!
      dataTransfer.setDragImage(this.dragImage.element!, -16, 10)
      dataTransfer.effectAllowed = 'move'
    },
  }

  tabs: {
    label: 'Preset' | 'Block'
    visible: boolean
    errors: number
  }[] = [
    { label: 'Preset', visible: true, errors: 0 },
    { label: 'Block', visible: false, errors: 0 },
  ]

  activeTab: 'Preset' | 'Block' = 'Preset'

  mediaPickerVisible: boolean = false

  mediaPickerRequirements?: PickRequirements

  languages: Choice[] = []

  backTooltip: string = 'Show all ' + lowercaseFirstLetter(this.config.presets.labels!.item!.plural)

  confirm?: string

  allowedBlocks: string[] = []

  resolution: string = ''

  iframeFocused: boolean = false

  blockFocused: boolean = false

  softReloads: number = 0

  hardReloads: number = 0

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

    this.allowedBlocks = Object.values(this.blockService.blocks)
      .map((block) => block.name)
      .filter((blockName) => blockName !== 'Preset')

    this.resolve()
    this.refresh()

    const presetTab = this.tabs.find((tab) => tab.label === 'Preset')!
    const blockTab = this.tabs.find((tab) => tab.label === 'Block')!

    this.blockService.selection$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((selection) => {
      this.selectedBlockConfig = selection
        ? this.blockService.blocks[selection.block.name]
        : undefined
      this.selectedBlock = this.selectedBlockConfig ? selection?.block : undefined
      this.selectedBlockKey = this.selectedBlockConfig
        ? this.blockService.resolveBlockKey(this.selectedBlock!, this.preset.blocks!)
        : 'blocks'

      blockTab.visible =
        !!this.selectedBlockConfig &&
        (!!this.selectedBlockConfig.description ||
          Object.keys(this.selectedBlockConfig.fields ?? {}).length > 0)

      blockTab.errors = this.selectedBlock
        ? Object.keys(this.validator.errors).filter((key) => {
            return key !== this.selectedBlock!.id && key.startsWith(this.selectedBlock!.id)
          }).length
        : 0

      if (selection?.refreshed) {
        if (!blockTab.visible) {
          this.activeTab = 'Preset'
        }
      } else {
        if (blockTab.visible) {
          this.activeTab = 'Block'

          this.iframeEl?.nativeElement.contentWindow?.postMessage(
            { action: 'scrollTo', blockId: this.selectedBlock!.id },
            '*',
          )
        } else if (this.activeTab === 'Block') {
          this.activeTab = 'Preset'
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
      presetTab.errors = Object.keys(this.validator.errors).filter((key) => {
        return !key.startsWith('block-') && standardPresetColumns[key]
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

      if (this.exists && this.preset.translations![language]) {
        this.router.navigate(['../', this.preset.translations![language]!.id], {
          relativeTo: this.route,
        })
      } else if (
        this.exists &&
        !this.preset.translations![language] &&
        language !== this.preset.language
      ) {
        const languageLabel = this.config.cms.languages!.find(
          (l) => l.code === this.config.currentLanguage,
        )!.label

        if (this.config.can['createPresets']) {
          this.dialog
            .open({
              message: `The <strong class="text-primary-700">${languageLabel}</strong> translation of this ${lowercaseFirstLetter(
                this.config.presets.labels!.item!.singular,
              )} does not exist. Do you want to create it?`,
              buttons: [
                { label: 'Cancel', value: 'cancel', color: 'white' },
                { label: 'Create translation', value: 'create' },
              ],
            })
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe(async (action) => {
              this.config.currentLanguage = this.preset.language!

              if (action === 'create') {
                const success = await this.addTranslation(language)

                if (success) {
                  this.router.navigate(['../', this.preset.translations![language]!.id], {
                    relativeTo: this.route,
                  })
                }
              }
            })
        } else {
          this.dialog
            .open({
              message: `The <strong class="text-primary-700">${languageLabel}</strong> translation of this ${lowercaseFirstLetter(
                this.config.presets.labels!.item!.singular,
              )} does not exist.`,
              buttons: [{ label: 'Close', value: 'close', color: 'white' }],
            })
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe(() => {
              this.config.currentLanguage = this.preset.language!
            })
        }
      } else {
        this.preset.language = language
        this.refresh()
        this.pushHistoryState()
      }
    })

    this.dialog.data$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((data) => {
      if (!data) {
        this.config.currentLanguage = this.preset.language!
      }
    })
  }

  ngAfterViewInit(): void {
    this.refreshPreview()
  }

  protected resolve(): void {
    const language = this.config.currentLanguage

    this.preset = this.route.snapshot.data['preset'] ?? {
      title: '',
      language,
      blocks: [],
    }

    this.conditionalLogic.setFields(standardPresetFields).setRecords(this.preset)

    this.preview = this.route.snapshot.data['preview']
    this.exists = !!this.route.snapshot.data['preset']

    this.updateTitle()
    this.pushHistoryState(true)

    const { sanitizedBlockRecords, errors } = sanitizeAllowedBlocks(
      this.preset.blocks!,
      Object.values(this.blockService.blocks),
      this.allowedBlocks,
      this.allowedBlocks,
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
            this.preset.blocks = sanitizedBlockRecords
            this.reload()
            this.pushHistoryState()
          }
        })
    }
  }

  reload(force: boolean = false, soft: boolean = true): void {
    debounceParallel(`reload-preview-${force}-${soft}`, () => this.instantReload(force, soft), 250)
  }

  instantReload(force: boolean = false, soft: boolean = true) {
    const state = JSON.stringify({ ...this.preset, draftToken: undefined })
    const stateChanged = state !== JSON.stringify(this.preview.data)

    if (force || stateChanged) {
      this.preview.data = { ...this.preset, draftToken: undefined }

      this.api
        .updatePreview(this.preview, 'preset')
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe((preview) => {
          this.preview = preview
          this.refreshPreview(soft)
        })
    }
  }

  @Debounce(0)
  protected refreshPreview(soft: boolean = true): void {
    const previewUrl = `${this.nuxtBaseUrl}/__preset?__p=${this.preview.token}`

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
        this.blockService.selectById(event.data.blockId, this.preset.blocks!)
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
    const changed = this.addState(JSON.stringify(this.preset), Date.now(), reset)

    if (changed) {
      this.conditionalLogic.check()
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
          list = this.blockService.getBlockListkById(this.selectedBlock.id, this.preset.blocks!)

          if (list) {
            index = list.indexOf(this.selectedBlock) + 1
          } else {
            list = this.preset.blocks!
            index = list.length
          }
        } else {
          list = this.preset.blocks!
          index = list.length
        }

        const listCopy = [...list]
        listCopy.splice(index, 0, block)
        const { errors } = sanitizeAllowedBlocks(
          JSON.parse(
            JSON.stringify(this.preset.blocks!).replace(
              JSON.stringify(list),
              JSON.stringify(listCopy),
            ),
          ),
          Object.values(this.blockService.blocks),
          this.allowedBlocks,
          this.allowedBlocks,
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
      (this.exists && !this.config.can['updatePresets']) ||
      (!this.exists && !this.config.can['createPresets'])
    ) {
      return
    }

    this.validator.reset().lock()

    const method = this.exists ? 'updatePreset' : 'createPreset'
    const itemLabel = this.config.presets.labels!.item!.singular

    this.api[method](this.preset)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (preset) => {
          if (this.exists) {
            this.toastr.success(`${itemLabel} updated`)
          } else {
            this.toastr.success(`${itemLabel} created`)
            this.clearStates()
            this.router.navigate(['/presets', preset.id])
          }

          this.preset = preset
          this.config.currentLanguage = this.preset.language!
          this.validator.unlock()
          this.conditionalLogic.setRecords(this.preset)
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

  protected refresh(instantReload: boolean = false): void {
    this.exists = !!this.preset.id
    this.nuxtBaseUrl = this.config.siteBaseUrl.replace(/\/$/, '')

    this.blockService.refreshSelection(this.preset.blocks!)

    if (instantReload) {
      this.instantReload(true)
    } else {
      this.reload()
    }
  }

  @Debounce(0)
  protected delayedRefreshSelection(): void {
    this.blockService.refreshSelection(this.preset.blocks!)
  }

  undo(): void {
    const state = this.setState(this.stateIndex - 1, Date.now())

    if (state !== null) {
      this.preset = { ...JSON.parse(state), translations: this.preset.translations }
      this.refresh(true)
      this.config.currentLanguage = this.preset.language!
      this.conditionalLogic.setRecords(this.preset).check()
    }
  }

  redo(): void {
    const state = this.setState(this.stateIndex + 1, Date.now())

    if (state !== null) {
      this.preset = { ...JSON.parse(state), translations: this.preset.translations }
      this.refresh(true)
      this.config.currentLanguage = this.preset.language!
      this.conditionalLogic.setRecords(this.preset).check()
    }
  }

  async addTranslation(language: string, duplicate: boolean = false): Promise<boolean> {
    const initialState = JSON.parse(this.initialState)

    let base: Record<string, any> = {}

    if (duplicate) {
      base = initialState
    }

    let title: string = initialState.title!

    while (
      (
        await firstValueFrom(
          this.api.getPresets({ filters: { title: { $eqi: title } }, perPage: 1, language }),
        )
      ).meta.total
    ) {
      title = title!.match(/\(duplicate ?([0-9]+)?\)$/i)
        ? title!.replace(/\(duplicate ?([0-9]+)?\)$/, (_, i) => {
            return `(duplicate ${i ? ++i : 1})`
          })
        : `${title} (duplicate)`
    }

    return new Promise<boolean>((resolve) => {
      this.api
        .createPreset({
          ...base,
          title,
          language,
          translationOf: initialState.id,
        })
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe({
          next: (preset) => {
            this.preset.translations![language] = { id: preset.id! }
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

  onDeletePreset(event: MouseEvent): void {
    if (!this.confirm?.startsWith('delete-preset-')) {
      event.stopPropagation()

      this.confirm = `delete-preset-${this.preset.id}`

      this.click.confirm(
        event.target as Element,
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined

          this.api
            .deletePreset(this.preset)
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe({
              next: () => {
                this.toastr.success(`${this.config.presets.labels!.item!.singular} deleted`)
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
        ? this.preset.title!
        : `New ${lowercaseFirstLetter(this.config.presets.labels!.item!.singular)}`,
      this.config.presets.labels!.title!.plural,
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
