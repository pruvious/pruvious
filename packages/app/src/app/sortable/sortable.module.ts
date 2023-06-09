import { ModuleWithProviders, NgModule } from '@angular/core'
import { Options } from 'sortablejs'
import { SORTABLE_GLOBALS } from './globals'
import { SortableDirective } from './sortable.directive'

@NgModule({
  declarations: [SortableDirective],
  exports: [SortableDirective],
})
export class SortableModule {
  public static forRoot(globalOptions: Options): ModuleWithProviders<SortableModule> {
    return {
      ngModule: SortableModule,
      providers: [{ provide: SORTABLE_GLOBALS, useValue: globalOptions }],
    }
  }
}
