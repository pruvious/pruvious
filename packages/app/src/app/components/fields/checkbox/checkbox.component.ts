import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { IdService } from 'src/app/services/id.service'

@Component({
  selector: 'app-checkbox',
  templateUrl: './checkbox.component.html',
  styles: [
    `
      input:checked {
        background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
      }

      input.indeterminate {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 16 16'%3e%3cpath stroke='white' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 8h8'/%3e%3c/svg%3e");
      }
    `,
  ],
})
export class CheckboxComponent implements OnChanges {
  @Input()
  value: any = false

  @Output()
  valueChange: EventEmitter<any> = new EventEmitter()

  @Input()
  on: any = true

  @Input()
  off: any = false

  @Input()
  isSortable: boolean = false

  @Input()
  sorting: boolean = false

  @Input()
  indeterminate: boolean = false

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

  checkboxValue: boolean = false

  constructor(protected idService: IdService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.checkboxValue = JSON.stringify(this.value) === JSON.stringify(this.on)
    }
  }
}
