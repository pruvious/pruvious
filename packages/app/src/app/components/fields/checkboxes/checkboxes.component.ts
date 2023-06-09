import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core'
import { Choice } from '@pruvious-test/shared'
import { clearArray, clearObject } from '@pruvious-test/utils'
import { SortableOptions } from 'sortablejs'
import { IdService } from 'src/app/services/id.service'

@Component({
  selector: 'app-checkboxes',
  templateUrl: './checkboxes.component.html',
})
export class CheckboxesComponent implements OnChanges, OnDestroy {
  @Input()
  value: string[] = []

  @Output()
  valueChange: EventEmitter<string[]> = new EventEmitter()

  @Input()
  choices: Choice[] = []

  @Input()
  required: boolean = false

  @Input()
  isSortable: boolean = false

  @Input()
  label: string = ''

  @Input()
  description: string = ''

  @Input()
  disabled: any[] = []

  @Input()
  error: string | null = null

  @Input()
  id: string = this.idService.generate()

  @Input()
  key: string = ''

  @Input()
  name: string = ''

  @Input()
  allDisabled: boolean = false

  @ViewChild('container')
  containerEl!: ElementRef<HTMLDivElement>

  checkboxValues: Record<string, any> = {}

  disabledCheckboxes: Record<string, boolean> = {}

  sorting: boolean = false

  sortableOptions: SortableOptions = {
    onUpdate: () => {
      const original = [...this.choices]
      this.containerEl.nativeElement.style.height = `${this.containerEl.nativeElement.offsetHeight}px`
      this.choices = []

      setTimeout(() => {
        this.choices = original
        this.containerEl.nativeElement.removeAttribute('style')
        this.onChange()
        this.sorting = false
        document.body.classList.remove('sorting')
      })
    },
    onStart: () => {
      this.sorting = true
      document.body.classList.add('sorting')
    },
    onEnd: () => {
      this.sorting = false
      document.body.classList.remove('sorting')
    },
  }

  constructor(protected idService: IdService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['choices']) {
      clearObject(this.checkboxValues)
      clearObject(this.disabledCheckboxes)
    }

    if (changes['value'] || changes['choices']) {
      this.choices.forEach((choice) => {
        this.checkboxValues[choice.value] = this.value.includes(choice.value)
      })
    }

    if (changes['disabled'] || changes['choices']) {
      this.choices.forEach((choice) => {
        this.disabledCheckboxes[choice.value] = this.disabled.includes(choice.value)
      })
    }
  }

  onChange(): void {
    clearArray(this.value)

    this.choices.forEach((choice) => {
      if (this.checkboxValues[choice.value]) {
        this.value.push(choice.value)
      }
    })

    this.valueChange.emit(this.value)
  }

  ngOnDestroy(): void {
    if (this.sorting) {
      document.body.classList.remove('sorting')
    }
  }
}
