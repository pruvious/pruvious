import { i18n } from '#pruvious/app/i18n'
import type { BlockName, DynamicBlockFieldTypes } from '#pruvious/server'
import { deepClone, defu, getProperty, isArray, remap, setProperty } from '@pruvious/utils'
import { parseFields } from '../../fields/utils.client'
import { usePruviousRoute } from '../../routes/composable'
import { resolveAllParentBlocksFields, resolveBlocksField, resolveParentBlocksField } from './blocks-field'
import { getAllDOMBlocks, getDOMBlock, resolveFocusedBlocks, scrollToElement } from './dom'
import { messageDashboard } from './messages'
import { focusEditableField } from './rich-text'
import { usePreviewState } from './state'

export function insertBlock(
  target: string,
  index: number,
  data: Partial<DynamicBlockFieldTypes['Casted'][BlockName]> & { $key: BlockName },
): DynamicBlockFieldTypes['Casted'][BlockName] | null {
  const proute = usePruviousRoute()
  const { dashboardLanguage, publicFields, parsedFields, blocks } = usePreviewState()

  if (!proute.value) {
    return null
  }

  const blocksField = resolveBlocksField(target) ?? resolveParentBlocksField(target)

  if (!blocksField) {
    messageDashboard('iframe:toast', {
      type: 'error',
      title: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Error while inserting block'),
      message: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Unable to resolve blocks field at `$path`.', {
        path: target,
      }),
    })
    return null
  }

  if (!blocksField.canHaveMoreChildren() || !blocksField.allowedChildBlocks.includes(data.$key)) {
    return null
  }

  const block = blocks.value[data.$key]

  if (!block) {
    messageDashboard('iframe:toast', {
      type: 'error',
      title: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Error while inserting block'),
      message: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Block `$key` does not exist.', {
        key: data.$key,
      }),
    })
    return null
  }

  const defaultData = {
    $key: data.$key,
    ...remap(block.fields, (fieldName, options) => [fieldName, deepClone(options.default)]),
  }
  const resolvedData = defu(data, defaultData) as any

  blocksField.fieldData.splice(index, 0, resolvedData)

  if (proute.value.data._casted) {
    getProperty<DynamicBlockFieldTypes['Casted'][BlockName][] | undefined>(
      proute.value.data._casted,
      blocksField.fieldPath,
    )?.splice(index, 0, deepClone(resolvedData))
    parsedFields.value = parseFields(publicFields.value, proute.value.data._casted)
  }

  return resolvedData
}

export function insertSiblingBlock(
  target: string,
  position: 'before' | 'after',
  data: Partial<DynamicBlockFieldTypes['Casted'][BlockName]> & { $key: BlockName },
): DynamicBlockFieldTypes['Casted'][BlockName] | null {
  const proute = usePruviousRoute()
  const { dashboardLanguage } = usePreviewState()

  if (!proute.value) {
    return null
  }

  const blocksField = resolveParentBlocksField(target)

  if (!blocksField) {
    messageDashboard('iframe:toast', {
      type: 'error',
      title: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Error while inserting sibling block'),
      message: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Unable to resolve blocks field at `$path`.', {
        path: target,
      }),
    })
    return null
  }

  return insertBlock(blocksField.fieldPath, position === 'before' ? blocksField.index : blocksField.index + 1, data)
}

