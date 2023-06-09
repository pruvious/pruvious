import { camelToLabel, uppercaseFirstLetter } from '@pruvious/utils'
import { Block, BlockRecord, PageRecord, Pages } from './types'

export function filterAllowedChildBlocks(
  allowedChildBlocks: string[] | '*' | undefined,
  allowedBlocks: string[] | '*' | undefined,
  blocks: Block[],
): string[] {
  const result: string[] =
    !allowedChildBlocks || allowedChildBlocks === '*'
      ? blocks.map((block) => block.name)
      : allowedChildBlocks

  if (!allowedBlocks || allowedBlocks === '*') {
    return result
  }

  return result.filter((blockName) => allowedBlocks.includes(blockName))
}

export function getAllowedPageBlocks(
  page: Partial<PageRecord>,
  pageConfig: Pages,
  blocks: Block[],
) {
  const allowedBlocksByTypeConfig =
    page.type && pageConfig.types && pageConfig.types[page.type]
      ? pageConfig.types[page.type].allowedBlocks
      : '*'
  const allowedRootBlocksByTypeConfig =
    page.type && pageConfig.types && pageConfig.types[page.type]
      ? pageConfig.types[page.type].rootBlocks
      : '*'
  const allowedBlocksByLayoutConfig =
    page.type &&
    page.layout &&
    pageConfig.types &&
    pageConfig.types[page.type] &&
    pageConfig.types[page.type].layouts &&
    pageConfig.types[page.type].layouts![page.layout]
      ? pageConfig.types[page.type].layouts![page.layout].allowedBlocks
      : '*'
  const allowedRootBlocksByLayoutConfig =
    page.type &&
    page.layout &&
    pageConfig.types &&
    pageConfig.types[page.type] &&
    pageConfig.types[page.type].layouts &&
    pageConfig.types[page.type].layouts![page.layout]
      ? pageConfig.types[page.type].layouts![page.layout].rootBlocks
      : '*'
  const allowedRootBlocksByType = filterAllowedChildBlocks(
    allowedRootBlocksByTypeConfig,
    allowedBlocksByTypeConfig,
    blocks,
  )
  const allowedRootBlocksByLayout = filterAllowedChildBlocks(
    allowedRootBlocksByLayoutConfig,
    allowedBlocksByLayoutConfig,
    blocks,
  )
  const blockNames = blocks.map((block) => block.name)

  const allowedBlocks = blockNames.filter((blockName) => {
    return (
      (!allowedBlocksByTypeConfig ||
        allowedBlocksByTypeConfig === '*' ||
        allowedBlocksByTypeConfig.includes(blockName)) &&
      (!allowedBlocksByLayoutConfig ||
        allowedBlocksByLayoutConfig === '*' ||
        allowedBlocksByLayoutConfig.includes(blockName))
    )
  })

  const rootBlocks = blockNames.filter((blockName) => {
    return (
      allowedRootBlocksByType.includes(blockName) && allowedRootBlocksByLayout.includes(blockName)
    )
  })

  return { allowedBlocks, rootBlocks }
}

export function sanitizeAllowedBlocks(
  blockRecords: BlockRecord[],
  blocks: Block[],
  allowedBlocks: string[],
  allowedChildBlocks: string[],
  parentBlock?: Block,
  slotName?: string,
): {
  sanitizedBlockRecords: BlockRecord[]
  errors: { blockId: string; message: string }[]
} {
  const errors: { blockId: string; message: string }[] = []

  const sanitized = JSON.parse(JSON.stringify(blockRecords)).filter((blockRecord: BlockRecord) => {
    const block = blocks.find((block) => block.name === blockRecord.name)

    if (!block) {
      errors.push({ blockId: blockRecord.id, message: `Unknown block name: '${blockRecord.name}'` })

      return false
    } else if (!allowedChildBlocks.includes(blockRecord.name)) {
      if (parentBlock) {
        errors.push({
          blockId: blockRecord.id,
          message: `The block '${block.label!.replace(
            /'/g,
            '&#39;',
          )}' cannot be nested in slot '${slotName}' of block '${parentBlock.label!.replace(
            /'/g,
            '&#39;',
          )}'`,
        })
      } else {
        errors.push({
          blockId: blockRecord.id,
          message: `The block '${block.label!.replace(/'/g, '&#39;')}' cannot be a root block`,
        })
      }

      return false
    }

    Object.entries(block.slots ?? {}).forEach(([slotName, slot]) => {
      if (blockRecord.children && blockRecord.children[slotName]?.length) {
        const result = sanitizeAllowedBlocks(
          blockRecord.children![slotName],
          blocks,
          allowedBlocks,
          filterAllowedChildBlocks(slot.allowedChildBlocks, allowedBlocks, blocks),
          block,
          slot.label || uppercaseFirstLetter(camelToLabel(slotName)),
        )

        blockRecord.children[slotName] = result.sanitizedBlockRecords

        errors.push(...result.errors)
      }
    })

    if (block.name === 'Preset' && Array.isArray(blockRecord.props?.preset?.blocks)) {
      const result = sanitizeAllowedBlocks(
        blockRecord.props!.preset.blocks,
        blocks,
        allowedBlocks,
        allowedChildBlocks,
        parentBlock,
        slotName,
      )

      blockRecord.props!.preset.blocks = result.sanitizedBlockRecords

      errors.push(...result.errors)
    }

    return true
  })

  return { sanitizedBlockRecords: sanitized, errors }
}
