import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core'
import { Choice, Field } from '@pruvious/shared'
import { Debounce, clearArray, next, prev } from '@pruvious/utils'
import { IdService } from 'src/app/services/id.service'

export type Autocomplete =
  | 'additional-name'
  | 'address-level1'
  | 'address-level2'
  | 'address-level3'
  | 'address-level4'
  | 'address-line1'
  | 'address-line2'
  | 'address-line3'
  | 'bday-day'
  | 'bday-month'
  | 'bday-year'
  | 'bday'
  | 'cc-additional-name'
  | 'cc-csc'
  | 'cc-exp-month'
  | 'cc-exp-year'
  | 'cc-exp'
  | 'cc-family-name'
  | 'cc-given-name'
  | 'cc-name'
  | 'cc-number'
  | 'cc-type'
  | 'country-name'
  | 'country'
  | 'current-password'
  | 'email'
  | 'family-name'
  | 'given-name'
  | 'honorific-prefix'
  | 'honorific-suffix'
  | 'impp'
  | 'language'
  | 'name'
  | 'new-password'
  | 'nickname'
  | 'off'
  | 'on'
  | 'one-time-code'
  | 'organization-title'
  | 'organization'
  | 'photo'
  | 'postal-code'
  | 'pruvious'
  | 'sex'
  | 'street-address'
  | 'tel-area-code'
  | 'tel-country-code'
  | 'tel-extension'
  | 'tel-local'
  | 'tel-national'
  | 'tel'
  | 'transaction-amount'
  | 'transaction-currency'
  | 'url'
  | 'username'

@Component({
  selector: 'app-text-input',
  templateUrl: './text-input.component.html',
})
export class TextInputComponent implements AfterViewInit {
  @Input()
  value: string = ''

  @Output()
  valueChange: EventEmitter<string> = new EventEmitter()

  @Output()
  edited: EventEmitter<string> = new EventEmitter()

  @Input()
  get choices() {
    return this._choices
  }
  set choices(value: (Choice & { info?: string })[]) {
    if (this.focused) {
      this._choices = value
      this.updateHeight()
    }
  }
  protected _choices: (Choice & { info?: string })[] = []

  @Output()
  fetchChoices: EventEmitter<{ keywords: string; nextPage: 'nextPage' | undefined }> =
    new EventEmitter()

  @Input()
  label: string = ''

  @Input()
  description: string = ''

  @Input()
  type: 'text' | 'password' = 'text'

  @Input()
  placeholder: string | null = null

  @Input()
  prefix: string = ''

  @Input()
  required: boolean = false

  @Input()
  maxLength: number | null = null

  @Input()
  autocomplete: Autocomplete | Autocomplete[] = 'off'

  @Input()
  autofocus: boolean = false

  @Input()
  spellcheck: boolean = false

  @Input()
  disabled: boolean = false

  @Input()
  clearable: boolean = false

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

  @Input()
  get suggestions(): string[] | undefined {
    return this._suggestions
  }
  set suggestions(value: string[] | undefined) {
    if (value) {
      this.suggestionFields = [{ type: 'text', name: '__suggestion' }, undefined]
    }

    this._suggestions = value
  }
  protected _suggestions?: string[]

  @Input()
  showValueInSuggestions: boolean = false

  @Input()
  suggestionFields: [Field | undefined, Field | undefined] = [undefined, undefined]

  @Input()
  get spinner() {
    return this._spinner
  }
  set spinner(value: boolean) {
    clearTimeout(this.spinnerTimeout)

    if (value) {
      this.spinnerTimeout = setTimeout(() => {
        this._spinner = true
      }, 250)
    } else {
      this._spinner = false
    }
  }
  protected _spinner: boolean = false

  @Output()
  spinnerChange: EventEmitter<boolean> = new EventEmitter()

  @Output()
  onPick: EventEmitter<{ value: any; event?: Event }> = new EventEmitter()

  @ViewChild('input')
  inputEl!: ElementRef<HTMLInputElement>

  @ViewChild('scroller')
  scrollerEl!: ElementRef<HTMLDivElement>

  protected passwordVisible: boolean = false

  focused: boolean = false

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
    }, 250)
  }
  protected _height: number = 0
  protected heightTimeout?: NodeJS.Timeout

  animatingHeight: boolean = false

  spinnerTimeout?: NodeJS.Timeout

  constructor(protected idService: IdService) {}

  ngAfterViewInit(): void {
    if (this.autofocus) {
      setTimeout(() => this.inputEl.nativeElement.focus())
    }
  }

  onFocusInput(): void {
    this.focused = true
    clearArray(this.choices)
    this.getChoices()
  }

  @Debounce(250)
  onValueChange(): void {
    this.getChoices()
  }

  onScroll(): void {
    if (
      this.scrollerEl.nativeElement.scrollTop + this.scrollerEl.nativeElement.offsetHeight ===
      this.scrollerEl.nativeElement.scrollHeight
    ) {
      this.getChoices(true)
    }
  }

  getChoices(nextPage: boolean = false): void {
    if (this.focused) {
      if (this.suggestions) {
        const keywords = this.value
          .split(' ')
          .map((keyword) => keyword.trim().toLowerCase())
          .filter(Boolean)

        clearArray(this.choices)

        for (const suggestion of this.suggestions) {
          if (keywords.every((keyword) => suggestion.toLowerCase().includes(keyword))) {
            this.choices.push({ label: suggestion, value: suggestion })
          }
        }

        this.choices.sort((a, b) => {
          const aIndex = keywords
            .map((keyword) => a.value.toLowerCase().indexOf(keyword.toLowerCase()))
            .sort()[0]

          const bIndex = keywords
            .map((keyword) => b.value.toLowerCase().indexOf(keyword.toLowerCase()))
            .sort()[0]

          return aIndex - bIndex
        })

        this.updateHeight()
      } else {
        this.fetchChoices.emit({
          keywords: this.value,
          nextPage: nextPage ? 'nextPage' : undefined,
        })
      }
    }
  }

  onBlurInput(): void {
    this.focused = false
    this.highlighted = null
    this.height = 0

    clearTimeout(this.spinnerTimeout)
    this.spinner = false
    this.spinnerChange.emit(false)

    this.edited.emit(this.value)
  }

  highlight(choice: Choice & { id: number }): void {
    this.highlighted = choice
  }

  highlightPrev(): void {
    this.highlighted =
      prev({ value: this.highlighted?.value, label: '' }, this.choices, 'value') ?? null
    this.scrollToHighlighted()
  }

  highlightNext(): void {
    this.highlighted =
      next({ value: this.highlighted?.value, label: '' }, this.choices, 'value') ?? null
    this.scrollToHighlighted()
  }

  pick(choice?: Choice, event?: Event): void {
    const value = choice?.value ?? this.highlighted?.value ?? this.value

    this.onPick.emit({ value, event })
    this.inputEl.nativeElement.blur()

    if (value !== this.value && !event?.defaultPrevented) {
      this.value = value
      this.valueChange.emit(this.value)
      this.edited.emit(this.value)
    }
  }

  onEnterKey(event: Event): void {
    if (this.highlighted) {
      event.stopPropagation()
      this.pick(undefined, event)
      this.inputEl.nativeElement.blur()
    }
  }

  protected updateHeight(): void {
    this.height = (Math.min(6, this.choices.length) * 9) / 4
  }

  @Debounce(150)
  protected scrollToHighlighted(): void {
    this.scrollerEl.nativeElement
      .querySelector(`button[data-highlighted]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}
