import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core'
import { IdService } from 'src/app/services/id.service'

@Component({
  selector: 'app-number',
  templateUrl: './number.component.html',
})
export class NumberComponent implements AfterViewInit {
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
  min: number | null = null

  @Input()
  max: number | null = null

  @Input()
  autofocus: boolean = false

  @Input()
  disabled: boolean = false

  @Input()
  error: string | null = null

  @Input()
  id: string = this.idService.generate()

  @Input()
  key: string = ''

  @Input()
  name: string = ''

  @ViewChild('input')
  inputEl!: ElementRef<HTMLInputElement>

  focused: boolean = false

  constructor(protected idService: IdService) {}

  ngAfterViewInit(): void {
    if (this.autofocus) {
      setTimeout(() => this.inputEl.nativeElement.focus())
    }
  }

  onFocusInput(): void {
    this.focused = true
  }

  onBlurInput(): void {
    this.focused = false
    this.edited.emit(this.value)
  }

  onKeyDown(event: KeyboardEvent): void {
    const prevValue = this.value

    if (event.key === 'ArrowUp' && event.shiftKey) {
      event.preventDefault()
      this.value = this.max !== null ? Math.min(this.max, this.value + 10) : this.value + 10
    } else if (event.key === 'ArrowDown' && event.shiftKey) {
      event.preventDefault()
      this.value = this.min !== null ? Math.max(this.min, this.value - 10) : this.value - 10
    }

    if (prevValue !== this.value) {
      this.valueChange.emit(this.value)
      this.edited.emit(this.value)
    }
  }
}
