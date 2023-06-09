import { HttpErrorResponse } from '@angular/common/http'
import { Component, HostListener, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import {
  Collection,
  ConditionalLogic,
  flattenFields,
  getDefaultFieldValue,
  PostRecord,
  standardCollectionFields,
} from '@pruvious-test/shared'
import { lowercaseFirstLetter } from '@pruvious-test/utils'
import { ToastrService } from 'ngx-toastr'
import { takeUntil } from 'rxjs'
import { HistoryComponent } from 'src/app/components/history.component'
import { ApiService } from 'src/app/services/api.service'
import { AuthService } from 'src/app/services/auth.service'
import { ClickService } from 'src/app/services/click.service'
import { ConfigService } from 'src/app/services/config.service'
import { DialogService } from 'src/app/services/dialog.service'
import { MediaService, PickRequirements } from 'src/app/services/media.service'
import { StateService } from 'src/app/services/state.service'
import { blur } from 'src/app/utils/dom'
import { getHotkeyAction } from 'src/app/utils/hotkeys'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-post',
  templateUrl: './post.component.html',
})
export class PostComponent extends HistoryComponent implements OnInit {
  collection: Collection = this.route.snapshot.data['collection']

  post!: Partial<PostRecord>

  exists!: boolean

  validator = new Validator()

  conditionalLogic = new ConditionalLogic({}, [], [])

  mediaPickerVisible: boolean = false

  mediaPickerRequirements?: PickRequirements

  singularItemLowerCase: string = lowercaseFirstLetter(this.collection.labels!.item!.singular)

  pluralItemLowerCase: string = lowercaseFirstLetter(this.collection.labels!.item!.plural)

  publishDateDescription: string = `You can schedule the ${lowercaseFirstLetter(
    this.collection.labels!.item!.singular,
  )} to be published at a specific date and time in the future.`

  confirm?: string

  hasVisibleCustomFields: boolean = flattenFields(this.collection.fields ?? []).some(
    (field) => field.visible !== false,
  )

  constructor(
    public config: ConfigService,
    protected api: ApiService,
    protected auth: AuthService,
    protected click: ClickService,
    protected dialog: DialogService,
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

    this.config.languageChanged$.pipe(takeUntil(this.unsubscribeAll$)).subscribe(() => {
      const language = this.config.currentLanguage

      if (this.collection.translatable) {
        if (this.exists && this.post.translations![language]) {
          this.router.navigate(['../', this.post.translations![language]!.id], {
            relativeTo: this.route,
          })
        } else if (
          this.exists &&
          !this.post.translations![language] &&
          language !== this.post.language
        ) {
          const languageLabel = this.config.cms.languages!.find(
            (l) => l.code === this.config.currentLanguage,
          )!.label

          if (this.config.can[`createPosts:${this.collection.name}`]) {
            this.dialog
              .open({
                message: `The <strong class="text-primary-700">${languageLabel}</strong> translation of this ${lowercaseFirstLetter(
                  this.collection.labels!.item!.singular,
                )} does not exist. Do you want to create it?`,
                buttons: [
                  { label: 'Cancel', value: 'cancel', color: 'white' },
                  { label: 'Create translation', value: 'create' },
                ],
              })
              .pipe(takeUntil(this.unsubscribeAll$))
              .subscribe(async (action) => {
                this.config.currentLanguage = this.post.language!

                if (action === 'create') {
                  const success = await this.addTranslation(language)

                  if (success) {
                    this.router.navigate(['../', this.post.translations![language]!.id], {
                      relativeTo: this.route,
                    })
                  }
                }
              })
          } else {
            this.dialog
              .open({
                message: `The <strong class="text-primary-700">${languageLabel}</strong> translation of this ${lowercaseFirstLetter(
                  this.collection.labels!.item!.singular,
                )} does not exist.`,
                buttons: [{ label: 'Close', value: 'close', color: 'white' }],
              })
              .pipe(takeUntil(this.unsubscribeAll$))
              .subscribe(() => {
                this.config.currentLanguage = this.post.language!
              })
          }
        } else {
          this.post.language = language
          this.pushHistoryState()
        }
      }
    })

    this.dialog.data$.pipe(takeUntil(this.unsubscribeAll$)).subscribe((data) => {
      if (!data) {
        this.config.currentLanguage = this.post.language!
      }
    })
  }

