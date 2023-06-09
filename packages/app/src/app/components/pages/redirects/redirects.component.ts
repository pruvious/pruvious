import { HttpErrorResponse } from '@angular/common/http'
import { Component, HostListener, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import {
  ConditionalLogic,
  ExtendedTabbedFieldLayout,
  Field,
  FieldGroup,
  RedirectionTestField,
} from '@pruvious/shared'
import { ToastrService } from 'ngx-toastr'
import { takeUntil } from 'rxjs'
import { HistoryComponent } from 'src/app/components/history.component'
import { ApiService } from 'src/app/services/api.service'
import { AuthService } from 'src/app/services/auth.service'
import { ConfigService } from 'src/app/services/config.service'
import { StateService } from 'src/app/services/state.service'
import { blur } from 'src/app/utils/dom'
import { getHotkeyAction } from 'src/app/utils/hotkeys'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-redirects',
  templateUrl: './redirects.component.html',
})
export class RedirectsComponent extends HistoryComponent implements OnInit {
  data!: Record<string, any>

  validator = new Validator()

  fields!: (Field | FieldGroup | ExtendedTabbedFieldLayout | RedirectionTestField)[]

  conditionalLogic = new ConditionalLogic({}, [], [])

  protected redirectionTestField: RedirectionTestField = {
    type: 'redirectionTest',
    redirects: [],
    testValue: '/',
  }

  constructor(
    public config: ConfigService,
    protected api: ApiService,
    protected auth: AuthService,
    protected route: ActivatedRoute,
    protected router: Router,
    protected state: StateService,
    protected toastr: ToastrService,
  ) {
    super()
    this.config.setTitle('Redirection')
  }

  ngOnInit(): void {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false
    this.resolve()
  }

  protected resolve(): void {
    this.data = { redirects: this.route.snapshot.data['redirects'] }
    this.redirectionTestField.redirects = this.data['redirects']
    this.fields = [
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Rules',
            fields: [
              {
                name: 'redirects',
                type: 'repeater',
                label: 'Redirection rules',
                description: 'Redirects are applied in the specified order',
                itemLabel: 'rule',
                subFields: [
                  {
                    type: 'stack',
                    minFieldWidth: ['10rem', 'fill'],
                    fields: [
                      {
                        name: 'isRegex',
                        type: 'switch',
                        label: 'RegExp match',
                        description:
                          'Whether to use JavaScript regular expressions to match page paths.',
                      },
                      {
                        name: 'match',
                        type: 'text',
                        default: '/',
                        description:
                          'A string (e.g. **/contact**) or regular expression (e.g. **^\\/contact\\/(.*)$**) to match a page path.',
                      },
                    ],
                  },
                  {
                    type: 'stack',
                    minFieldWidth: ['10rem', 'fill'],
                    fields: [
                      {
                        name: 'isPermanent',
                        type: 'switch',
                        label: 'Permanent',
                        description:
                          'Whether the redirection is meant to last forever. Search engine robots, RSS readers, and other crawlers will update the original URL for the resource.',
                      },
                      {
                        name: 'redirectTo',
                        type: 'text',
                        default: '/',
                        description:
                          'A page path or URL to which users will be redirected if there is a match (page paths must begin with **/**). If a path is matched with a regular expression, you can use indexed capture groups in **$n** notation (e.g. **/contact/$1**).',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            label: 'Test',
            fields: [this.redirectionTestField],
          },
        ],
      },
    ]

    this.conditionalLogic.setFields(this.fields).setRecords(this.data)

    this.pushHistoryState(true)
  }

  pushHistoryState(reset: boolean = false): void {
    const changed = this.addState(JSON.stringify(this.data), Date.now(), reset)

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
    if (this.validator.isLocked || !this.config.can['updateRedirects']) {
      return
    }

    this.validator.reset().lock()

    this.api
      .updateRedirects(this.data['redirects'])
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (redirects) => {
          this.toastr.success('Redirection rules updated (activation may take up to a minute)')
          this.data['redirects'] = redirects
          this.redirectionTestField.redirects = redirects
          this.validator.unlock()
          this.conditionalLogic.setRecords(this.data)
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

  undo(): void {
    const state = this.setState(this.stateIndex - 1, Date.now())

    if (state !== null) {
      this.data = { ...JSON.parse(state) }
      this.redirectionTestField.redirects = this.data['redirects']
      this.conditionalLogic.setRecords(this.data).check()
    }
  }

  redo(): void {
    const state = this.setState(this.stateIndex + 1, Date.now())

    if (state !== null) {
      this.data = { ...JSON.parse(state) }
      this.redirectionTestField.redirects = this.data['redirects']
      this.conditionalLogic.setRecords(this.data).check()
    }
  }
}
