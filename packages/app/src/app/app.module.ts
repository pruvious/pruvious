import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { NgxSliderModule } from 'ngx-slider-v2'
import { ToastrModule } from 'ngx-toastr'

import { AppRoutingModule } from 'src/app/app-routing.module'
import { AppComponent } from 'src/app/app.component'
import { AppInterceptor } from 'src/app/app.interceptor'
import { ButtonGroupComponent } from 'src/app/components/fields/button-group/button-group.component'
import { CheckboxComponent } from 'src/app/components/fields/checkbox/checkbox.component'
import { CheckboxesComponent } from 'src/app/components/fields/checkboxes/checkboxes.component'
import { DateTimeComponent } from 'src/app/components/fields/date-time/date-time.component'
import { EditorComponent } from 'src/app/components/fields/editor/editor.component'
import { IconFieldComponent } from 'src/app/components/fields/icon-field/icon-field.component'
import { ImageComponent } from 'src/app/components/fields/image/image.component'
import { LinkComponent } from 'src/app/components/fields/link/link.component'
import { NumberComponent } from 'src/app/components/fields/number/number.component'
import { PresetFieldComponent } from 'src/app/components/fields/preset-field/preset-field.component'
import { PresetPagesComponent } from 'src/app/components/fields/preset-pages/preset-pages.component'
import { RedirectionTestComponent } from 'src/app/components/fields/redirection-test/redirection-test.component'
import { RelationComponent } from 'src/app/components/fields/relation/relation.component'
import { RepeaterComponent } from 'src/app/components/fields/repeater/repeater.component'
import { SelectComponent } from 'src/app/components/fields/select/select.component'
import { SettingTranslationsComponent } from 'src/app/components/fields/setting-translations/setting-translations.component'
import { SizeComponent } from 'src/app/components/fields/size/size.component'
import { SliderComponent } from 'src/app/components/fields/slider/slider.component'
import { TabsComponent } from 'src/app/components/fields/tabs/tabs.component'
import { TextAreaComponent } from 'src/app/components/fields/text-area/text-area.component'
import { TextInputComponent } from 'src/app/components/fields/text-input/text-input.component'
import { TranslationsComponent } from 'src/app/components/fields/translations/translations.component'
import { UrlComponent } from 'src/app/components/fields/url/url.component'
import { InstallComponent } from 'src/app/components/install/install.component'
import { BaseLayoutComponent } from 'src/app/components/layouts/base-layout/base-layout.component'
import { DefaultLayoutComponent } from 'src/app/components/layouts/default-layout/default-layout.component'
import { LoginComponent } from 'src/app/components/login/login.component'
import { MediaBreadcrumbsComponent } from 'src/app/components/media/media-breadcrumbs/media-breadcrumbs.component'
import { MediaLibraryComponent } from 'src/app/components/media/media-library/media-library.component'
import { MediaPickerComponent } from 'src/app/components/media/media-picker/media-picker.component'
import { ListComponent } from 'src/app/components/pages/list/list.component'
import { LogoutComponent } from 'src/app/components/pages/logout/logout.component'
import { MediaComponent } from 'src/app/components/pages/media/media.component'
import { PageComponent } from 'src/app/components/pages/page/page.component'
import { PagesComponent } from 'src/app/components/pages/pages/pages.component'
import { PostComponent } from 'src/app/components/pages/post/post.component'
import { PostsComponent } from 'src/app/components/pages/posts/posts.component'
import { PresetComponent } from 'src/app/components/pages/preset/preset.component'
import { PresetsComponent } from 'src/app/components/pages/presets/presets.component'
import { ProfileComponent } from 'src/app/components/pages/profile/profile.component'
import { RedirectsComponent } from 'src/app/components/pages/redirects/redirects.component'
import { RoleComponent } from 'src/app/components/pages/role/role.component'
import { RolesComponent } from 'src/app/components/pages/roles/roles.component'
import { SettingComponent } from 'src/app/components/pages/setting/setting.component'
import { UserComponent } from 'src/app/components/pages/user/user.component'
import { UsersComponent } from 'src/app/components/pages/users/users.component'
import { AddBlockComponent } from 'src/app/components/ui/add-block/add-block.component'
import { BlockComponent } from 'src/app/components/ui/block/block.component'
import { DialogComponent } from 'src/app/components/ui/dialog/dialog.component'
import { DragImageComponent } from 'src/app/components/ui/drag-image/drag-image.component'
import { FieldValueComponent } from 'src/app/components/ui/field-value/field-value.component'
import { FieldsComponent } from 'src/app/components/ui/fields/fields.component'
import { FiltersComponent } from 'src/app/components/ui/filters/filters.component'
import { HistoryButtonsComponent } from 'src/app/components/ui/history-buttons/history-buttons.component'
import { IconComponent } from 'src/app/components/ui/icon/icon.component'
import { LoadingBarComponent } from 'src/app/components/ui/loading-bar/loading-bar.component'
import { PaginationComponent } from 'src/app/components/ui/pagination/pagination.component'
import { PasswordStrengthComponent } from 'src/app/components/ui/password-strength/password-strength.component'
import { PopupHeaderComponent } from 'src/app/components/ui/popup-header/popup-header.component'
import { PopupComponent } from 'src/app/components/ui/popup/popup.component'
import { TableCellComponent } from 'src/app/components/ui/table-cell/table-cell.component'
import { TableSorterComponent } from 'src/app/components/ui/table-sorter/table-sorter.component'
import { TooltipDirective } from 'src/app/directives/tooltip.directive'
import { TrapFocusDirective } from 'src/app/directives/trap-focus.directive'
import { AuthGuard } from 'src/app/guards/auth.guard'
import { GuestGuard } from 'src/app/guards/guest.guard'
import { UnsavedGuard } from 'src/app/guards/unsaved.guard'
import { CamelToLabelPipe } from 'src/app/pipes/camel-to-label'
import { LowercaseFirstLetterPipe } from 'src/app/pipes/lowercase-first-letter.pipe'
import { SafePipe } from 'src/app/pipes/safe.pipe'
import { StringifyPipe } from 'src/app/pipes/stringify.pipe'
import { UppercaseFirstLetterPipe } from 'src/app/pipes/uppercase-first-letter.pipe'
import { CollectionResolver } from 'src/app/resolvers/collection.resolver'
import { ConfigResolver } from 'src/app/resolvers/config.resolver'
import { CreatePageResolver } from 'src/app/resolvers/create-page.resolver'
import { CreatePostResolver } from 'src/app/resolvers/create-post.resolver'
import { CreatePresetResolver } from 'src/app/resolvers/create-preset.resolver'
import { CreateRoleResolver } from 'src/app/resolvers/create-role.resolver'
import { CreateUserResolver } from 'src/app/resolvers/create-user.resolver'
import { DirectoriesResolver } from 'src/app/resolvers/directories.resolver'
import { DirectoryResolver } from 'src/app/resolvers/directory.resolver'
import { HomeResolver } from 'src/app/resolvers/home.resolver'
import { PageResolver } from 'src/app/resolvers/page.resolver'
import { PagesResolver } from 'src/app/resolvers/pages.resolver'
import { PostResolver } from 'src/app/resolvers/post.resolver'
import { PresetResolver } from 'src/app/resolvers/preset.resolver'
import { PreviewResolver } from 'src/app/resolvers/preview.resolver'
import { RedirectsResolver } from 'src/app/resolvers/redirects.resolver'
import { RefreshTokenResolver } from 'src/app/resolvers/refresh-token.resolver'
import { RoleResolver } from 'src/app/resolvers/role.resolver'
import { SettingConfigResolver } from 'src/app/resolvers/setting-config.resolver'
import { SettingResolver } from 'src/app/resolvers/setting.resolver'
import { SettingsResolver } from 'src/app/resolvers/settings.resolver'
import { UploadResolver } from 'src/app/resolvers/upload.resolver'
import { UploadsResolver } from 'src/app/resolvers/uploads.resolver'
import { UserResolver } from 'src/app/resolvers/user.resolver'
import { ApiService } from 'src/app/services/api.service'
import { AuthService } from 'src/app/services/auth.service'
import { BlockService } from 'src/app/services/block.service'
import { ClickService } from 'src/app/services/click.service'
import { ConfigService } from 'src/app/services/config.service'
import { DialogService } from 'src/app/services/dialog.service'
import { DragImageService } from 'src/app/services/drag-image.service'
import { IconsService } from 'src/app/services/icons.service'
import { IdService } from 'src/app/services/id.service'
import { LoadingService } from 'src/app/services/loading.service'
import { MediaService } from 'src/app/services/media.service'
import { StateService } from 'src/app/services/state.service'
import { SortableModule } from 'src/app/sortable/sortable.module'