export function moveBlock(target: string, offset: number): string | null {
  const proute = usePruviousRoute()
  const { dashboardLanguage, publicFields, parsedFields } = usePreviewState()

  if (!proute.value) {
    return null
  }

  const blocksField = resolveParentBlocksField(target)

  if (!blocksField) {
    messageDashboard('iframe:toast', {
      type: 'error',
      title: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Error while moving block'),
      message: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Unable to resolve blocks field at `$path`.', {
        path: target,
      }),
    })
    return null
  }

  const block = blocksField.fieldData[blocksField.index]!
  const newIndex = blocksField.index + offset

  if (newIndex < 0 || newIndex >= blocksField.fieldData.length) {
    return null
  }

  blocksField.fieldData.splice(blocksField.index, 1)
  blocksField.fieldData.splice(newIndex, 0, block)

  if (proute.value.data._casted) {
    const castedBlocks = getProperty<DynamicBlockFieldTypes['Casted'][BlockName][] | undefined>(
      proute.value.data._casted,
      blocksField.fieldPath,
    )
    const castedBlock = castedBlocks ? castedBlocks[blocksField.index] : null

    if (castedBlocks && castedBlock) {
      castedBlocks.splice(blocksField.index, 1)
      castedBlocks.splice(newIndex, 0, castedBlock)
      parsedFields.value = parseFields(publicFields.value, proute.value.data._casted)
    }
  }

  return `${blocksField.fieldPath}.${newIndex}`
}

export function updateBlockField(fieldPath: string, value: any) {
  const proute = usePruviousRoute()
  const { publicFields, parsedFields } = usePreviewState()

  if (!proute.value) {
    return
  }

  setProperty(proute.value.data, fieldPath, value)

  if (proute.value.data._casted) {
    const prevValue = getProperty(proute.value.data._casted, fieldPath)
    setProperty(proute.value.data._casted, fieldPath, deepClone(value))

    if (isArray(prevValue) && isArray(value) && prevValue.length !== value.length) {
      parsedFields.value = parseFields(publicFields.value, proute.value.data._casted)
    }
  }
}

export function duplicateBlock(target: string): string | null {
  const proute = usePruviousRoute()
  const { dashboardLanguage, publicFields, parsedFields } = usePreviewState()

  if (!proute.value) {
    return null
  }

  const blocksField = resolveParentBlocksField(target)

  if (!blocksField) {
    messageDashboard('iframe:toast', {
      type: 'error',
      title: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Error while duplicating block'),
      message: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Unable to resolve blocks field at `$path`.', {
        path: target,
      }),
    })
    return null
  }

  if (!blocksField.canHaveMoreChildren()) {
    return null
  }

  const block = blocksField.fieldData[blocksField.index]!
  const newIndex = blocksField.index + 1
  const duplicatedBlock = deepClone(block)

  blocksField.fieldData.splice(newIndex, 0, duplicatedBlock)

  if (proute.value.data._casted) {
    const castedBlocks = getProperty<DynamicBlockFieldTypes['Casted'][BlockName][] | undefined>(
      proute.value.data._casted,
      blocksField.fieldPath,
    )

    if (castedBlocks) {
      castedBlocks.splice(newIndex, 0, deepClone(castedBlocks[blocksField.index]!))
      parsedFields.value = parseFields(publicFields.value, proute.value.data._casted)
    }
  }

  return `${blocksField.fieldPath}.${newIndex}`
}

export function replaceBlock(
  target: string,
  data: Partial<DynamicBlockFieldTypes['Casted'][BlockName]> & { $key: BlockName },
): DynamicBlockFieldTypes['Casted'][BlockName] | null {
  const proute = usePruviousRoute()
  const { dashboardLanguage, publicFields, parsedFields, blocks } = usePreviewState()

  if (!proute.value) {
    return null
  }

  const blocksField = resolveParentBlocksField(target)

  if (!blocksField) {
    messageDashboard('iframe:toast', {
      type: 'error',
      title: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Error while replacing block'),
      message: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Unable to resolve blocks field at `$path`.', {
        path: target,
      }),
    })
    return null
  }

  if (!blocksField.allowedChildBlocks.includes(data.$key)) {
    return null
  }

  const block = blocks.value[data.$key]

  if (!block) {
    messageDashboard('iframe:toast', {
      type: 'error',
      title: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Error while replacing block'),
      message: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Block `$key` does not exist.', {
        key: data.$key,
      }),
    })
    return null
  }

  const defaultData = {
    $key: data.$key,
    ...remap(block.fields, (fieldName, options) => [fieldName, deepClone(options.default)]),
  }
  const resolvedData = defu(data, defaultData) as any

  blocksField.fieldData.splice(blocksField.index, 1, resolvedData)

  if (proute.value.data._casted) {
    getProperty<DynamicBlockFieldTypes['Casted'][BlockName][] | undefined>(
      proute.value.data._casted,
      blocksField.fieldPath,
    )?.splice(blocksField.index, 1, deepClone(resolvedData))
    parsedFields.value = parseFields(publicFields.value, proute.value.data._casted)
  }

  return resolvedData
}

