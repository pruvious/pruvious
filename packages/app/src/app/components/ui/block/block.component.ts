import { HttpErrorResponse } from '@angular/common/http'
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core'
import { BlockRecord, filterAllowedChildBlocks, nanoid, Slot } from '@pruvious-test/shared'
import { clearObject, lowercaseFirstLetter } from '@pruvious-test/utils'
import { ToastrService } from 'ngx-toastr'
import { takeUntil } from 'rxjs'
import { SortableOptions } from 'sortablejs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService } from 'src/app/services/api.service'
import { BlockService } from 'src/app/services/block.service'
import { ConfigService } from 'src/app/services/config.service'
import { DragImageService } from 'src/app/services/drag-image.service'
import { StateService } from 'src/app/services/state.service'
import { getHotkeyAction } from 'src/app/utils/hotkeys'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-block',
  templateUrl: './block.component.html',
})
export class BlockComponent extends BaseComponent implements OnInit, OnChanges, OnDestroy {
  @Input()
  block!: BlockRecord

  @Input()
  records!: BlockRecord[]

  @Input()
  index!: number

  @Input()
  allowedBlocks?: string[] | '*'

  @Input()
  allowedChildBlocks?: string[] | '*'

  @Input()
  validator!: Validator

  @Input()
  disabled: boolean = false

  @Input()
  noDrag: boolean = false

  @Output()
  sort = new EventEmitter<void>()

  @Output()
  changed = new EventEmitter<void>()

  @Output()
  pasted = new EventEmitter<void>()

  @Output()
  highlight = new EventEmitter<BlockRecord>()

  @Output()
  unhighlight = new EventEmitter<BlockRecord>()

  slots: string[] = []

  selected: boolean = false

  errors: number = 0

  get moreOptionsPopupVisible(): boolean {
    return this._moreOptionsPopupVisible
  }
  set moreOptionsPopupVisible(value: boolean) {
    this._moreOptionsPopupVisible = value
    this.state.sortableDisabled = value
    this.canPaste = false

    if (value) {
      navigator.clipboard
        .readText()
        .then((payload) => {
          const block = this.blockService.parseStringifiedBlock(payload)

          if (block && this.allowedChildBlocks?.includes(block.name)) {
            this.canPaste = true
          }
        })
        .catch(() => null)
    }
  }
  protected _moreOptionsPopupVisible: boolean = false

  canPaste: boolean = false

  canConvertToPreset: boolean = false

  slotsEnabled: Record<string, boolean> = {}

  get convertToPresetPopupVisible(): boolean {
    return this._convertToPresetPopupVisible
  }
  set convertToPresetPopupVisible(value: boolean) {
    this._convertToPresetPopupVisible = value
    this.state.sortableDisabled = value
  }
  protected _convertToPresetPopupVisible: boolean = false

  protected sorting: boolean = false

  presetTitle: string = ''

  presetValidator = new Validator()

