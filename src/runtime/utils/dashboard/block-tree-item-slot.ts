import { type BlockName, type Slot } from '#pruvious'
import { defaultFieldValues } from '#pruvious/dashboard'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { __ } from '../../composables/translatable-strings'
import { isDefined } from '../../utils/common'
import { getProperty } from '../../utils/object'
import { titleCase } from '../../utils/string'
import type { BlockTree, BlocksRepeaterItem } from './block-tree'
import { BlockTreeItem } from './block-tree-item'

export class BlockTreeItemSlot {
  label: string = ''

  allowedBlocks: BlockName[] = []

  constructor(public slot: Slot, public slotName: string, public tree: BlockTree, public treeItem: BlockTreeItem) {
    this.label = this.resolveSlotLabel()
    this.allowedBlocks = this.resolveAllowedChildBlocksInSlot()
  }

  addBlock(blockName: BlockName, index?: number) {
    const dashboard = usePruviousDashboard()
    const data = getProperty<BlocksRepeaterItem[]>(
      { [this.tree.blocksField]: this.tree.data },
      `${this.treeItem.key}.block.slots.${this.slotName}`,
    )
    const key = `${this.treeItem.key}.block.slots.${this.slotName}.${index ?? data.length}`
    const newBlock: BlocksRepeaterItem = {
      block: {
        name: blockName,
        fields: {},
        slots: Object.fromEntries(Object.keys(dashboard.value.blocks[blockName].slots).map((slot) => [slot, []])),
      } as any,
    }

    for (const [fieldName, field] of Object.entries(dashboard.value.blocks[blockName].fields)) {
      ;(newBlock.block.fields as any)[fieldName] = isDefined(field.options.default)
        ? field.options.default
        : defaultFieldValues[field.type]
    }

    const item = new BlockTreeItem(newBlock, key, this.tree)

    if (isDefined(index)) {
      this.tree.mutateBlockKeysAfterIndex(index - 1, 1, `${this.treeItem.key}.block.slots.${this.slotName}`)
      data.splice(index, 0, newBlock)
      this.tree.blocks[key] = item
    } else {
      data.push(newBlock)
      this.tree.blocks[key] = item
    }

    return key
  }

  resolveAllowedChildBlocksInSlot() {
    const dashboard = usePruviousDashboard()
    const blockName = this.treeItem.item.block.name
    const cacheKey = `${blockName}.${this.slotName}`

    if (!this.tree.allowedChildBlocksInSlotCache[cacheKey]) {
      const allowedChildBlocks =
        !this.slot.allowedChildBlocks || this.slot.allowedChildBlocks === '*'
          ? (Object.keys(dashboard.value.blocks) as BlockName[])
          : this.slot.allowedChildBlocks

      this.tree.allowedChildBlocksInSlotCache[cacheKey] = [this.tree.allowedBlocks, allowedChildBlocks].reduce(
        (prev, curr) => prev.filter((block) => curr.includes(block)),
      )
    }

    return this.tree.allowedChildBlocksInSlotCache[cacheKey]
  }

  private resolveSlotLabel() {
    if (!this.tree.slotLabelCache[this.slotName]) {
      this.tree.slotLabelCache[this.slotName] = __(
        'pruvious-dashboard',
        this.slot.label ?? (titleCase(this.slotName, false) as any),
      )
    }

    return this.tree.slotLabelCache[this.slotName]
  }
}
