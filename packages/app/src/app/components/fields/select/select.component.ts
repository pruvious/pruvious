import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core'
import { Choice } from '@pruvious-test/shared'
import { Debounce, clearArray, next, prev } from '@pruvious-test/utils'
import { IdService } from 'src/app/services/id.service'

@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',
})
export class SelectComponent implements OnChanges {
  @Input()
  value: any

  @Output()
  valueChange: EventEmitter<any> = new EventEmitter()

  @Input()
  nullable: boolean = false

  @Input()
  choices: Choice[] = []

  @Input()
  label: string = ''

  @Input()
  description: string = ''

  @Input()
  required: boolean = false

  @Input()
  placeholder: string | null = null

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

  @ViewChild('container')
  containerEl!: ElementRef<HTMLDivElement>

  filtered: Choice[] = []

  inputText: string = ''

  focused: boolean = false

  pickedLabel: string = ''

  labelHovered: boolean = false

  highlighted: Choice | null = null

  get height(): number {
    return this._height
  }
  set height(value: number) {
    this._height = value
    this.animatingHeight = true

    clearTimeout(this.heightTimeout)
    this.heightTimeout = setTimeout(() => {
      this.animatingHeight = false
    }, 150)
  }
  protected _height: number = 0
  protected heightTimeout?: NodeJS.Timeout

  animatingHeight: boolean = false

  constructor(protected idService: IdService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['choices']) {
      this.refresh()
    }
  }

  onFocusInput(): void {
    this.focused = true
    this.inputText = ''
    this.highlighted =
      this.choices.find((choice) => choice.value === this.value) ?? this.choices[0] ?? null
    this.onInputTextChange()

    setTimeout(() => this.scrollToHighlighted(), 150)
  }

  onInputTextChange(): void {
    const keywords = this.inputText
      .split(' ')
      .filter(Boolean)
      .map((keyword) => keyword.toLowerCase())

    clearArray(this.filtered).push(
      ...this.choices.filter((choice) => {
        if (keywords.length) {
          return keywords.every((keyword) => {
            return (
              (typeof choice.value === 'string' && choice.value.toLowerCase().includes(keyword)) ||
              choice.label.toLowerCase().includes(keyword)
            )
          })
        }

        return true
      }),
    )

    this.filtered.sort((a, b) => {
      const aIndex = keywords
        .map((keyword) => {
          const labelIndex = a.label.toLowerCase().indexOf(keyword.toLowerCase())

          if (labelIndex > -1) {
            return labelIndex
          } else if (typeof a.value === 'string') {
            return a.value.toLowerCase().indexOf(keyword.toLowerCase())
          }

          return Infinity
        })
        .sort()[0]

      const bIndex = keywords
        .map((keyword) => {
          const labelIndex = b.label.toLowerCase().indexOf(keyword.toLowerCase())

          if (labelIndex > -1) {
            return labelIndex
          } else if (typeof b.value === 'string') {
            return b.value.toLowerCase().indexOf(keyword.toLowerCase())
          }

          return Infinity
        })
        .sort()[0]

      return aIndex - bIndex
    })

    const filteredIncludesHighlighted = this.highlighted && this.filtered.includes(this.highlighted)

    if (!filteredIncludesHighlighted) {
      this.highlighted = this.filtered[0] ?? null
    }

    this.updateHeight()
    this.scrollToHighlighted()
  }

  onBlurInput(): void {
    this.focused = false
    this.inputText = this.pickedLabel
    this.highlighted = null
    this.height = 0
  }

  highlight(choice: Choice): void {
    this.highlighted = choice
  }

  highlightPrev(): void {
    this.highlighted =
      prev({ value: this.highlighted?.value, label: '' }, this.filtered, 'value') ?? null
    this.scrollToHighlighted()
  }

  highlightNext(): void {
    this.highlighted =
      next({ value: this.highlighted?.value, label: '' }, this.filtered, 'value') ?? null
    this.scrollToHighlighted()
  }

  pick(choice?: Choice): void {
    const value = choice?.value ?? this.highlighted?.value ?? this.value

    if (value !== this.value) {
      this.value = value
      this.valueChange.emit(this.value)
      this.refresh()
    }
  }

  protected refresh(): void {
    const picked = this.choices.find((choice) => choice.value === this.value)
    this.pickedLabel = picked?.label ?? ''

    if (this.focused) {
      this.onInputTextChange()
    } else {
      this.onBlurInput()
    }
  }

  protected updateHeight(): void {
    this.height = (Math.min(6, this.filtered.length) * 9) / 4
  }

  @Debounce(150)
  protected scrollToHighlighted(): void {
    this.containerEl.nativeElement
      .querySelector(`button[data-highlighted]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}
