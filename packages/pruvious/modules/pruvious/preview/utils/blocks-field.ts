import type {
  BlockGroupName,
  BlockName,
  BlockTagName,
  DynamicBlockFieldTypes,
  SerializableFieldOptions,
} from '#pruvious/server'
import { castToNumber, getProperty, isArray, isInteger, isNumber, isObject, isUndefined, last } from '@pruvious/utils'
import { usePruviousRoute } from '../../routes/composable'
import { usePreviewState } from './state'

interface CommonResolveBlocksFieldInfo<TBlockName extends BlockName> {
  /**
   * The full path (using dot notation) to the parent block that contains the `blocksField({})`.
   *
   * When `null`, the `blocksField()` is at the root level of a collection or singleton.
   */
  blockPath: string | null

  /**
   * The name of the parent block that contains the `blocksField({})`.
   *
   * When `null`, the `blocksField()` is at the root level of a collection or singleton.
   */
  blockName: TBlockName | null

  /**
   * The block data of the parent block that contains the `blocksField({})`, resolved from the current route data.
   *
   * When `null`, the `blocksField()` is at the root level of a collection or singleton.
   */
  blockData: DynamicBlockFieldTypes['Populated'][TBlockName] | null

  /**
   * The list of blocks allowed as children.
   * This list is resolved from the parent field's options like `allowNestedBlocks`, `denyNestedBlocks`, `allowRootBlocks`, and `denyRootBlocks`.
   */
  allowedChildBlocks: BlockName[]

  /**
   * Checks whether the `blocksField({})` can have more children based on its `maxItems` option and current data.
   */
  canHaveMoreChildren: () => boolean
}

export interface ResolvedBlocksFieldInfo<
  TBlockName extends BlockName,
> extends CommonResolveBlocksFieldInfo<TBlockName> {
  /**
   * The full path (using dot notation) of the `blocksField({})`.
   */
  fieldPath: string

  /**
   * The name of the `blocksField({})`.
   */
  fieldName: string

  /**
   * Field options of the `blocksField({})`.
   */
  fieldOptions: SerializableFieldOptions<'blocks'>

  /**
   * Array of blocks contained in the `blocksField({})`.
   */
  fieldData: DynamicBlockFieldTypes['Populated'][BlockName][]
}

export interface ResolvedParentBlocksFieldInfo<
  TBlockName extends BlockName,
> extends CommonResolveBlocksFieldInfo<TBlockName> {
  /**
   * The full path (using dot notation) to the `blocksField({})` that contains the `childBlockPath`.
   */
  fieldPath: string

  /**
   * The name of the `blocksField({})` that contains the `childBlockPath`.
   */
  fieldName: string

  /**
   * Field options of the `blocksField({})` that contains the `childBlockPath`.
   */
  fieldOptions: SerializableFieldOptions<'blocks'>

  /**
   * Array of sibling blocks contained in the same `blocksField({})` as the `childBlockPath`.
   */
  fieldData: DynamicBlockFieldTypes['Populated'][BlockName][]

  /**
   * Path to the child block.
   *
   * - If you pass a child block path to this function, this will be that same path.
   * - If you pass a field path to this function, this will be the path to the block containing that field.
   */
  childBlockPath: string

  /**
   * The index of the child block in the `fieldData` array of the parent `blocksField({})`.
   */
  index: number
}

export function resolveBlocksField<TBlockName extends BlockName>(
  blocksFieldPath: string,
): ResolvedBlocksFieldInfo<TBlockName> | null {
  const proute = usePruviousRoute()

  if (!proute.value) {
    return null
  }

  const { parsedFields, blocks } = usePreviewState()
  const blockNames = Object.keys(blocks.value)
  const pathParts = blocksFieldPath.split('.')
  const fieldName = last(pathParts)
  const fieldOptions = parsedFields.value[blocksFieldPath] as SerializableFieldOptions<'blocks'> | undefined
  const fieldData = getProperty<DynamicBlockFieldTypes['Populated'][TBlockName][]>(proute.value.data, blocksFieldPath)

  if (isUndefined(fieldName) || fieldOptions?._fieldType !== 'blocks' || isUndefined(fieldData)) {
    return null
  }

  let blockPath: string | null = null
  let blockName: TBlockName | null = null
  let blockData: DynamicBlockFieldTypes['Populated'][TBlockName] | null = null

  while (pathParts.pop()) {
    const path = pathParts.join('.')
    const data = getProperty(proute.value.data, path)

    if (isObject(data) && blockNames.includes(data.$key)) {
      blockPath = path
      blockName = data.$key as TBlockName
      blockData = data as DynamicBlockFieldTypes['Populated'][TBlockName]
      break
    }
  }

  return {
    fieldPath: blocksFieldPath,
    fieldName,
    fieldOptions,
    fieldData,
    blockPath,
    blockName,
    blockData,
    allowedChildBlocks: resolveAllowedChildBlocks(pathParts, fieldOptions),
    canHaveMoreChildren: () => blocksFieldCanHaveMoreChildren(blocksFieldPath, fieldOptions.maxItems),
  }
}

