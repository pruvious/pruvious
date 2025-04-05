import { clamp, last, removeByProp, uniqueArrayByProp } from '@pruvious/utils'
import type { PUITreeModel } from '../components/PUITree.vue'
import type { PUITreeDropTarget, PUITreeItemModel } from '../components/PUITreeItem.vue'

export type PUITreeMapper<T> = (source: T[]) => PUITreeModel<T>

export interface PUITree<T> {
  /**
   * The generated tree model ref to use in the `PUITree` component.
   *
   * It contains the `source` data and the tree model.
   */
  tree: Ref<PUITreeModel<T>>

  /**
   * Reinstantiates the tree model from the `source` data.
   */
  refresh: () => void

  /**
   * Appends the specified `items` to the tree model under the specified `parent`.
   * If no `parent` is specified, the items are appended to the root of the tree model.
   */
  appendItems: (items: PUITreeItemModel<T>[], parent?: PUITreeItemModel<T>) => void

  /**
   * Prepends the specified `items` to the tree model under the specified `parent`.
   * If no `parent` is specified, the items are prepended to the root of the tree model.
   */
  prependItems: (items: PUITreeItemModel<T>[], parent?: PUITreeItemModel<T>) => void

  /**
   * Adds the specified `items` to the tree model before the specified `target` item.
   *
   * @returns an array with the index and parent item of each added item.
   *
   * @example
   * ```ts
   * for (const { index, parent } of addItemsBefore([newItem1, newItem2], item) {
   *   const slot = parent?.source.children ?? sourceItems
   *   slot.splice(index, 0, sourceItemClone)
   * }
   * ```
   */
  addItemsBefore: (
    items: PUITreeItemModel<T>[],
    target: PUITreeItemModel<T>,
  ) => { index: number; parent?: PUITreeItemModel<T> }[]

  /**
   * Adds the specified `items` to the tree model after the specified `target` item.
   *
   * @returns an array with the index and parent item of each added item.
   *
   * @example
   * ```ts
   * for (const { index, parent } of addItemsAfter([newItem1, newItem2], item) {
   *   const slot = parent?.source.children ?? sourceItems
   *   slot.splice(index, 0, sourceItemClone)
   * }
   * ```
   */
  addItemsAfter: (
    items: PUITreeItemModel<T>[],
    target: PUITreeItemModel<T>,
  ) => { index: number; parent?: PUITreeItemModel<T> }[]

  /**
   * Moves the specified `items` in the tree model in the specified `direction`.
   *
   * @returns the moved tree items with their parent item.
   *
   * @example
   * ```ts
   * for (const { item, parent, oldIndex, newIndex } of moveItems(items, 'up')) {
   *   if (oldIndex !== newIndex) {
   *     const slot = (parent?.source.children ?? sourceItems) as any[]
   *     slot.splice(oldIndex, 1)
   *     slot.splice(newIndex, 0, item.source)
   *   }
   * }
   * ```
   */
  moveItems: (
    items: PUITreeItemModel<T>[],
    direction: 'up' | 'down',
  ) => { item: PUITreeItemModel<T>; parent?: PUITreeItemModel<T> }[]

  /**
   * Drops the specified `items` before, inside, or after the `target` item.
   *
   * @returns an array containing the dropped items, their new and old indexes, and the parent item.
   *
   * @example
   * ```ts
   * const dropped = dropItems(items, target, zone)
   *
   * for (const { oldIndex, oldParent } of dropped) {
   *   const slot = oldParent?.source.children ?? vdom
   *   slot.splice(oldIndex, 1)
   * }
   *
   * for (const { item, newIndex, newParent } of dropped) {
   *   const slot = newParent?.source.children ?? vdom
   *   slot.splice(newIndex, 0, item.source)
   * }
   * ```
   */
  dropItems: (
    items: PUITreeItemModel<T>[],
    target: PUITreeItemModel<T>,
    zone: PUITreeDropTarget<T>['zone'],
  ) => {
    item: PUITreeItemModel<T>
    oldIndex: number
    oldParent?: PUITreeItemModel<T>
    newIndex: number
    newParent?: PUITreeItemModel<T>
  }[]

