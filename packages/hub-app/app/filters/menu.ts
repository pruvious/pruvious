import { __, addFilter } from '#pruvious/app'

addFilter('dashboard:menu:general', (menu) =>
  menu.filter(({ to }) => to !== 'collections/routes' && to !== 'media' && to !== 'singletons/seo'),
)

addFilter('dashboard:menu:management:title', () => __('pruvious-dashboard', 'Workspace'))
