import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core'
import { Block, BlockRecord, getDefaultFieldValue, nanoid } from '@pruvious/shared'
import { ToastrService } from 'ngx-toastr'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { AddBlock, BlockService } from 'src/app/services/block.service'
import { getHotkeyAction } from 'src/app/utils/hotkeys'

@Component({
  selector: 'app-add-block',
  templateUrl: './add-block.component.html',
  styleUrls: ['./add-block.component.css'],
})
export class AddBlockComponent extends BaseComponent implements AfterViewInit, OnDestroy {
  @Output()
  changed = new EventEmitter<void>()

  @ViewChild('container')
  containerEl!: ElementRef<HTMLDivElement>

  pick?: AddBlock

  initialized: boolean = false

  get visible(): boolean {
    return this._visible
  }
  set visible(value: boolean) {
    if (!value && this.pick) {
      this.blockService.stopPicking()
    }

    this._visible = value
  }
  protected _visible: boolean = false

  canPaste: boolean = false

  allowedBlocks: Record<string, boolean> = {}

  blocks: Record<string, Block> = {}

  filteredBlocks: Record<string, Block> = {}

  search: string = ''

  constructor(public blockService: BlockService, protected toastr: ToastrService) {
    super()
  }

  ngAfterViewInit(): void {
    this.blockService.pick$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((pick) => {
      this.pick = pick

      if (pick) {
        this.blocks = {}

        for (const block of Object.values(this.blockService.blocks)) {
          this.allowedBlocks[block.name] =
            pick.allowedBlocks === '*' || pick.allowedBlocks.includes(block.name)

          if (this.allowedBlocks[block.name]) {
            this.blocks[block.name] = block
          }
        }

        this.visible = true
        this.canPaste = false
        this.search = ''
        this.onSearch()

        navigator.clipboard
          .readText()
          .then((payload) => {
            const block = this.blockService.parseStringifiedBlock(payload)

            if (block) {
              if (
                block &&
                (this.pick?.allowedBlocks === '*' || this.pick?.allowedBlocks.includes(block!.name))
              ) {
                this.canPaste = true
              }
            }
          })
          .catch(() => null)
      }
    })

    setTimeout(() => {
      this.initialized = true
    })
  }

  onSearch(): void {
    const keywords = this.search
      .split(' ')
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean)

    this.filteredBlocks = {}

    for (const block of Object.values(this.blocks)) {
      if (
        keywords.every(
          (keyword) =>
            block.name.toLowerCase().includes(keyword) ||
            block.label!.toLowerCase().includes(keyword),
        )
      ) {
        this.filteredBlocks[block.name] = block
      }
    }
  }

  add(block: Block): void {
    if (this.pick) {
      const props: BlockRecord['props'] = {}
      const children: BlockRecord['children'] = Object.keys(block.slots ?? {}).length
        ? {}
        : undefined

      block.fields.forEach((field) => {
        props[field.name] = getDefaultFieldValue(field)
      })

      Object.keys(block.slots ?? {}).forEach((slot) => {
        children![slot] = []
      })

      const newBlockRecord = {
        id: 'block-' + nanoid(),
        name: block.name,
        props,
        children,
      }

      this.pick.list.splice(this.pick.position, 0, newBlockRecord)
      this.visible = false
      this.blockService.select(newBlockRecord)
      this.changed.emit()
    }
  }

  async onPaste(): Promise<void> {
    if (this.pick) {
      let payload: string = ''

      try {
        payload = await navigator.clipboard.readText()
      } catch (_) {
        this.toastr.error('You must first allow the app access to the clipboard')
      }

      if (payload) {
        const block = this.blockService.parseStringifiedBlock(payload)

        if (
          block &&
          (this.pick.allowedBlocks === '*' || this.pick.allowedBlocks.includes(block!.name))
        ) {
          this.blockService.changeBlockIds(block)
          this.pick.list.splice(this.pick.position, 0, block)
          this.visible = false
          this.blockService.select(block)
          this.changed.emit()
          setTimeout(() => document.getElementById(block.id)?.focus())
        }
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.visible && this.canPaste && getHotkeyAction(event) === 'paste') {
      this.onPaste()
    }
  }
}
