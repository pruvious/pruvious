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
  selector: 'app-text-area',
  templateUrl: './text-area.component.html',
  styleUrls: ['./text-area.component.css'],
})
export class TextAreaComponent implements AfterViewInit {
  @Input()
  get value() {
    return this._value
  }
  set value(value: string) {
    this._value = value
    this.resize()
  }
  _value: string = ''

  @Output()
  valueChange: EventEmitter<string> = new EventEmitter()

  @Output()
  edited: EventEmitter<string> = new EventEmitter()

  @Input()
  label: string = ''

  @Input()
  description: string = ''

  @Input()
  placeholder: string | null = null

  @Input()
  required: boolean = false

  @Input()
  maxLength: number | null = null

  @Input()
  spellcheck: boolean = false

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

  @Input()
  showPasswordText: string = 'Show password'

  @Input()
  hidePasswordText: string = 'Hide password'

  @ViewChild('container')
  containerEl?: ElementRef<HTMLDivElement>

  protected passwordVisible: boolean = false

  constructor(protected idService: IdService) {}

  ngAfterViewInit(): void {
    this.resize()
  }

  protected resize(): void {
    if (this.containerEl) {
      this.containerEl.nativeElement.dataset['replicatedValue'] = this.value
    }
  }
}
