import { Pipe, PipeTransform } from '@angular/core'
import { camelToLabel } from '@pruvious/utils'

@Pipe({
  name: 'camelToLabel',
})
export class CamelToLabelPipe implements PipeTransform {
  constructor() {}

  transform(text: string): string {
    return camelToLabel(text)
  }
}