  /**
   * Removes `items` from the tree model.
   *
   * @returns the deleted tree items with their parent item.
   *
   * @example
   * ```ts
   * for (const { item, parent } of deleteItems(items)) {
   *   remove(item.source, parent?.source.children ?? sourceItems, 'id', true)
   * }
   * ```
   */
  deleteItems: (items: PUITreeItemModel<T>[]) => { item: PUITreeItemModel<T>; parent?: PUITreeItemModel<T> }[]
}

/**
 * Composable for generating and managing a tree model for use in the `PUITree` component.
 *
 * @param source - The source data to generate the tree model from.
 * @param mapper - The function to generate the tree model from the `source` data.
 *
 * @example
 * ```ts
 * interface VNode {
 *   id: number
 *   nodeName: string
 *   children: VNode[]
 * }
 *
 * const vdom: VNode[] = [
 *   {
 *     id: 1,
 *     nodeName: 'NAV',
 *     children: [
 *       {
 *         id: 2,
 *         nodeName: 'UL',
 *         children: [
 *           {
 *             id: 3,
 *             nodeName: 'LI',
 *             children: [],
 *           },
 *         ],
 *       },
 *     ],
 *   },
 * ]
 *
 *  const treeMapper: PUITreeMapper<VNode> = (vdom) =>
 *    vdom.map((node) => ({
 *      id: node.id,
 *      source: node,
 *      label: node.nodeName,
 *      nestable: true,
 *      children: treeMapper(node.children),
 *    }))
 *
 *  const { tree } = puiTree(vdom, treeMapper)
 * ```
 */
export function puiTree<T>(source: T[], mapper: PUITreeMapper<T>): PUITree<T> {
  const tree = ref(mapper(source)) as Ref<PUITreeModel<T>>

  function refresh() {
    tree.value = mapper(source)
  }

  return {
    tree,
    refresh,
    appendItems: (items, parent?) => {
      if (parent?.nestable) {
        parent.children = parent.children ?? []
        parent.children.push(...items)
      } else {
        tree.value.push(...items)
      }
    },
    prependItems: (items, parent?) => {
      if (parent?.nestable) {
        parent.children = parent.children ?? []
        parent.children.unshift(...items)
      } else {
        tree.value.unshift(...items)
      }
    },
    addItemsBefore: (items, target) => puiAddTreeItemsBefore(items, target, tree.value),
    addItemsAfter: (items, target) => puiAddTreeItemsAfter(items, target, tree.value),
    moveItems: (items, direction) => puiMoveTreeItems(items, tree.value, direction),
    dropItems: (items, target, zone) => puiDropTreeItems(items, target, tree.value, zone),
    deleteItems: (items) => puiDeleteTreeItems(items, tree.value),
  }
}

/**
 * Recursively flattens the tree `items`.
 */
export function puiFlatTreeItems<T>(items: PUITreeItemModel<T>[]) {
  const flattened: PUITreeItemModel<T>[] = []

  for (const item of items) {
    flattened.push(item)

    if (item.nestable && item.children?.length) {
      flattened.push(...puiFlatTreeItems(item.children))
    }
  }

  return flattened
}

/**
 * Recursively flattens the tree `items` and includes the nesting `level` of each item.
 */
export function puiFlatTreeItemsWithLevel<T>(items: PUITreeItemModel<T>[], level = 0) {
  const flattened: [item: PUITreeItemModel<T>, level: number][] = []

  for (const item of items) {
    flattened.push([item, level])

    if (item.nestable && item.children?.length) {
      flattened.push(...puiFlatTreeItemsWithLevel(item.children, level + 1))
    }
  }

  return flattened
}

/**
 * Sorts the `items` based on their appearance in the tree.
 */
