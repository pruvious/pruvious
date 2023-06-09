import { Component, EventEmitter, Input, Output } from '@angular/core'

@Component({
  selector: 'app-popup-header',
  templateUrl: './popup-header.component.html',
})
export class PopupHeaderComponent {
  @Input()
  size: 'md' | 'sm' = 'md'

  @Output()
  close = new EventEmitter<MouseEvent>()
}
