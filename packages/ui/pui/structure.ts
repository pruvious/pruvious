/**
 * Composable that stores the current draggable structure item.
 */
export const usePUIStructureDraggable = () =>
  useState<{
    /**
     * The current item being dragged.
     */
    item: Record<string, any>

    /**
     * The current item's index in the structure.
     */
    index: number

    /**
     * The type of the item being dragged.
     */
    type: string | undefined

    /**
     * Indicates if the drag operation was initiated through touch input.
     */
    touch: boolean

    /**
     * The structure ID of the item being dragged.
     * If `null`, the item can be dropped in any structure, if its `type` is compatible.
     */
    structureId: string | null

    /**
     * Function to remove the current draggable item from its current structure.
     */
    remove: () => Record<string, any>[]
  } | null>('pruvious-ui-structure-draggable', () => null)