export function puiSortTreeItems<T>(items: PUITreeItemModel<T>[], tree: PUITreeModel<T>) {
  const flattened = puiFlatTreeItems(tree)

  return items.sort((a, b) => {
    const aIndex = flattened.findIndex((item) => item.id === a.id)
    const bIndex = flattened.findIndex((item) => item.id === b.id)

    return aIndex - bIndex
  })
}

/**
 * Retrieves the parent tree items for the specified `item`.
 * The resulting array is ordered from the root to the immediate parent.
 */
export function puiGetParentTreeItems<T>(item: PUITreeItemModel<T>, tree: PUITreeModel<T>) {
  const parents: PUITreeItemModel<T>[] = []
  const flattened = puiFlatTreeItemsWithLevel(tree)
  const index = flattened.findIndex(([{ id }]) => id === item.id)

  let prev = item

  for (let i = index - 1; i >= 0; i--) {
    const [current, level] = flattened[i]!

    if (current.nestable && current.children?.some(({ id }) => id === prev.id)) {
      parents.unshift(current)
      prev = current
    }

    if (level === 0) {
      break
    }
  }

  return parents
}

/**
 * Retrieves all child tree items for the specified `item`, including nested children.
 * The resulting array is ordered as items appear in the tree.
 */
export function puiGetChildTreeItems<T>(item: PUITreeItemModel<T>, tree: PUITreeModel<T>) {
  const children: PUITreeItemModel<T>[] = []
  const flattened = puiFlatTreeItemsWithLevel(tree)
  const index = flattened.findIndex(([{ id }]) => id === item.id)
  const parentLevel = flattened[index]![1]

  for (let i = index + 1; i < flattened.length; i++) {
    const [current, level] = flattened[i]!

    if (level > parentLevel) {
      children.push(current)
    } else {
      break
    }
  }

  return children
}

/**
 * Normalizes the tree selection by removing any child items that are also selected.
 *
 * This function should be used before performing operations on the selected items.
 */
export function puiNormalizeTreeSelection<T>(selection: PUITreeItemModel<T>[], tree: PUITreeModel<T>) {
  const deselect: (string | number)[] = []

  for (const item of selection) {
    deselect.push(...puiGetChildTreeItems(item, tree).map(({ id }) => id))
  }

  return uniqueArrayByProp(selection, 'id').filter(({ id }) => !deselect.includes(id))
}

/**
 * Adds the specified `items` to the `tree` model before the `target` item.
 *
 * @returns an array with the index and parent item of each added item.
 */
export function puiAddTreeItemsBefore<T>(
  items: PUITreeItemModel<T>[],
  target: PUITreeItemModel<T>,
  tree: PUITreeModel<T>,
) {
  const parent = last(puiGetParentTreeItems(target, tree))
  const slot = parent?.nestable ? parent.children! : tree
  const index = slot.findIndex((item) => item.id === target.id)

  slot.splice(index, 0, ...items)

  return items.map((_, i) => ({ index: index + i, parent }))
}

/**
 * Adds the specified `items` to the `tree` model after the `target` item.
 *
 * @returns an array with the index and parent item of each added item.
 */
export function puiAddTreeItemsAfter<T>(
  items: PUITreeItemModel<T>[],
  target: PUITreeItemModel<T>,
  tree: PUITreeModel<T>,
) {
  const parent = last(puiGetParentTreeItems(target, tree))
  const slot = parent?.nestable ? parent.children! : tree
  const index = slot.findIndex((item) => item.id === target.id)

  slot.splice(index + 1, 0, ...items)

  return items.map((_, i) => ({ index: index + i + 1, parent }))
}

/**
 * Moves the specified `items` in the `tree` model in the specified `direction`.
 *
 * @returns the moved tree items with their parent item, old index, and new index.
 */
