import { Component, EventEmitter, Input, Output } from '@angular/core'

@Component({
  selector: 'app-slider',
  templateUrl: './slider.component.html',
})
export class SliderComponent {
  @Input()
  value: number = 0

  @Output()
  valueChange: EventEmitter<number> = new EventEmitter()

  @Output()
  edited: EventEmitter<number> = new EventEmitter()

  @Input()
  label: string = ''

  @Input()
  description: string = ''

  @Input()
  placeholder: string | null = null

  @Input()
  required: boolean = false

  @Input()
  min!: number

  @Input()
  max!: number

  @Input()
  step!: number

  @Input()
  disabled: boolean = false

  @Input()
  error: string | null = null

  @Input()
  key: string = ''

  @Input()
  name: string = ''

  focused: boolean = false

  onFocusInput(): void {
    this.focused = true
  }

  onBlurInput(): void {
    this.focused = false
    this.edited.emit(this.value)
  }
}
