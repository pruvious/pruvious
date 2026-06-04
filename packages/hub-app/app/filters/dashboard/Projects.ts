import { __, addFilter } from '#pruvious/app'

addFilter('dashboard:collections:index:footer:buttons', (components, { collection }) => {
  if (collection.name === 'Projects') {
    components.push(defineAsyncComponent(() => import('../../components/Pruvious/Dashboard/ScaffoldButton.vue')))
  }
  return components
})

addFilter('dashboard:collections:index:new-button', (button, { collection }) => {
  if (collection.name === 'Projects') {
    return {
      ...button,
      label: __('pruvious-dashboard', 'Add existing'),
      icon: 'tabler:folder-plus',
    }
  }
  return button
})
