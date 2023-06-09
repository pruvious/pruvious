import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import {
  BlockRecord,
  ConditionalLogic,
  PresetField,
  nanoid,
  walkBlocks,
} from '@pruvious/shared'
import { Debounce, clearArray, isNumeric } from '@pruvious/utils'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService } from 'src/app/services/api.service'
import { BlockService } from 'src/app/services/block.service'
import { ConfigService } from 'src/app/services/config.service'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-preset-field',
  templateUrl: './preset-field.component.html',
})
export class PresetFieldComponent extends BaseComponent implements OnInit {
  @Input()
  field!: PresetField

  @Input()
  records!: Record<string, any>

  @Input()
  validator!: Validator

  @Input()
  conditionalLogic!: ConditionalLogic

  @Input()
  language?: string

  @Input()
  disabled: boolean = false

  @Input()
  idPrefix: string = ''

  @Input()
  key: string = ''

  @Input()
  blocks?: BlockRecord[]

  @Input()
  allowedBlocks?: string[]

  @Input()
  rootBlocks?: string[]

  @Output()
  changed = new EventEmitter<void>()

  record: Record<string, any> | null = null

  errors: { blockId: string; blockName: string; message: string }[] = []

  protected counter: number = 0

  constructor(
    protected config: ConfigService,
    protected api: ApiService,
    protected blockService: BlockService,
  ) {
    super()
  }

  ngOnInit(): void {
    this.blockService.selection$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      clearArray(this.errors)
      this.onRecordChange(this.record)
    })
  }

  @Debounce(50)
  onRecordChange(record: Record<string, any> | null): void {
    this.record = record

    const counter = ++this.counter

    clearArray(this.errors)

    if (
      this.key.startsWith('blocks.') &&
      this.key.endsWith('#Preset') &&
      record &&
      record['blocks']
    ) {
      this.api
        .validateAllowedBlocks(
          this.extractPresetBlock(JSON.parse(JSON.stringify(this.blocks ?? []))),
          this.allowedBlocks ?? Object.keys(this.blockService.blocks),
          this.rootBlocks ?? Object.keys(this.blockService.blocks),
        )
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe(({ errors }) => {
          if (counter === this.counter && this.record) {
            for (const { record } of walkBlocks(
              this.record['blocks'],
              Object.values(this.blockService.blocks),
            )) {
              const blockName =
                this.blockService.blocks[record.name]?.label!.replace(/'/g, '&#39;') ?? record.name
              const filteredErrors = errors
                .filter((error) => {
                  return error.blockId === record.id || error.blockId === this.idPrefix.slice(0, -1)
                })
                .map((error) => ({
                  blockName,
                  blockId: record.id,
                  message: error.message.replace(
                    /^The block '(.+?)' cannot (.+)$/,
                    `The block '${blockName}' cannot $2`,
                  ),
                }))

              for (const error of filteredErrors) {
                if (
                  this.errors.every((_error) => {
                    return _error.blockId !== error.blockId && _error.message !== error.message
                  })
                ) {
                  this.errors.push(error)
                }
              }
            }
          }
        })
    }
  }

  protected extractPresetBlock(blockRecords: BlockRecord[]): BlockRecord[] {
    let topBlock: BlockRecord | undefined
    let currentBlock: BlockRecord | undefined

    try {
      const slicedKey = this.key.slice(7, -7)

      if (isNumeric(slicedKey)) {
        return [blockRecords[+slicedKey]]
      }

      for (const part of slicedKey.split('.')) {
        const match = part.match(/^([0-9]+)#([a-z0-9]+):([a-z0-9]+)$/i)

        if (!match) {
          break
        }

        const block: BlockRecord = {
          id: 'blocks-' + nanoid(),
          name: match[2],
          children: {},
        }

        block.children![match[3]] = []

        if (currentBlock) {
          const slot = Object.keys(currentBlock.children!)[0]
          currentBlock.children![slot].push(block)
        }

        currentBlock = block

        if (!topBlock) {
          topBlock = currentBlock
        }
      }

      if (currentBlock) {
        const slot = Object.keys(currentBlock.children!)[0]

        currentBlock.children![slot].push({
          id: 'blocks-' + nanoid(),
          name: 'Preset',
          props: { preset: this.record!['id'] },
        })
      }
    } catch (_) {}

    return topBlock ? [topBlock] : []
  }
}
