import { blocks } from '#pruvious/blocks'
import type { BlocksRepeaterItem, BlockTree } from './block-tree'
import { BlockTreeItemSlot } from './block-tree-item-slot'

export class BlockTreeItem {
  errorCount: number = 0

  errorMessage: string | null = null

  parentKey: string = ''

  slots: Record<string, BlockTreeItemSlot> = {}

  constructor(public item: BlocksRepeaterItem, public key: string, public tree: BlockTree) {
    this.setKey(key)

    for (const [slotName, slot] of Object.entries(blocks[item.block.name].slots)) {
      this.slots[slotName] = new BlockTreeItemSlot(slot, slotName, tree, this)

      for (const [i, childBlock] of ((item.block.slots as any)[slotName] as BlocksRepeaterItem[]).entries()) {
        const childBlockKey = `${this.key}.block.slots.${slotName}.${i}`
        tree.blocks[childBlockKey] = new BlockTreeItem(childBlock, childBlockKey, tree)
      }
    }
  }

  setKey(key: string) {
    this.key = key
    this.parentKey = key.split('.').slice(0, -1).join('.')

    return this
  }
}