  protected resolve(): void {
    this.post = this.route.snapshot.data['post'] ?? {
      public: true,
      language: this.collection.translatable
        ? this.config.currentLanguage
        : this.config.cms.defaultLanguage,
      publishDate: null,
    }

    flattenFields(this.collection.fields ?? []).forEach((field) => {
      if (this.post[field.name] === undefined) {
        this.post[field.name] = getDefaultFieldValue(field)
      }
    })

    this.conditionalLogic
      .setFields([...standardCollectionFields, ...(this.collection.fields ?? [])])
      .setRecords(this.post)

    this.exists = !!this.route.snapshot.data['post']

    this.updateTitle()
    this.pushHistoryState(true)
  }

  pushHistoryState(reset: boolean = false): void {
    const changed = this.addState(JSON.stringify(this.post), Date.now(), reset)

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
    if (this.validator.isLocked || !this.config.can[`updatePosts:${this.collection.name}`]) {
      return
    }

    this.validator.reset().lock()

    const method = this.exists ? 'updatePost' : 'createPost'
    const itemLabel = this.collection.labels!.item!.singular
    const data = { ...this.post }

    this.api[method](this.collection.name, data)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (post) => {
          if (this.exists) {
            this.toastr.success(`${itemLabel} updated`)
          } else {
            this.toastr.success(`${itemLabel} created`)
            this.clearStates()
            this.router.navigate(['/collections', this.collection.name, 'posts', post.id])
          }

          this.post = post
          this.config.currentLanguage = this.post.language!
          this.exists = true
          this.updateTitle()
          this.validator.unlock()
          this.conditionalLogic.setRecords(this.post)
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
      this.post = { ...JSON.parse(state), translations: this.post.translations }
      this.config.currentLanguage = this.post.language!
      this.conditionalLogic.setRecords(this.post).check()
    }
  }

  redo(): void {
    const state = this.setState(this.stateIndex + 1, Date.now())

    if (state !== null) {
      this.post = { ...JSON.parse(state), translations: this.post.translations }
      this.config.currentLanguage = this.post.language!
      this.conditionalLogic.setRecords(this.post).check()
    }
  }

  async addTranslation(language: string, duplicate: boolean = false): Promise<boolean> {
    const initialState = JSON.parse(this.initialState)

    let base: Record<string, any> = {}

    if (duplicate) {
      base = initialState
    } else {
      flattenFields(this.collection.fields ?? []).forEach((field) => {
        base[field.name] = getDefaultFieldValue(field)
      })
    }

    return new Promise<boolean>((resolve) => {
      this.api
        .createPost(this.collection.name, {
          ...base,
          public: false,
          language,
          translationOf: initialState.id,
          publishDate: null,
        })
        .pipe(takeUntil(this.unsubscribeAll$))
        .subscribe({
          next: (post) => {
            this.post.translations![language] = { id: post.id! }
            this.toastr.success('Translation created')
            resolve(true)
          },
          error: (response: HttpErrorResponse) => {
            if (response.status === 400) {
              this.toastr.error(response.error.message)
            } else if (response.status === 422) {
              this.toastr.error('Unable to create translation (try reloading this page)')
            }
            resolve(false)
          },
        })
    })
  }

  onDeletePost(event: MouseEvent): void {
    if (!this.confirm?.startsWith('delete-post-')) {
      event.stopPropagation()

      this.confirm = `delete-post-${this.post.id}`

      this.click.confirm(
        event.target as Element,
        (event) => {
          event?.stopPropagation()
          this.confirm = undefined

          this.api
            .deletePost(this.collection.name, this.post)
            .pipe(takeUntil(this.unsubscribeAll$))
            .subscribe({
              next: () => {
                this.toastr.success(`${this.collection.labels!.item!.singular} deleted`)
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
        ? this.post[this.collection.listing!.fields![0]] ?? this.post.id!
        : `New ${lowercaseFirstLetter(this.collection.labels!.item!.singular)}`,
      this.collection.labels!.title!.plural,
    )
  }
}
