import { HttpErrorResponse } from '@angular/common/http'
import { Component, HostListener, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { ConditionalLogic, dayjs, standardUserFields, UserRecord } from '@pruvious-test/shared'
import { ToastrService } from 'ngx-toastr'
import { interval, takeUntil } from 'rxjs'
import { HistoryComponent } from 'src/app/components/history.component'
import { ApiService } from 'src/app/services/api.service'
import { AuthService } from 'src/app/services/auth.service'
import { ConfigService } from 'src/app/services/config.service'
import { StateService } from 'src/app/services/state.service'
import { blur } from 'src/app/utils/dom'
import { getHotkeyAction } from 'src/app/utils/hotkeys'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
})
export class ProfileComponent extends HistoryComponent implements OnInit {
  user!: Partial<UserRecord> & { password?: string }

  validator = new Validator()

  conditionalLogic = new ConditionalLogic({}, [], [])

  password: string = ''

  changePassword: boolean = false

  dateFormatDescription: string = [
    `**YY** - Two-digit year (e.g. 23)`,
    `**YYYY** - Four-digit year (e.g. 2023)`,
    `**M** - The month, beginning at 1 (e.g. 1-12)`,
    `**MM** - The month, 2-digits (e.g. 01-12)`,
    `**MMM** - The abbreviated month name (e.g. Jan-Dec)`,
    `**MMMM** - The full month name (e.g. January-December)`,
    `**D** - The day of the month (e.g. 1-31)`,
    `**DD** - The day of the month, 2-digits (e.g. 01-31)`,
    `**d** - The day of the week, with Sunday as 0 (e.g. 0-6)`,
    `**dd** - The min name of the day of the week (e.g. Su-Sa)`,
    `**ddd** - The short name of the day of the week (e.g. Sun-Sat)`,
    `**dddd** - The name of the day of the week (e.g. Sunday-Saturday)`,
    `**Q** - Quarter (e.g. 1-4)`,
    `**Do** - Day of Month with ordinal (e.g. 1st 2nd ... 31st)`,
    `**w** - Week of year (e.g. 1 2 ... 52 53)`,
    `**ww** - Week of year, 2-digits (e.g. 01 02 ... 52 53)`,
    `**W** - ISO Week of year (e.g. 1 2 ... 52 53)`,
    `**WW** - ISO Week of year, 2-digits (e.g. 01 02 ... 52 53)`,
    `**wo** - Week of year with ordinal (e.g. 1st 2nd ... 52nd 53rd)`,
    `**[...]** - Escaped characters (e.g. [Year])`,
  ].join('<br>')

  timeFormatDescription: string = [
    `**H** - The hour (e.g. 0-23)`,
    `**HH** - The hour, 2-digits (e.g. 00-23)`,
    `**h** - The hour, 12-hour clock (e.g. 1-12)`,
    `**hh** - The hour, 12-hour clock, 2-digits (e.g. 01-12)`,
    `**m** - The minute (e.g. 0-59)`,
    `**mm** - The minute, 2-digits (e.g. 00-59)`,
    `**s** - The second (e.g. 0-59)`,
    `**ss** - The second, 2-digits (e.g. 00-59)`,
    `**SSS** - The millisecond, 3-digits (e.g. 000-999)`,
    `**Z** - The offset from UTC, ±HH:mm (e.g. +05:00)`,
    `**ZZ** - The offset from UTC, ±HHmm (e.g. +0500)`,
    `**A** - AM PM`,
    `**a** - am pm`,
    `**k** - The hour, beginning at 1 (e.g. 1-24)`,
    `**kk** - The hour, 2-digits, beginning at 1 (e.g. 01-24)`,
    `**z** - Abbreviated named offset (e.g. GMT+1)`,
    `**zzz** - Unabbreviated named offset (e.g. Central European Standard Time)`,
    `**[...]** - Escaped characters (e.g. [Hours])`,
  ].join('<br>')

  dateFormatPreview: string = ''

  timeFormatPreview: string = ''

  constructor(
    public config: ConfigService,
    protected api: ApiService,
    protected auth: AuthService,
    protected router: Router,
    protected state: StateService,
    protected toastr: ToastrService,
  ) {
    super()
    this.config.setTitle('My profile')
  }

  ngOnInit(): void {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false

    this.resolve()

    interval(1000)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe(() => this.updateTimeFormatPreview())
  }

  protected resolve(): void {
    this.user = this.config.me

    this.conditionalLogic
      .setFields([...standardUserFields, ...(this.config.users.fields ?? [])])
      .setRecords(this.user)

    this.updateDateFormatPreview()
    this.updateTimeFormatPreview()
    this.pushHistoryState(true)
  }

  protected updateDateFormatPreview(): void {
    this.dateFormatPreview = dayjs().format(this.user.dateFormat)
  }

  protected updateTimeFormatPreview(): void {
    this.timeFormatPreview = dayjs().format(this.user.timeFormat)
  }

  pushHistoryState(reset: boolean = false): void {
    const changed = this.addState(JSON.stringify(this.user), Date.now(), reset)

    if (changed) {
      this.conditionalLogic.check()
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.state.popupsOpen) {
      const action = getHotkeyAction(event)

      if (action === 'save') {
        event.preventDefault()
        blur()
        setTimeout(() => this.onSubmit())
      } else if (action === 'undo') {
        event.preventDefault()
        this.undo()
      } else if (action === 'redo') {
        event.preventDefault()
        this.redo()
      }
    }
  }

  onSubmit(): void {
    if (this.validator.isLocked || !this.config.can['updateProfile']) {
      return
    }

    this.validator.reset().lock()

    const data = { ...this.user }

    if (this.changePassword) {
      data.password = this.password
      data['updatePassword'] = true
    }

    this.api
      .updateProfile(data)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (user) => {
          this.toastr.success('Profile updated')
          this.user = user
          this.config.me = user
          this.password = ''
          this.validator.unlock()
          this.conditionalLogic.setRecords(this.user)
          this.pushHistoryState(true)
        },
        error: (response: HttpErrorResponse) => {
          this.validator.reset()

          if (response.status === 422) {
            this.validator.setFieldErrors(response.error)
          } else if (response.status === 400) {
            this.validator.setGeneralError(response.error.message)
          }

          if (this.validator.generalError) {
            this.toastr.error(this.validator.generalError)
          } else {
            const errorCount = Object.keys(this.validator.errors).length

            if (errorCount) {
              this.toastr.error(`Found ${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`)
            }
          }
        },
      })
  }

  logout(): void {
    this.api
      .logoutFromOtherDevices()
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (count) => {
          if (count === 0) {
            this.toastr.success('Only this session is currently active')
          } else if (count === 1) {
            this.toastr.success(`${count} access token has been revoked`)
          } else {
            this.toastr.success(`${count} access tokens have been revoked`)
          }

          this.auth.refreshToken()
        },
        error: (response: HttpErrorResponse) => {
          if (response.status === 400) {
            this.toastr.error(response.error.message)
          }
        },
      })
  }

  undo(): void {
    const state = this.setState(this.stateIndex - 1, Date.now())

    if (state !== null) {
      this.user = { ...JSON.parse(state) }
      this.conditionalLogic.setRecords(this.user).check()
    }
  }

  redo(): void {
    const state = this.setState(this.stateIndex + 1, Date.now())

    if (state !== null) {
      this.user = { ...JSON.parse(state) }
      this.conditionalLogic.setRecords(this.user).check()
    }
  }
}
