import { Component, EventEmitter, Input, Output } from '@angular/core'

@Component({
  selector: 'app-history-buttons',
  templateUrl: './history-buttons.component.html',
})
export class HistoryButtonsComponent {
  @Input()
  stateIndex!: number

  @Input()
  historyLength!: number

  @Output()
  action: EventEmitter<'undo' | 'redo'> = new EventEmitter()

  undoFocused: boolean = false

  redoFocused: boolean = false
}
