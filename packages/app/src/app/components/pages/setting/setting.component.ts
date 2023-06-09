import { Component, HostListener, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { ConditionalLogic, flattenFields, SettingRecord, Settings } from '@pruvious-test/shared'
import { camelToLabel } from '@pruvious-test/utils'
import { ToastrService } from 'ngx-toastr'
import { takeUntil } from 'rxjs'
import { HistoryComponent } from 'src/app/components/history.component'
import { ApiService } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'
import { DialogService } from 'src/app/services/dialog.service'
import { MediaService, PickRequirements } from 'src/app/services/media.service'
import { StateService } from 'src/app/services/state.service'
import { blur } from 'src/app/utils/dom'
import { getHotkeyAction } from 'src/app/utils/hotkeys'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-setting',
  templateUrl: './setting.component.html',
  styles: [':host { position: relative }'],
})
export class SettingComponent extends HistoryComponent implements OnInit {
  settingConfig: Settings = this.route.snapshot.data['settingConfig']

  setting: SettingRecord = this.route.snapshot.data['setting']

  validator = new Validator()

  conditionalLogic = new ConditionalLogic({}, [], [])

  mediaPickerVisible: boolean = false

  mediaPickerRequirements?: PickRequirements

  hasVisibleCustomFields: boolean = flattenFields(this.settingConfig.fields).some(
    (field) => field.visible !== false,
  )

  constructor(
    protected api: ApiService,
    protected config: ConfigService,
    protected dialog: DialogService,
    protected media: MediaService,
    protected route: ActivatedRoute,
    protected router: Router,
    protected state: StateService,
    protected toastr: ToastrService,
  ) {
    super()
    this.config.setTitle(this.settingConfig.label!)
    this.deleteTranslationsInHistoryStates = false
  }

  ngOnInit(): void {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false

    this.conditionalLogic.setFields(this.settingConfig.fields).setRecords(this.setting.fields)
    this.pushHistoryState(true)

    this.media.choose$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((requirements) => {
      this.mediaPickerVisible = true
      this.mediaPickerRequirements = requirements
    })

    this.config.languageChanged$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      const language = this.config.currentLanguage

      if (this.settingConfig.translatable && this.setting.language !== language) {
        if (this.canDeactivate()) {
          this.switchLanguage(language)
        } else {
          this.dialog
            .open({
              message: 'Changes that you made may not be saved.',
              buttons: [
                {
                  label: 'Cancel',
                  value: 'cancel',
                  color: 'white',
                },
                {
                  label: 'Leave page',
                  value: 'leave',
                },
              ],
            })
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe((action) => {
              if (action === 'leave') {
                this.switchLanguage(language)
              } else {
                this.config.currentLanguage = this.setting.language
              }
            })
        }
      }
    })
  }

  protected switchLanguage(language: string): void {
    this.api
      .getSettingRaw(this.setting.group, language)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe((setting) => {
        this.setting = setting
        this.clearStates()
        this.conditionalLogic.setRecords(this.setting.fields)
        this.pushHistoryState(true)
      })
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
    if (this.validator.isLocked || !this.config.can[`updateSettings:${this.setting.group}`]) {
      return
    }

    this.validator.reset().lock()

    this.api
      .updateSetting(this.setting)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (setting) => {
          this.toastr.success(
            `${this.settingConfig.label || camelToLabel(this.settingConfig.group!)} updated`,
          )
          this.setting = setting
          this.validator.unlock()
          this.conditionalLogic.setRecords(this.setting.fields)
          this.pushHistoryState(true)
        },
        error: (response) => {
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

  onMirrorTranslation(languageCode: string): void {
    const language = this.config.cms.languages!.find(
      (_language) => _language.code === languageCode,
    )!

    this.dialog
      .open({
        message: `This action will overwrite the content in the <strong class="text-primary-700">${language.label}</strong> translation.`,
        buttons: [
          {
            label: 'Cancel',
            value: 'cancel',
            color: 'white',
          },
          {
            label: 'Continue',
            value: 'continue',
          },
        ],
      })
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe((action) => {
        if (action === 'continue') {
          this.api
            .updateSetting({ ...this.initialStateObj, language: language.code } as any)
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe({
              next: () => {
                this.toastr.success('Content copied')
              },
              error: (response) => {
                if (response.status === 400) {
                  this.toastr.error(response.error.message)
                } else if (response.status === 422) {
                  this.toastr.error('Please correct any errors in this translation first')
                }
              },
            })
        }
      })
  }

  restoreDefaults(): void {
    this.api
      .getSettingDefaults(this.setting.group, this.config.currentLanguage)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (setting) => {
          this.toastr.success('All fields have been reset to their default values')
          this.setting = setting
          this.conditionalLogic.setRecords(this.setting.fields)
          this.pushHistoryState()
        },
        error: (response) => {
          if (response.status === 400) {
            this.toastr.error(response.error.message)
          }
        },
      })
  }

  pushHistoryState(reset: boolean = false): void {
    const changed = this.addState(JSON.stringify(this.setting), Date.now(), reset)

    if (changed) {
      this.conditionalLogic.check()
    }
  }

  undo(): void {
    const state = this.setState(this.stateIndex - 1, Date.now())

    if (state !== null) {
      this.setting = JSON.parse(state)
      this.conditionalLogic.setRecords(this.setting.fields).check()

      if (this.settingConfig.translatable) {
        this.config.currentLanguage = this.setting.language!
      }
    }
  }

  redo(): void {
    const state = this.setState(this.stateIndex + 1, Date.now())

    if (state !== null) {
      this.setting = JSON.parse(state)
      this.conditionalLogic.setRecords(this.setting.fields).check()

      if (this.settingConfig.translatable) {
        this.config.currentLanguage = this.setting.language!
      }
    }
  }
}
