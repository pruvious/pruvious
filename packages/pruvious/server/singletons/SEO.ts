import { defineSingleton, resolvePruviousComponent } from '#pruvious/server'

export default defineSingleton({
  translatable: true,
  syncedFields: [],
  fields: {},
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'SEO'),
    layout: resolvePruviousComponent('>/components/Pruvious/Dashboard/Redirects.vue'), // @todo this is temporary
    menu: { group: 'utilities', order: 30, icon: 'eye-search' },
  },
  copyTranslation: ({ source }) => source,
})
