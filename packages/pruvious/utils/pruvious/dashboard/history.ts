import { deepClone, isUndefined, omit } from '@pruvious/utils'

export interface HistoryOptions {
  /**
   * List of keys to omit when comparing states.
   *
   * @default []
   */
  omit?: string[]

  /**
   * Maximum number of stored states in history.
   *
   * @default 100
   */
  maxStates?: number

  /**
   * Whether to watch for unsaved changes in the history.
   * If enabled, the user will be prompted to save changes before navigating away from the page.
   *
   * @default true
   */
  watchUnsavedChanges?: boolean
}

/**
 * Global reference to the current `history` instance and unsaved changes dialog `prompt` trigger.
 */
export const unsavedChanges: { history: History | null; prompt?: () => Promise<boolean> } = {
  history: null,
  prompt: undefined,
}

/**
 * Data history manager with undo and redo functionality.
 */
export class History<T extends Record<string, any> = Record<string, any>> {
  protected states: T[] = []
  protected omit: string[]
  protected currentIndex: number = -1
  protected maxStates: number
  protected watchUnsavedChanges: boolean
  protected original: T | undefined
  protected debounceTimer: NodeJS.Timeout | null = null

  canUndo = ref(false)
  canRedo = ref(false)
  undoCount = ref(0)
  redoCount = ref(0)
  isDirty = ref(false)
  size = ref(0)

  constructor(options?: HistoryOptions) {
    this.omit = options?.omit ?? []
    this.maxStates = options?.maxStates ?? 100
    this.watchUnsavedChanges = options?.watchUnsavedChanges ?? true

    if (this.watchUnsavedChanges) {
      unsavedChanges.history = this
    }
  }

  /**
   * Adds a new state to the history stack and manages the maximum number of stored states.
   */
  push(state: T): this {
    const newState = omit(state, this.omit)
    const currentState = omit(this.getCurrentState() ?? ({} as Partial<T>), this.omit)

    if (JSON.stringify(newState) !== JSON.stringify(currentState)) {
      this.states = this.states.slice(0, this.currentIndex + 1)
      this.states.push(deepClone(state))
      this.currentIndex++

      if (this.states.length > this.maxStates) {
        this.states.shift()
        this.currentIndex--
      }

      if (isUndefined(this.original)) {
        this.setOriginalState(state)
      }
    }

    return this.refresh()
  }

  /**
   * Adds a new state to the history stack with a debounce delay.
   */
  pushDebounced(state: T, delay = 100): Promise<this> {
    return new Promise((resolve) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }

      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null
        resolve(this.push(state))
      }, delay)
    })
  }

  /**
   * Rewrites the current state with a new state.
   * The `remove` parameter specifies the number of states to remove from the history stack.
   */
  rewrite(state: T, remove = 1): this {
    const removeCount = Math.min(Math.max(1, remove), this.currentIndex + 1)

    if (removeCount > 0) {
      this.states.splice(this.currentIndex - removeCount + 1, removeCount)
      this.currentIndex -= removeCount
    }

    return this.push(state)
  }

  /**
   * Moves backward in history by one step and returns the previous state.
   * Returns `undefined` if there are no states to undo.
   */
  undo(): T | undefined {
    if (!this.canUndo.value || this.debounceTimer) {
      return undefined
    }

    this.currentIndex--
    return deepClone(this.refresh().states[this.currentIndex])
  }

  /**
   * Moves forward in history by one step and returns the next state.
   * Returns `undefined` if there are no states to redo.
   */
  redo(): T | undefined {
    if (!this.canRedo.value || this.debounceTimer) {
      return undefined
    }

    this.currentIndex++
    return deepClone(this.refresh().states[this.currentIndex])
  }

  /**
   * Returns the current active state.
   */
  getCurrentState(): T | undefined {
    return deepClone(this.states[this.currentIndex])
  }

  /**
   * Returns a copy of all states in history.
   */
  getAllStates(): T[] {
    return deepClone(this.states)
  }

  /**
   * Returns the original state before any changes were made.
   */
  getOriginalState(): T | undefined {
    return deepClone(this.original)
  }

  /**
   * Sets the original state before any changes were made.
   */
  setOriginalState(state: T): this {
    this.original = deepClone(state)
    return this.refresh()
  }

  /**
   * Removes all states and resets the history.
   */
  clear(): this {
    this.states = []
    this.currentIndex = -1
    this.original = undefined
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    return this.refresh()
  }

  protected refresh(): this {
    this.canUndo.value = this.currentIndex > 0
    this.canRedo.value = this.currentIndex < this.states.length - 1
    this.undoCount.value = this.currentIndex
    this.redoCount.value = this.states.length - this.currentIndex - 1
    this.isDirty.value = this.compareOriginalVsCurrentState()
    this.size.value = this.states.length
    return this
  }

  protected compareOriginalVsCurrentState(): boolean {
    const originalState = omit(this.original ?? ({} as Partial<T>), this.omit)
    const currentState = omit(this.getCurrentState() ?? ({} as Partial<T>), this.omit)
    return JSON.stringify(originalState) !== JSON.stringify(currentState)
  }
}
