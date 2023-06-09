import {
  AfterViewInit,
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
import { dayjs } from '@pruvious/shared'
import { Debounce } from '@pruvious/utils'
import flatpickr from 'flatpickr'
import { Instance } from 'flatpickr/dist/types/instance'
import { ConfigService } from 'src/app/services/config.service'
import { IdService } from 'src/app/services/id.service'

@Component({
  selector: 'app-date-time',
  templateUrl: './date-time.component.html',
})
export class DateTimeComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input()
  value: string = ''

  @Output()
  valueChange: EventEmitter<string> = new EventEmitter()

  @Input()
  timestamp: number | null = null

  @Output()
  timestampChange: EventEmitter<number | null> = new EventEmitter()

  @Input()
  mode: 'dateTime' | 'date' | 'time' = 'dateTime'

  @Input()
  utc: boolean = false

  @Input()
  label: string = ''

  @Input()
  description: string = ''

  @Input()
  placeholder?: string | null

  @Input()
  required: boolean = false

  @Input()
  disabled: boolean = false

  @Input()
  minDate: number | string | null = null

  @Input()
  maxDate: number | string | null = null

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

  @ViewChild('input')
  inputEl!: ElementRef<HTMLInputElement>

  labelHovered: boolean = false

  flatpickr?: Instance

  format: string = ''

  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone

  constructor(protected config: ConfigService, protected idService: IdService) {}

  onClickLabel(): void {
    if (!this.disabled) {
      this.flatpickr?.open()
    }
  }

  ngAfterViewInit(): void {
    this.updateFormat()

    this.flatpickr = flatpickr(this.inputEl.nativeElement, {
      altInput: true,
      altFormat: this.format,
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      enableTime: this.mode !== 'date',
      enableSeconds: this.mode !== 'date',
      formatDate: (date, format) => {
        let dayjsDate = dayjs(date, format)

        if (this.utc) {
          dayjsDate = dayjsDate.subtract(dayjsDate.utcOffset() * 60000)
        }

        return dayjs(date).format(format)
      },
      minuteIncrement: 1,
      noCalendar: this.mode === 'time',
      parseDate: (date, format) => {
        let dayjsDate: dayjs.Dayjs = dayjs(date, format)

        if (this.utc) {
          dayjsDate = dayjsDate.subtract(dayjsDate.utcOffset() * 60000)
        }

        return dayjsDate.toDate()
      },
      minDate:
        this.minDate !== null
          ? dayjs(this.minDate)
              .subtract(this.utc ? dayjs(this.minDate).utcOffset() * 60000 : 0)
              .toDate()
          : undefined,
      maxDate:
        this.maxDate !== null
          ? dayjs(this.maxDate)
              .subtract(this.utc ? dayjs(this.maxDate).utcOffset() * 60000 : 0)
              .toDate()
          : undefined,
      static: true,
      time_24hr: this.config.me.timeFormat.includes('H'),
    })

    if (this.timestamp !== null) {
      this.setFromTimestamp()
    } else {
      this.setFromValue()
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.setFromValue()
    }

    if (changes['timestamp']) {
      this.setFromTimestamp()
    }

    if (changes['mode']) {
      this.updateFormat()
    }
  }

  protected getTime(date: Date): number {
    return (
      (date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds()) * 1000 +
      date.getUTCMilliseconds()
    )
  }

  protected updateFormat(): void {
    this.format =
      this.mode === 'date'
        ? this.config.me.dateFormat
        : this.mode === 'time'
        ? this.config.me.timeFormat
        : `${this.config.me.dateFormat} ${this.config.me.timeFormat}`
  }

  onChange(): void {
    if (this.value) {
      let date = dayjs(this.value, this.format)

      if (this.utc) {
        date = date.add(date.utcOffset() * 60000)
      }

      if (this.mode === 'time') {
        this.timestampChange.emit(this.getTime(date.toDate()))
      } else {
        this.valueChange.emit(date.toISOString())
        this.timestampChange.emit(date.toDate().getTime())
      }
    } else {
      this.valueChange.emit(null as any)
      this.timestampChange.emit(null as any)
    }
  }

  @Debounce(0)
  protected setFromValue(): void {
    if (!this.flatpickr?.config) {
      return
    } else if (this.value) {
      this.flatpickr?.setDate(dayjs(this.value).toISOString())
    } else {
      this.flatpickr?.clear()
    }
  }

  @Debounce(0)
  protected setFromTimestamp(): void {
    if (!this.flatpickr?.config) {
      return
    } else if (this.timestamp === null) {
      this.flatpickr?.clear()
    } else {
      this.flatpickr?.setDate(dayjs(+this.timestamp!).toISOString())
    }
  }

  ngOnDestroy(): void {
    this.flatpickr?.destroy()
  }
}