export function puiMoveTreeItems<T>(items: PUITreeItemModel<T>[], tree: PUITreeModel<T>, direction: 'up' | 'down') {
  const moved: { item: PUITreeItemModel<T>; parent?: PUITreeItemModel<T>; oldIndex: number; newIndex: number }[] = []

  let min: number | undefined
  let max: number | undefined

  for (const item of direction === 'up' ? items : [...items].reverse()) {
    if (item.movable) {
      const parent = last(puiGetParentTreeItems(item, tree))
      const slot = parent?.nestable ? parent.children! : tree
      const oldIndex = slot.findIndex(({ id }) => id === item.id)
      const newIndex = clamp(oldIndex + (direction === 'up' ? -1 : 1), min ?? 0, max ?? slot.length - 1)

      if (newIndex !== oldIndex) {
        slot.splice(oldIndex, 1)
        slot.splice(newIndex, 0, item)
      }

      if (direction === 'up' && (min === undefined || newIndex + 1 < min)) {
        min = newIndex + 1
      } else if (direction === 'down' && (max === undefined || newIndex - 1 > max)) {
        max = newIndex - 1
      }

      moved.push({ item, parent, oldIndex, newIndex })
    }
  }

  return moved
}

/**
 * Drops the specified tree `items` before, inside, or after the `target` item.
 *
 * @returns an array containing the dropped items, their new and old indexes, and the parent item.
 */
export function puiDropTreeItems<T>(
  items: PUITreeItemModel<T>[],
  target: PUITreeItemModel<T>,
  tree: PUITreeModel<T>,
  zone: PUITreeDropTarget<T>['zone'],
) {
  const dropped: {
    item: PUITreeItemModel<T>
    oldIndex: number
    oldParent?: PUITreeItemModel<T>
    newIndex: number
    newParent?: PUITreeItemModel<T>
  }[] = []

  if (zone === 'inside') {
    const newParent = target as PUITreeItemModel<T> & { nestable: true }

    for (const item of items) {
      const oldParent = last(puiGetParentTreeItems(item, tree))
      const oldSlot = oldParent?.nestable ? oldParent.children! : tree
      const oldIndex = oldSlot.findIndex(({ id }) => id === item.id)

      dropped.push({ item, oldIndex, oldParent, newIndex: -1, newParent })
      oldSlot.splice(oldIndex, 1)
    }

    newParent.children = newParent.children ?? []
    newParent.children.unshift(...items)

    for (let i = 0; i < items.length; i++) {
      dropped[i]!.newIndex = i
      dropped[i]!.newParent = newParent
    }
  } else {
    const newParent = last(puiGetParentTreeItems(target, tree))
    const newSlot = newParent?.nestable ? newParent.children! : tree

    let newIndex = newSlot.findIndex((item) => item.id === target.id) + (zone === 'after' ? 1 : 0)

    for (const item of items) {
      const oldParent = last(puiGetParentTreeItems(item, tree))
      const oldSlot = oldParent?.nestable ? oldParent.children! : tree
      const oldIndex = oldSlot.findIndex(({ id }) => id === item.id)

      dropped.push({ item, oldIndex, oldParent, newIndex: -1, newParent })
      oldSlot.splice(oldIndex, 1)

      if (oldSlot === newSlot && oldIndex < newIndex) {
        newIndex--
      }
    }

    for (let i = 0; i < items.length; i++) {
      newSlot.splice(newIndex + i, 0, items[i]!)
      dropped[i]!.newIndex = newIndex + i
    }
  }

  return dropped
}

/**
 * Deletes the specified `items` from the `tree` model.
 *
 * @returns the deleted tree items with their parent item.
 */
export function puiDeleteTreeItems<T>(items: PUITreeItemModel<T>[], tree: PUITreeModel<T>) {
  const deleted: { item: PUITreeItemModel<T>; parent?: PUITreeItemModel<T> }[] = []

  for (const item of items) {
    const parent = last(puiGetParentTreeItems(item, tree))
    const slot = parent?.nestable ? parent.children! : tree

    removeByProp(item, slot, 'id', true)

    deleted.push({ item, parent })
  }

  return deleted
}
