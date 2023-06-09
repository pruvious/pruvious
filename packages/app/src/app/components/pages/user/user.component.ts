import { HttpErrorResponse } from '@angular/common/http'
import { Component, HostListener, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import {
  Choice,
  ConditionalLogic,
  dayjs,
  flattenFields,
  getDefaultFieldValue,
  standardUserFields,
  UserRecord,
} from '@pruvious/shared'
import { lowercaseFirstLetter } from '@pruvious/utils'
import { ToastrService } from 'ngx-toastr'
import { interval, takeUntil } from 'rxjs'
import { HistoryComponent } from 'src/app/components/history.component'
import { ApiService } from 'src/app/services/api.service'
import { AuthService } from 'src/app/services/auth.service'
import { ClickService } from 'src/app/services/click.service'
import { ConfigService } from 'src/app/services/config.service'
import { MediaService, PickRequirements } from 'src/app/services/media.service'
import { StateService } from 'src/app/services/state.service'
import { blur } from 'src/app/utils/dom'
import { getHotkeyAction } from 'src/app/utils/hotkeys'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
})
export class UserComponent extends HistoryComponent implements OnInit {
  user!: Partial<UserRecord> & { password?: string }

  exists!: boolean

  capabilityChoices!: Choice[]

  disabledCapabilities!: string[]

  validator = new Validator()

  conditionalLogic = new ConditionalLogic({}, [], [])

  mediaPickerVisible: boolean = false

  mediaPickerRequirements?: PickRequirements

  singularItemLowerCase: string = lowercaseFirstLetter(this.config.users.labels!.item!.singular)

  pluralItemLowerCase: string = lowercaseFirstLetter(this.config.users.labels!.item!.plural)

  password: string = ''

  changePassword: boolean = false

  confirm?: string

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
    protected click: ClickService,
    protected media: MediaService,
    protected route: ActivatedRoute,
    protected router: Router,
    protected state: StateService,
    protected toastr: ToastrService,
  ) {
    super()
  }

  ngOnInit(): void {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false

    this.resolve()

    this.media.choose$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((requirements) => {
      this.mediaPickerVisible = true
      this.mediaPickerRequirements = requirements
    })

    interval(1000)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe(() => this.updateTimeFormatPreview())
  }

  protected resolve(): void {
    this.user = this.route.snapshot.data['user'] ?? {
      email: '',
      password: '',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm:ss',
      capabilities: ['login'],
      role: null,
      isAdmin: false,
    }

    flattenFields(this.config.users.fields ?? []).forEach((field) => {
      if (this.user[field.name] === undefined) {
        this.user[field.name] = getDefaultFieldValue(field)
      }
    })

    this.conditionalLogic
      .setFields([...standardUserFields, ...(this.config.users.fields ?? [])])
      .setRecords(this.user)

    this.exists = !!this.route.snapshot.data['user']

    this.updateTitle()
    this.updateCapabilityChoices()
    this.updateDateFormatPreview()
    this.updateTimeFormatPreview()
    this.pushHistoryState(true)
  }

  protected updateCapabilityChoices(): void {
    this.capabilityChoices = this.config.capabilities.map((capability: string) => ({
      value: capability,
      label: capability,
    }))

    this.disabledCapabilities = this.config.me.isAdmin
      ? []
      : this.capabilityChoices
          .filter((choice) => {
            return this.exists
              ? !this.config.can['updateUsers'] || !this.config.can[choice.value]
              : !this.config.can[choice.value]
          })
          .map((choice) => choice.value)
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
    if (this.validator.isLocked || !this.config.can['updateUsers']) {
      return
    }

    this.validator.reset().lock()

    const method = this.exists ? 'updateUser' : 'createUser'
    const itemLabel = this.config.users.labels!.item!.singular
    const data = { ...this.user }

    if (!this.exists || (this.changePassword && (!this.user.isAdmin || this.config.me.isAdmin))) {
      data.password = this.password

      if (this.exists) {
        data['updatePassword'] = true
      }
    }

    this.api[method](data)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (user) => {
          if (this.exists) {
            this.toastr.success(`${itemLabel} updated`)
          } else {
            this.toastr.success(`${itemLabel} created`)
            this.clearStates()
            this.updateCapabilityChoices()
            this.router.navigate(['/users', user.id])
          }

          this.user = user
          this.exists = true
          this.updateTitle()
          this.password = ''
          this.validator.unlock()
          this.conditionalLogic.setRecords(this.user)
          this.pushHistoryState(true)

          if (user.id === this.config.me.id) {
            this.api
              .getConfig()
              .pipe(takeUntil(this.unsubscribeAll$))
              .subscribe(({ me }) => {
                this.config.me = me
              })
          }
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
      .logoutUser(this.user.id!)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (count) => {
          if (count === 0) {
            this.toastr.success('No access tokens are currently active')
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

  onDeleteUser(event: MouseEvent): void {
    if (!this.confirm?.startsWith('delete-user-')) {
      event.stopPropagation()

      this.confirm = `delete-user-${this.user.id}`

      this.click.confirm(
        event.target as Element,
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined

          this.api
            .deleteUser(this.user)
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe({
              next: () => {
                this.toastr.success(`${this.config.users.labels!.item!.singular} deleted`)
                this.router.navigate(['..'], { relativeTo: this.route })
              },
              error: (response: HttpErrorResponse) => {
                if (response.status === 400) {
                  this.toastr.error(response.error.message)
                }
              },
            })
        },
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined
        },
      )
    }
  }

  protected updateTitle(): void {
    this.config.setTitle(
      this.exists
        ? this.user.email!
        : `New ${lowercaseFirstLetter(this.config.users.labels!.item!.singular)}`,
      this.config.users.labels!.title!.plural,
    )
  }
}