export function selectBlock(target: string, focustFirstEditableField = false): string | null {
  const blocksField = resolveParentBlocksField(target)
  const blockPath = blocksField ? blocksField.childBlockPath : null
  const domBlock = blockPath ? getDOMBlock(blockPath) : null

  if (!domBlock) {
    return null
  }

  if (focustFirstEditableField) {
    const editableField =
      domBlock.el.classList.contains('p-rich-text') &&
      domBlock.el.dataset.fieldPath &&
      domBlock.el.dataset.isEditable !== 'false'
        ? domBlock.el
        : domBlock.el.querySelector<HTMLElement>('.p-rich-text[data-field-path]:not([data-is-editable="false"])')

    if (editableField) {
      focusEditableField(editableField.dataset.fieldPath!)
      return blockPath
    }
  }

  resolveFocusedBlocks(domBlock.el)
  messageDashboard('iframe:selectBlock', { blockPath })
  scrollToElement(domBlock.el)

  return blockPath
}

export function selectBlockAfterMutation(blockPath: string, focustFirstEditableField = false) {
  const { mutationCallbacks } = usePreviewState()
  const now = Date.now()
  const callback = (mutations: MutationRecord[]) => {
    if (Date.now() - now > 500) {
      return true
    }

    for (const { addedNodes } of [...mutations].reverse()) {
      for (const node of addedNodes) {
        if (node instanceof HTMLElement && node.dataset.blockPath === blockPath) {
          selectBlock(blockPath, focustFirstEditableField)
          return true
        }
      }
    }

    return false
  }

  selectBlock(blockPath, focustFirstEditableField)

  for (let i = mutationCallbacks.value.length - 1; i >= 0; i--) {
    if ((mutationCallbacks.value[i] as any)._selectBlockAfterMutation) {
      mutationCallbacks.value.splice(i, 1)
    }
  }

  callback._selectBlockAfterMutation = true
  mutationCallbacks.value.push(callback)
}

export function selectPrevBlock(target: string): string | null {
  const blocksField = resolveParentBlocksField(target)

  if (!blocksField) {
    return null
  }

  const domBlocks = getAllDOMBlocks()
  const index = domBlocks.findIndex(({ path }) => path === blocksField.childBlockPath)
  const prevDomBlock = domBlocks[index - 1]

  if (!prevDomBlock) {
    return null
  }

  resolveFocusedBlocks(prevDomBlock.el)
  messageDashboard('iframe:selectBlock', { blockPath: prevDomBlock.path })
  scrollToElement(prevDomBlock.el)

  return prevDomBlock.path
}

export function selectNextBlock(target: string): string | null {
  const blocksField = resolveParentBlocksField(target)

  if (!blocksField) {
    return null
  }

  const domBlocks = getAllDOMBlocks()
  const index = domBlocks.findIndex(({ path }) => path === blocksField.childBlockPath)
  const nextDomBlock = domBlocks[index + 1]

  if (!nextDomBlock) {
    return null
  }

  resolveFocusedBlocks(nextDomBlock.el)
  messageDashboard('iframe:selectBlock', { blockPath: nextDomBlock.path })
  scrollToElement(nextDomBlock.el)

  return nextDomBlock.path
}

