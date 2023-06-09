import { Pipe, PipeTransform } from '@angular/core'
import { uppercaseFirstLetter } from '@pruvious-test/utils'

@Pipe({
  name: 'uppercaseFirstLetter',
})
export class UppercaseFirstLetterPipe implements PipeTransform {
  constructor() {}

  transform(text: string): string {
    return uppercaseFirstLetter(text)
  }
}
