import { InjectionToken } from '@angular/core'
import { Options } from 'sortablejs'

export const SORTABLE_GLOBALS: InjectionToken<Options> = new InjectionToken(
  'Global config for sortablejs',
)
