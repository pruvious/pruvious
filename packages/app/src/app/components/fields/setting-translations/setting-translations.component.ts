import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core'
import { BaseComponent } from 'src/app/components/base.component'
import { ConfigService } from 'src/app/services/config.service'

@Component({
  selector: 'app-setting-translations',
  templateUrl: './setting-translations.component.html',
})
export class SettingTranslationsComponent extends BaseComponent implements OnInit {
  @Input()
  record!: Partial<{
    id: number
    language: string
  }>

  @Input()
  label: string = 'Translations'

  @Input()
  description: string = ''

  @Input()
  canCreate!: boolean

  @Input()
  canUpdate!: boolean

  @Input()
  canMirror: boolean = false

  @ViewChild('container')
  containerEl!: ElementRef<HTMLDivElement>

  @Output()
  addTranslation: EventEmitter<string> = new EventEmitter()

  @Output()
  duplicateTranslation: EventEmitter<string> = new EventEmitter()

  @Output()
  mirrorTranslation: EventEmitter<string> = new EventEmitter()

  labelHovered: boolean = false

  constructor(public config: ConfigService) {
    super()
  }

  ngOnInit(): void {
    this.config.currentLanguage = this.record.language!
  }

  onClickLabel(): void {
    ;(this.containerEl.nativeElement.querySelector('a, button') as any)?.focus()
  }
}