  sortableOptions: SortableOptions = {
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
        Object.keys(this.block.children!).forEach((slot) => {
          const original = [...this.block.children![slot]]
          const blocksEl = document.getElementById('blocks')!
          blocksEl.style.height = `${blocksEl.offsetHeight}px`
          this.block.children![slot] = []

          setTimeout(() => {
            this.block.children![slot] = original
            blocksEl.removeAttribute('style')
          })
        })

        setTimeout(() => {
          this.endSorting()
          this.changed.emit()
          this.sort.emit()
        })
      })
    },
    onAdd: () => {
      this.zone.run(() => {
        this.endSorting()
        this.changed.emit()
        this.sort.emit()
      })
    },
    onRemove: () => {
      this.zone.run(() => {
        this.endSorting()
        this.changed.emit()
        this.sort.emit()
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

  id = nanoid()

  constructor(
    public blockService: BlockService,
    public config: ConfigService,
    protected api: ApiService,
    protected dragImage: DragImageService,
    protected state: StateService,
    protected toastr: ToastrService,
    protected zone: NgZone,
  ) {
    super()
  }

  ngOnInit(): void {
    this.blockService.selection$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((selection) => {
      this.selected = selection?.block === this.block
    })

    this.blockService.dragging$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((blockName) => {
      clearObject(this.slotsEnabled)

      if (blockName && this.blockService.blocks[this.block.name].slots) {
        Object.entries(this.blockService.blocks[this.block.name].slots!).forEach(
          ([slotName, slot]) => {
            this.slotsEnabled[slotName] = filterAllowedChildBlocks(
              slot.allowedChildBlocks,
              this.allowedBlocks,
              Object.values(this.blockService.blocks),
            ).includes(blockName)
          },
        )
      }
    })

    this.validator.update$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      this.errors = Object.keys(this.validator.errors).filter((key) => {
        return key.startsWith(this.block.id)
      }).length
    })

    this.updateAllowedChildBlocks()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['allowedBlocks'] && !changes['allowedBlocks'].isFirstChange) ||
      (changes['allowedChildBlocks'] && !changes['allowedChildBlocks'].isFirstChange)
    ) {
      this.updateAllowedChildBlocks()
    }

    if (changes['block']) {
      this.slots = Object.keys(this.blockService.blocks[this.block.name].slots ?? {})
    }
  }

  onSelect(): void {
    if (this.blockService.selection?.block.id !== this.block.id) {
      this.blockService.select(this.block)
    } else {
      window.dispatchEvent(new CustomEvent('click-selected-block'))
    }
  }

  protected updateAllowedChildBlocks(): void {
    this.allowedChildBlocks = filterAllowedChildBlocks(
      this.allowedChildBlocks,
      this.allowedBlocks,
      Object.values(this.blockService.blocks),
    )

    this.canConvertToPreset =
      this.config.can['readPresets'] &&
      this.config.can['createPresets'] &&
      this.allowedChildBlocks.includes('Preset')
  }

  addInnerBlock(slotName: string, slot: Slot): void {
    this.blockService.pick(
      this.block.children![slotName],
      this.block.children![slotName].length,
      filterAllowedChildBlocks(
        slot.allowedChildBlocks,
        this.allowedBlocks,
        Object.values(this.blockService.blocks),
      ),
    )
  }

  addInnerBlockIntoFirstSlot(): void {
    const slot = Object.keys(this.blockService.blocks[this.block.name].slots!)[0]

    this.blockService.pick(
      this.block.children![slot],
      this.block.children![slot].length,
      filterAllowedChildBlocks(
        this.blockService.blocks[this.block.name].slots![slot].allowedChildBlocks,
        this.allowedBlocks,
        Object.values(this.blockService.blocks),
      ),
    )
  }

  onDelete(): void {
    this.moreOptionsPopupVisible = false
    this.records.splice(this.index, 1)
    this.blockService.refreshSelection(this.records)
    this.changed.emit()
  }

  @HostListener('window:deleteblock')
  onDeleteHotkey(): void {
    if (this.selected) {
      this.onDelete()
    }
  }

  onDuplicate(): void {
    const duplicate = JSON.parse(JSON.stringify(this.block))
    this.blockService.changeBlockIds(duplicate)
    this.records.splice(this.index + 1, 0, duplicate)
    this.moreOptionsPopupVisible = false
    this.toastr.success(`Block <strong>${this.block.name}</strong> duplicated`)
    this.blockService.select(duplicate)
    setTimeout(() => document.getElementById(duplicate.id)?.focus())
    this.changed.emit()
  }

  @HostListener('window:duplicateblock')
  onDuplicateHotkey(): void {
    if (this.selected) {
      this.onDuplicate()
    }
  }

  async onCopy(): Promise<boolean> {
    try {
      const duplicate = JSON.parse(JSON.stringify(this.block))
      await navigator.clipboard.writeText(JSON.stringify(duplicate))
      this.toastr.success(`Block <strong>${this.block.name}</strong> copied to the clipboard`)
      this.moreOptionsPopupVisible = false
      return true
    } catch (_) {
      this.toastr.error('You must first allow the app access to the clipboard')
      return false
    }
  }

  @HostListener('window:copyblock')
  onCopyHotkey(): void {
    if (this.selected) {
      this.onCopy()
    }
  }

  async onCut(): Promise<void> {
    if (await this.onCopy()) {
      this.onDelete()
    }
  }

  @HostListener('window:cutblock')
  onCutHotkey(): void {
    if (this.selected) {
      this.onCut()
    }
  }

  async convertToPreset(): Promise<void> {
    this.moreOptionsPopupVisible = false
    this.convertToPresetPopupVisible = true
    this.presetTitle = ''
  }

  onConvertToPreset(): void {
    const block = JSON.parse(JSON.stringify(this.block))

    this.blockService.changeBlockIds(block)
    this.presetValidator.reset().lock()

    this.api
      .createPreset({
        title: this.presetTitle,
        blocks: [{ ...block }],
        language: this.config.currentLanguage,
      })
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (preset) => {
          delete this.block.children
          this.block.name = 'Preset'
          this.block.props = { preset: preset.id }
          this.blockService.changeBlockIds(this.block)
          this.presetValidator.unlock()
          this.convertToPresetPopupVisible = false
          this.canConvertToPreset = false
          this.slots = []
          this.toastr.success(`${this.config.presets.labels!.item!.singular} created`)
          this.blockService.select(this.block)
          this.changed.emit()
        },
        error: (response: HttpErrorResponse) => {
          this.presetValidator.reset()

          if (response.status === 422) {
            this.presetValidator.setFieldErrors(response.error)
          } else if (response.status === 400) {
            this.toastr.error(response.error.message)
          }

          const fieldNames = Object.keys(this.presetValidator.errors)

          if (fieldNames.length && fieldNames.every((fieldName) => fieldName !== 'title')) {
            this.toastr.error(
              `Please ensure all block fields are valid before converting the block to a ${lowercaseFirstLetter(
                this.config.presets.labels!.item!.singular,
              )}`,
            )
          }
        },
      })
  }

  async detachPreset(): Promise<void> {
    this.api
      .getPreset(this.block.props!['preset'])
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe((preset) => {
        let detached: number = 0
        let skipped: number = 0
        let firstBlock: BlockRecord | undefined
        let index = this.index

        for (const block of preset.blocks!) {
          if (this.allowedChildBlocks?.includes(block.name)) {
            this.blockService.changeBlockIds(block)

            if (!firstBlock) {
              firstBlock = block
              this.blockService.select(block)
            }

            this.records.splice(++index, 0, block)
            detached++
          } else {
            skipped++
          }
        }

        this.toastr.success(
          `Detached ${detached} ${detached === 1 ? 'block' : 'blocks'} from ${lowercaseFirstLetter(
            this.config.presets.labels!.item!.singular,
          )}${skipped ? ` (skipped ${skipped})` : ''}`,
        )

        this.moreOptionsPopupVisible = false
        this.onDelete()
      })
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.convertToPresetPopupVisible) {
      const action = getHotkeyAction(event)

      if (event.key === 'Enter' || event.code === 'Space') {
        event.stopPropagation()
        this.blockService.select(this.block)
      } else if (action === 'duplicate') {
        event.preventDefault()
        this.onDuplicate()
      } else if (action === 'copy') {
        event.preventDefault()
        this.onCopy()
      } else if (action === 'cut') {
        event.preventDefault()
        this.onCut()
      } else if (action === 'paste') {
        event.preventDefault()
        this.moreOptionsPopupVisible = false
      } else if (action === 'delete') {
        event.preventDefault()
        this.onDelete()
      }
    }
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
    this.moreOptionsPopupVisible = false
    this.convertToPresetPopupVisible = false
    this.endSorting()
  }
}