export function selectNearestBlock(target: string): string | null {
  const blocksField = resolveParentBlocksField(target)

  if (!blocksField) {
    return null
  }

  if (blocksField.fieldData[blocksField.index - 1]) {
    return selectBlock(`${blocksField.fieldPath}.${blocksField.index - 1}`)
  } else if (blocksField.fieldData[blocksField.index + 1]) {
    return selectBlock(`${blocksField.fieldPath}.${blocksField.index + 1}`)
  }

  return blocksField.blockPath ? selectBlock(blocksField.blockPath) : null
}

export function deselectBlocks() {
  const { focusedBlocks } = usePreviewState()
  focusedBlocks.value = []
  messageDashboard('iframe:selectBlock', { blockPath: null })
}

export function deleteBlock(target: string): { [oldPath: string]: string } {
  const proute = usePruviousRoute()
  const { dashboardLanguage, publicFields, parsedFields } = usePreviewState()

  if (!proute.value) {
    return {}
  }

  const blocksField = resolveParentBlocksField(target)

  if (!blocksField) {
    messageDashboard('iframe:toast', {
      type: 'error',
      title: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Error while deleting block'),
      message: i18n().__('pruvious-dashboard', dashboardLanguage.value, 'Unable to resolve blocks field at `$path`.', {
        path: target,
      }),
    })
    return {}
  }

  blocksField.fieldData.splice(blocksField.index, 1)

  const map: { [oldPath: string]: string } = {}
  const parsedFieldsPaths = Object.keys(parsedFields.value)

  for (let i = blocksField.index; i < blocksField.fieldData.length; i++) {
    const oldPath = `${blocksField.fieldPath}.${i + 1}`
    const newPath = `${blocksField.fieldPath}.${i}`
    map[oldPath] = newPath

    for (const path of parsedFieldsPaths) {
      if (path.startsWith(`${oldPath}.`)) {
        map[path] = path.replace(oldPath, newPath)
      }
    }
  }

  if (proute.value.data._casted) {
    getProperty<DynamicBlockFieldTypes['Casted'][BlockName][] | undefined>(
      proute.value.data._casted,
      blocksField.fieldPath,
    )?.splice(blocksField.index, 1)
    parsedFields.value = parseFields(publicFields.value, proute.value.data._casted)
  }

  return map
}

export function deleteBlockCascade(target: string): { [oldPath: string]: string } {
  const proute = usePruviousRoute()
  const { publicFields, parsedFields } = usePreviewState()

  if (!proute.value) {
    return {}
  }

  const blocksFields = resolveAllParentBlocksFields(target)
  const map: { [oldPath: string]: string } = {}
  const parsedFieldsPaths = Object.keys(parsedFields.value)

  let blocksField: ReturnType<typeof resolveParentBlocksField> | undefined

  while ((blocksField = blocksFields.shift())) {
    blocksField.fieldData.splice(blocksField.index, 1)

    if (blocksFields.length === 0 || blocksField.fieldData.length > 0) {
      for (let i = blocksField.index; i < blocksField.fieldData.length; i++) {
        const oldPath = `${blocksField.fieldPath}.${i + 1}`
        const newPath = `${blocksField.fieldPath}.${i}`
        map[oldPath] = newPath

        for (const path of parsedFieldsPaths) {
          if (path.startsWith(`${oldPath}.`)) {
            map[path] = path.replace(oldPath, newPath)
          }
        }
      }
    }

    if (proute.value.data._casted) {
      getProperty<DynamicBlockFieldTypes['Casted'][BlockName][] | undefined>(
        proute.value.data._casted,
        blocksField.fieldPath,
      )?.splice(blocksField.index, 1)
    }

    if (blocksField.fieldData.length > 0) {
      break
    }
  }

  if (Object.keys(map).length > 0 && proute.value.data._casted) {
    parsedFields.value = parseFields(publicFields.value, proute.value.data._casted)
  }

  return map
}
