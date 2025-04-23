import { defineSingleton, resolvePruviousComponent } from '#pruvious/server'

export default defineSingleton({
  fields: {},
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Redirects'),
    icon: 'arrow-bounce',
    dashboardLayout: resolvePruviousComponent('>/components/Pruvious/Dashboard/Redirects.vue'),
    menu: { group: 'utilities', order: 40 },
  },
})
