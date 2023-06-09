import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core'
import { Redirect } from '@pruvious/shared'
import { Debounce, isUrl, isUrlPath } from '@pruvious/utils'

@Component({
  selector: 'app-redirection-test',
  templateUrl: './redirection-test.component.html',
})
export class RedirectionTestComponent implements OnInit, OnChanges {
  @Input()
  redirects!: Redirect[]

  @Input()
  value: string = ''

  @Output()
  valueChange = new EventEmitter<string>()

  output: string = ''

  ngOnInit(): void {
    this.test()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['redirects'] && !changes['redirects'].isFirstChange()) {
      this.test()
    }
  }

  @Debounce(250)
  onTest(): void {
    this.test()
  }

  protected test(): void {
    let path: string
    let output: string | undefined

    if (isUrl(this.value)) {
      path = new URL(this.value).pathname
    } else {
      path = this.value
    }

    for (const redirect of this.redirects as Redirect[]) {
      if (isUrlPath(redirect.redirectTo) || isUrl(redirect.redirectTo)) {
        if (redirect.isRegex) {
          try {
            const match = new RegExp(redirect.match).exec(path)

            if (match) {
              output = redirect.redirectTo.replace(/\$([1-9][0-9]*)/g, (_, i) => match[+i] ?? '')
              break
            }
          } catch (_) {}
        } else if (isUrlPath(redirect.match) && redirect.match === path) {
          output = redirect.redirectTo
          break
        }
      }
    }

    this.output = output === undefined ? path : output

    this.valueChange.emit(this.value)
  }
}