export function resolveParentBlocksField<TBlockName extends BlockName>(
  childBlockPath: string,
): ResolvedParentBlocksFieldInfo<TBlockName> | null {
  const proute = usePruviousRoute()

  if (!proute.value) {
    return null
  }

  const { parsedFields, blocks } = usePreviewState()
  const blockNames = Object.keys(blocks.value)
  const pathParts = childBlockPath.split('.')

  let fieldPath: string | undefined
  let fieldName: string | undefined
  let fieldOptions: SerializableFieldOptions<'blocks'> | undefined
  let fieldData: DynamicBlockFieldTypes['Populated'][TBlockName][] | undefined
  let blockPath: string | null = null
  let blockName: TBlockName | null = null
  let blockData: DynamicBlockFieldTypes['Populated'][TBlockName] | null = null
  let realChildBlockPath: string | undefined

  while (pathParts.pop()) {
    const path = pathParts.join('.')

    if (parsedFields.value[path]?._fieldType === 'blocks') {
      fieldPath = path
      fieldName = last(pathParts)
      fieldOptions = parsedFields.value[path] as SerializableFieldOptions<'blocks'>
      fieldData = getProperty<DynamicBlockFieldTypes['Populated'][TBlockName][]>(proute.value.data, path)
      break
    } else if (isUndefined(realChildBlockPath)) {
      const data = getProperty(proute.value.data, path)
      if (isObject(data) && blockNames.includes(data.$key)) {
        realChildBlockPath = path
      }
    }
  }

  if (isUndefined(realChildBlockPath)) {
    realChildBlockPath = childBlockPath
  }

  const index = castToNumber(realChildBlockPath.split('.').pop())

  if (!isInteger(index) || index < 0) {
    return null
  }

  while (pathParts.pop()) {
    const path = pathParts.join('.')
    const data = getProperty(proute.value.data, path)

    if (isObject(data) && blockNames.includes(data.$key)) {
      blockPath = path
      blockName = data.$key as TBlockName
      blockData = data as DynamicBlockFieldTypes['Populated'][TBlockName]
      break
    }
  }

  if (isUndefined(fieldPath) || isUndefined(fieldName) || isUndefined(fieldOptions) || isUndefined(fieldData)) {
    return null
  }

  return {
    fieldPath,
    fieldName,
    fieldOptions,
    fieldData,
    blockPath,
    blockName,
    blockData,
    allowedChildBlocks: resolveAllowedChildBlocks(pathParts, fieldOptions),
    canHaveMoreChildren: () => blocksFieldCanHaveMoreChildren(fieldPath, fieldOptions.maxItems),
    childBlockPath: realChildBlockPath,
    index,
  }
}

export function resolveAllParentBlocksFields<TBlockName extends BlockName>(
  childBlockPath: string,
): ResolvedParentBlocksFieldInfo<TBlockName>[] {
  const parents: ResolvedParentBlocksFieldInfo<TBlockName>[] = []

  let currentPath: string | null = childBlockPath

  while (currentPath) {
    // @ts-expect-error
    const parent = resolveParentBlocksField<TBlockName>(currentPath)

    if (parent) {
      parents.push(parent)
      currentPath = parent.fieldPath
    } else {
      currentPath = null
    }
  }

  return parents
}

function resolveAllowedChildBlocks(pathParts: string[], fieldOptions: SerializableFieldOptions<'blocks'>): BlockName[] {
  const { parsedFields, blocks } = usePreviewState()
  const blockNames = Object.keys(blocks.value)
  const resolveList = (item: string) => {
    if (item.startsWith('group:')) {
      const groupName = item.slice(6) as BlockGroupName
      return blockNames.filter((blockName) => blocks.value[blockName]?.group === groupName)
    } else if (item.startsWith('tag:')) {
      const tagName = item.slice(4) as BlockTagName
      return blockNames.filter((blockName) => blocks.value[blockName]?.tags.includes(tagName))
    }
    return [item]
  }

  let allowBlocks: string[] = blockNames
  let denyBlocks: string[] = []

  for (let i = 0; i < pathParts.length - 1; i++) {
    const path = pathParts.slice(0, i + 1).join('.')
    const options = parsedFields.value[path] as SerializableFieldOptions<'blocks'> | undefined

    if (options?._fieldType === 'blocks') {
      if (isArray(options.allowNestedBlocks)) {
        const allowedAtThisLevel = options.allowNestedBlocks.flatMap(resolveList)
        allowBlocks = allowBlocks.filter((item) => allowedAtThisLevel.includes(item))
      }

      if (isArray(options.denyNestedBlocks)) {
        const deniedAtThisLevel = options.denyNestedBlocks.flatMap(resolveList)
        denyBlocks = [...denyBlocks, ...deniedAtThisLevel]
      }
    }
  }

  if (isArray(fieldOptions.allowRootBlocks)) {
    const allowedAtRoot = fieldOptions.allowRootBlocks.flatMap(resolveList)
    allowBlocks = allowBlocks.filter((blockName) => allowedAtRoot.includes(blockName))
  }

  if (isArray(fieldOptions.denyRootBlocks)) {
    const deniedAtRoot = fieldOptions.denyRootBlocks.flatMap(resolveList)
    denyBlocks = [...denyBlocks, ...deniedAtRoot]
  }

  return allowBlocks.filter((blockName) => !denyBlocks.includes(blockName)) as BlockName[]
}

export function blocksFieldCanHaveMoreChildren(blocksFieldPath: string, maxItems: number | false): boolean {
  const proute = usePruviousRoute()

  if (isNumber(maxItems)) {
    const array = getProperty<Record<string, any>[] | undefined>(proute.value?.data ?? {}, blocksFieldPath)

    if (isArray(array)) {
      return array.length < maxItems
    } else {
      return false
    }
  }

  return true
}
