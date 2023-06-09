import { Component, HostListener } from '@angular/core'
import { clearArray } from '@pruvious/utils'
import { BaseComponent } from 'src/app/components/base.component'

@Component({
  template: '',
})
export class HistoryComponent extends BaseComponent {
  stateIndex: number = 0

  history: string[] = []

  protected initialState: string = ''

  initialStateObj: Record<string, any> = {}

  protected prevState: string = ''

  protected lastStateAction: number = 0

  protected deleteTranslationsInHistoryStates: boolean = true

  addState(state: string, timestamp: number, reset: boolean = false): boolean {
    if (timestamp > this.lastStateAction) {
      this.lastStateAction = timestamp
    } else {
      return false
    }

    const stateObj = JSON.parse(state)

    if (this.deleteTranslationsInHistoryStates) {
      delete stateObj.translations
    }

    delete stateObj.createdAt
    delete stateObj.updatedAt

    state = JSON.stringify(stateObj)

    const changed = state !== this.prevState

    if (changed) {
      this.prevState = state
      this.history.splice(this.stateIndex + 1, 100, state)
      this.stateIndex = this.history.length - 1
    }

    if (reset || !this.initialState) {
      this.initialState = state
      this.initialStateObj = stateObj
    }

    if (this.history.length > 100) {
      this.history.shift()
      this.stateIndex--
    }

    return changed
  }

  setState(index: number, timestamp: number): string | null {
    if (timestamp > this.lastStateAction) {
      this.lastStateAction = timestamp
    } else {
      return null
    }

    if (index > -1 && index < this.history.length) {
      this.stateIndex = index
      this.prevState = this.history[index]

      return this.history[index]
    }

    return null
  }

  clearStates(): void {
    clearArray(this.history)
    this.stateIndex = 0
  }

  @HostListener('window:beforeunload')
  canDeactivate(): boolean {
    return this.initialState === this.history[this.stateIndex]
  }
}
