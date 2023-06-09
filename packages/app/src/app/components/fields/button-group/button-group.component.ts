import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core'
import { Choice } from '@pruvious/shared'
import { next, prev } from '@pruvious/utils'

@Component({
  selector: 'app-button-group',
  templateUrl: './button-group.component.html',
})
export class ButtonGroupComponent {
  @Input()
  value: any

  @Output()
  valueChange: EventEmitter<any> = new EventEmitter()

  @Input()
  choices: Choice[] = []

  @Input()
  label: string = ''

  @Input()
  description: string = ''

  @Input()
  required: boolean = false

  @Input()
  disabled: boolean = false

  @Input()
  error: string | null = null

  @Input()
  key: string = ''

  @ViewChild('container')
  containerEl!: ElementRef<HTMLDivElement>

  labelHovered: boolean = false

  onClickLabel(): void {
    if (!this.disabled) {
      const buttons = Array.from(this.containerEl.nativeElement.children) as HTMLButtonElement[]
      const active = buttons.find((button) => button.classList.contains('active'))

      if (active) {
        active.focus()
      } else if (buttons.length) {
        buttons[0].focus()
      }
    }
  }

  selectPrev(): void {
    const newChoice = prev({ value: this.value, label: '' }, this.choices, 'value')

    if (newChoice?.value !== this.value) {
      this.value = newChoice?.value
      this.valueChange.emit(this.value)
    }
  }

  selectNext(): void {
    const newChoice = next({ value: this.value, label: '' }, this.choices, 'value')

    if (newChoice?.value !== this.value) {
      this.value = newChoice?.value
      this.valueChange.emit(this.value)
    }
  }
}
