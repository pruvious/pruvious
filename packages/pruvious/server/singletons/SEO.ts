import { defineSingleton, languages, resolvePruviousComponent } from '#pruvious/server'

export default defineSingleton({
  translatable: languages.length > 1,
  syncedFields: [],
  fields: {},
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'SEO'),
    dashboardLayout: resolvePruviousComponent('>/components/Pruvious/Dashboard/Redirects.vue'), // @todo this is temporary
    menu: { group: 'utilities', order: 30, icon: 'eye-search' },
  },
  copyTranslation: ({ source }) => source,
})
