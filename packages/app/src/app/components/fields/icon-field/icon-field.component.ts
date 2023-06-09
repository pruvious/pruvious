import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService } from 'src/app/services/api.service'
import { IconsService } from 'src/app/services/icons.service'

@Component({
  selector: 'app-icon-field',
  templateUrl: './icon-field.component.html',
  styleUrls: ['./icon-field.component.css'],
})
export class IconFieldComponent extends BaseComponent implements OnInit {
  @Input()
  value: string | null = null

  @Output()
  valueChange: EventEmitter<string | null> = new EventEmitter()

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

  @Input()
  returnFormat: 'name' | 'svg' = 'svg'

  @Input()
  allow?: string[]

  @Input()
  forbid?: string[]

  popupVisible: boolean = false

  icons: Record<string, string> | null = null

  filteredIcons: Record<string, string> = {}

  search: string = ''

  @ViewChild('container')
  containerEl!: ElementRef<HTMLDivElement>

  constructor(protected api: ApiService, protected iconsService: IconsService) {
    super()
  }

  ngOnInit(): void {
    this.iconsService.icons$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((icons) => {
      if (icons) {
        this.icons = {}
        this.filteredIcons = this.icons

        for (const [name, svg] of Object.entries(icons)) {
          if ((!this.allow || this.allow.includes(name)) && !this.forbid?.includes(name)) {
            this.icons[name] = svg
          }
        }
      } else {
        this.icons = null
      }
    })
  }

  select(icon: string): void {
    this.value = icon
    this.valueChange.emit(this.value)
  }

  onSearch(): void {
    if (this.icons) {
      const keywords = this.search
        .split(' ')
        .map((keyword) => keyword.trim().toLowerCase())
        .filter(Boolean)

      this.filteredIcons = {}

      for (const [name, svg] of Object.entries(this.icons)) {
        if (keywords.every((keyword) => name.toLowerCase().includes(keyword))) {
          this.filteredIcons[name] = svg
        }
      }
    }
  }

  clear(): void {
    this.value = null
    this.valueChange.emit(this.value)
  }

  openPopup(): void {
    this.popupVisible = true
    this.search = ''
    this.onSearch()
  }

  closePopup(): void {
    this.popupVisible = false
  }
}
