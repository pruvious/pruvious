import { Pipe, PipeTransform } from '@angular/core'
import { lowercaseFirstLetter } from '@pruvious/utils'

@Pipe({
  name: 'lowercaseFirstLetter',
})
export class LowercaseFirstLetterPipe implements PipeTransform {
  constructor() {}

  transform(text: string): string {
    return lowercaseFirstLetter(text)
  }
}
