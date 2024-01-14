import { ref, type Ref } from 'vue'
import { isEditingText } from '../dom'
import { objectOmit } from '../object'

export class History {
  undosRemaining: Ref<number> = ref(0)

  redosRemaining: Ref<number> = ref(0)

  isDirty: Ref<boolean> = ref(false)

  original: Ref<Record<string, any>> = ref({})

  private states: string[] = []

  private initialState: string | null = null

  private index = -1

  constructor(record?: Record<string, any>) {
    if (record) {
      this.add(record)
    }
  }

  add(record: Record<string, any>, force = false) {
    const state = objectOmit(record, ['createdAt', 'updatedAt'])

    if (!force && isEditingText()) {
      return state
    }

    const stringified = JSON.stringify(state)

    if (this.states[this.index] !== stringified) {
      if (!this.states.length) {
        this.original.value = JSON.parse(stringified)
        this.initialState = stringified
      }

      this.states.splice(this.index + 1)
      this.states.push(stringified)
      this.index++
      this.undosRemaining.value = this.index
      this.redosRemaining.value = 0

      this.refresh()
    }

    return state
  }

  setInitialState(record: Record<string, any>) {
    const stringified = JSON.stringify(objectOmit(record, ['createdAt', 'updatedAt']))
    this.original.value = JSON.parse(stringified)
    this.initialState = stringified
    this.refresh()
  }

  undo(): Record<string, any> | null {
    if (this.index > 0) {
      this.index--
      this.undosRemaining.value = this.index
      this.redosRemaining.value++
      this.refresh()

      return JSON.parse(this.states[this.index])
    }

    return null
  }

  redo(): Record<string, any> | null {
    if (this.index < this.states.length - 1) {
      this.index++
      this.undosRemaining.value = this.index
      this.redosRemaining.value--
      this.refresh()

      return JSON.parse(this.states[this.index])
    }

    return null
  }

  reset() {
    this.states = []
    this.original.value = {}
    this.initialState = null
    this.index = -1
    this.undosRemaining.value = 0
    this.redosRemaining.value = 0
    this.isDirty.value = false

    return this
  }

  private refresh() {
    this.isDirty.value = this.states[this.index] !== this.initialState
  }
}
