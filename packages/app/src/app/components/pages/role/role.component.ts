import { HttpErrorResponse } from '@angular/common/http'
import { Component, HostListener, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Choice, ConditionalLogic, RoleRecord, standardRoleFields } from '@pruvious-test/shared'
import { lowercaseFirstLetter } from '@pruvious-test/utils'
import { ToastrService } from 'ngx-toastr'
import { takeUntil } from 'rxjs'
import { HistoryComponent } from 'src/app/components/history.component'
import { ApiService } from 'src/app/services/api.service'
import { AuthService } from 'src/app/services/auth.service'
import { ClickService } from 'src/app/services/click.service'
import { ConfigService } from 'src/app/services/config.service'
import { StateService } from 'src/app/services/state.service'
import { blur } from 'src/app/utils/dom'
import { getHotkeyAction } from 'src/app/utils/hotkeys'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-role',
  templateUrl: './role.component.html',
})
export class RoleComponent extends HistoryComponent implements OnInit {
  role!: Partial<RoleRecord>

  exists!: boolean

  capabilityChoices!: Choice[]

  disabledCapabilities!: string[]

  validator = new Validator()

  conditionalLogic = new ConditionalLogic({}, [], [])

  singularItemLowerCase: string = lowercaseFirstLetter(this.config.roles.labels!.item!.singular)

  pluralItemLowerCase: string = lowercaseFirstLetter(this.config.roles.labels!.item!.plural)

  confirm?: string

  constructor(
    public config: ConfigService,
    protected api: ApiService,
    protected auth: AuthService,
    protected click: ClickService,
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
  }

  protected resolve(): void {
    this.role = this.route.snapshot.data['role'] ?? {
      name: '',
      capabilities: [],
    }

    this.conditionalLogic.setFields(standardRoleFields).setRecords(this.role)

    this.exists = !!this.route.snapshot.data['role']

    this.updateTitle()
    this.updateCapabilityChoices()
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

  pushHistoryState(reset: boolean = false): void {
    const changed = this.addState(JSON.stringify(this.role), Date.now(), reset)

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
    if (this.validator.isLocked || !this.config.can['updateRoles']) {
      return
    }

    this.validator.reset().lock()

    const method = this.exists ? 'updateRole' : 'createRole'
    const itemLabel = this.config.roles.labels!.item!.singular
    const data = { ...this.role }

    this.api[method](data)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (role) => {
          if (this.exists) {
            this.toastr.success(`${itemLabel} updated`)
          } else {
            this.toastr.success(`${itemLabel} created`)
            this.clearStates()
            this.updateCapabilityChoices()
            this.router.navigate(['/roles', role.id])
          }

          this.role = role
          this.exists = true
          this.updateTitle()
          this.validator.unlock()
          this.conditionalLogic.setRecords(this.role)
          this.pushHistoryState(true)

          if (role.id === this.config.me.role) {
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

  undo(): void {
    const state = this.setState(this.stateIndex - 1, Date.now())

    if (state !== null) {
      this.role = { ...JSON.parse(state) }
      this.conditionalLogic.setRecords(this.role).check()
    }
  }

  redo(): void {
    const state = this.setState(this.stateIndex + 1, Date.now())

    if (state !== null) {
      this.role = { ...JSON.parse(state) }
      this.conditionalLogic.setRecords(this.role).check()
    }
  }

  onDeleteRole(event: MouseEvent): void {
    if (!this.confirm?.startsWith('delete-role-')) {
      event.stopPropagation()

      this.confirm = `delete-role-${this.role.id}`

      this.click.confirm(
        event.target as Element,
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined

          this.api
            .deleteRole(this.role)
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe({
              next: () => {
                this.toastr.success(`${this.config.roles.labels!.item!.singular} deleted`)

                if (this.role.id === this.config.me.role) {
                  this.api
                    .getConfig()
                    .pipe(takeUntil(this.unsubscribeAll$))
                    .subscribe(({ me }) => {
                      this.config.me = me
                      this.router.navigate(['..'], { relativeTo: this.route })
                    })
                } else {
                  this.router.navigate(['..'], { relativeTo: this.route })
                }
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
        ? this.role.name!
        : `New ${lowercaseFirstLetter(this.config.roles.labels!.item!.singular)}`,
      this.config.roles.labels!.title!.plural,
    )
  }
}
