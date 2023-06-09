import { Injectable } from '@angular/core'
import { Block, BlockRecord, nanoid } from '@pruvious-test/shared'
import { BehaviorSubject, Observable } from 'rxjs'
import { ApiService } from 'src/app/services/api.service'

export interface AddBlock {
  list: BlockRecord[]
  position: number
  allowedBlocks: string[] | '*'
}

@Injectable()
export class BlockService {
  blocks: Record<string, Block> = {}

  get selection() {
    return this._selection$.getValue()
  }
  get selection$(): Observable<{ block: BlockRecord; refreshed: boolean } | undefined> {
    return this._selection$.asObservable()
  }
  protected _selection$ = new BehaviorSubject<
    { block: BlockRecord; refreshed: boolean } | undefined
  >(undefined)

  get pick$(): Observable<AddBlock | undefined> {
    return this._pick$.asObservable()
  }
  protected _pick$ = new BehaviorSubject<AddBlock | undefined>(undefined)

  get dragging$(): Observable<string | null> {
    return this._dragging$.asObservable()
  }
  get dragging(): string | null {
    return this._dragging$.getValue()
  }
  set dragging(value: string | null) {
    this._dragging$.next(value)
    this.isDragging = !!value
  }
  protected _dragging$ = new BehaviorSubject<string | null>(null)
  isDragging: boolean = false

  constructor(protected api: ApiService) {}

  pick(list: BlockRecord[], position: number, allowedBlocks?: string[] | '*'): void {
    this._pick$.next({ list, position, allowedBlocks: allowedBlocks ?? '*' })
  }

  stopPicking(): void {
    this._pick$.next(undefined)
  }

  select(block: BlockRecord): void {
    this._selection$.next({ block, refreshed: false })
  }

  selectById(id: string | undefined, blocks: BlockRecord[]): void {
    const block = this.getBlockById(id, blocks)

    if (block) {
      this._selection$.next({ block, refreshed: false })
    } else {
      this._selection$.next(undefined)
    }
  }

  refreshSelection(blocks: BlockRecord[]): void {
    const block = this.getBlockById(this._selection$.getValue()?.block.id, blocks)

    if (block) {
      this._selection$.next({ block, refreshed: true })
    } else {
      this._selection$.next(undefined)
    }
  }

  deselect(): void {
    this._selection$.next(undefined)
  }

  getBlockById(id: string | undefined, blocks: BlockRecord[]): BlockRecord | undefined {
    if (!id) {
      return undefined
    }

    for (const block of blocks) {
      if (block.id === id) {
        return block
      }

      for (const slot of Object.keys(block.children ?? {})) {
        const match = this.getBlockById(id, block.children![slot])

        if (match) {
          return match
        }
      }
    }

    return undefined
  }

  getBlockListkById(id: string | undefined, blocks: BlockRecord[]): BlockRecord[] | undefined {
    if (!id) {
      return undefined
    }

    for (const block of blocks) {
      if (block.id === id) {
        return blocks
      }

      for (const slot of Object.keys(block.children ?? {})) {
        const match = this.getBlockListkById(id, block.children![slot])

        if (match) {
          return match
        }
      }
    }

    return undefined
  }

  changeBlockIds(block: BlockRecord) {
    block.id = 'block-' + nanoid()

    for (const childBlocks of Object.values(block.children ?? {})) {
      for (const childBlock of childBlocks) {
        this.changeBlockIds(childBlock)
      }
    }
  }

  resolveBlockKey(
    blockRecord: BlockRecord,
    blockRecords: BlockRecord[],
    key: string = 'blocks',
  ): string {
    let i: number = 0

    for (const _blockRecord of blockRecords) {
      if (blockRecord.id === _blockRecord.id) {
        return `${key}.${i}#${_blockRecord.name}`
      }

      for (const [slot, childRecords] of Object.entries(_blockRecord.children ?? {})) {
        const match = this.resolveBlockKey(
          blockRecord,
          childRecords,
          `${key}.${i}#${_blockRecord.name}:${slot}`,
        )

        if (match) {
          return match
        }
      }

      i++
    }

    return ''
  }

  parseStringifiedBlock(value: string): BlockRecord | null {
    try {
      const block: BlockRecord = JSON.parse(value)

      if (block.id && this.blocks[block.name]) {
        return block
      }

      return null
    } catch (_) {
      return null
    }
  }

  reset(): void {
    this.stopPicking()
    this.deselect()
  }
}