@NgModule({
  declarations: [
    AddBlockComponent,
    AppComponent,
    BaseLayoutComponent,
    BlockComponent,
    ButtonGroupComponent,
    CamelToLabelPipe,
    CheckboxComponent,
    CheckboxesComponent,
    DateTimeComponent,
    DefaultLayoutComponent,
    DialogComponent,
    DragImageComponent,
    EditorComponent,
    FieldsComponent,
    FieldValueComponent,
    FiltersComponent,
    HistoryButtonsComponent,
    IconComponent,
    IconFieldComponent,
    ImageComponent,
    InstallComponent,
    LinkComponent,
    ListComponent,
    LoadingBarComponent,
    LoginComponent,
    LogoutComponent,
    LowercaseFirstLetterPipe,
    MediaBreadcrumbsComponent,
    MediaComponent,
    MediaLibraryComponent,
    MediaPickerComponent,
    NumberComponent,
    PageComponent,
    PagesComponent,
    PaginationComponent,
    PasswordStrengthComponent,
    PopupComponent,
    PopupHeaderComponent,
    PostComponent,
    PostsComponent,
    PresetComponent,
    PresetFieldComponent,
    PresetPagesComponent,
    PresetsComponent,
    ProfileComponent,
    RedirectionTestComponent,
    RedirectsComponent,
    RelationComponent,
    RepeaterComponent,
    RoleComponent,
    RolesComponent,
    SafePipe,
    SelectComponent,
    SettingComponent,
    SettingTranslationsComponent,
    SizeComponent,
    SliderComponent,
    StringifyPipe,
    TableCellComponent,
    TableSorterComponent,
    TabsComponent,
    TextAreaComponent,
    TextInputComponent,
    TooltipDirective,
    TranslationsComponent,
    TrapFocusDirective,
    UppercaseFirstLetterPipe,
    UrlComponent,
    UserComponent,
    UsersComponent,
  ],
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
    NgxSliderModule,
    SortableModule,
    ToastrModule.forRoot({
      enableHtml: true,
      easeTime: 150,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    }),
  ],
  providers: [
    ApiService,
    AuthGuard,
    AuthService,
    BlockService,
    ClickService,
    CollectionResolver,
    ConfigResolver,
    ConfigService,
    CreatePageResolver,
    CreatePostResolver,
    CreatePresetResolver,
    CreateRoleResolver,
    CreateUserResolver,
    DialogService,
    DirectoriesResolver,
    DirectoryResolver,
    DragImageService,
    GuestGuard,
    HomeResolver,
    IconsService,
    IdService,
    LoadingService,
    MediaService,
    PageResolver,
    PagesResolver,
    PostResolver,
    PresetResolver,
    PreviewResolver,
    RedirectsResolver,
    RefreshTokenResolver,
    RoleResolver,
    SettingConfigResolver,
    SettingResolver,
    SettingsResolver,
    StateService,
    UnsavedGuard,
    UploadResolver,
    UploadsResolver,
    UserResolver,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AppInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
