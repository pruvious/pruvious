import { ValidationError } from '@pruvious/shared'
import { clearObject, Debounce } from '@pruvious/utils'
import { BehaviorSubject, Observable } from 'rxjs'

export class Validator {
  hasErrors: boolean = false

  isLocked: boolean = false

  errors: { [name: string]: string } = {}

  generalError: string = ''

  get update$(): Observable<void> {
    return this._update$.asObservable()
  }
  protected _update$ = new BehaviorSubject<void>(undefined)

  setFieldError(fieldName: string, errorMessage: string): void {
    this.errors[fieldName] = errorMessage
    this.refresh()
  }

  setFieldErrors(response: { errors: ValidationError[] }): void {
    response.errors.forEach((error) => {
      if (error.field === '_pruvious') {
        this.setGeneralError(error.message)
      } else if (!this.errors[error.field]) {
        this.errors[error.field] = error.message
      }
    })

    this.refresh()
  }

  setGeneralError(errorMessage: string): void {
    this.generalError = errorMessage
    this.refresh()
  }

  lock(): this {
    this.isLocked = true
    return this
  }

  unlock(): this {
    this.isLocked = false
    return this
  }

  reset(): this {
    clearObject(this.errors)
    this.generalError = ''
    this.refresh()
    this.unlock()
    return this
  }

  @Debounce(150)
  protected refresh(): void {
    this.hasErrors = Object.keys(this.errors).length > 0 || !!this.generalError
    this._update$.next()
  }
}
