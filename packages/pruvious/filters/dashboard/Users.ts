import { addFilter } from '#pruvious/client'

/**
 * Adds a button in the edit collection page that triggers a logout action across all active user sessions.
 */
addFilter('dashboard:collections:edit:footer:buttons', (components, { collection }) => {
  if (collection.name === 'Users') {
    components.push(defineAsyncComponent(() => import('../../components/Pruvious/Dashboard/LogoutUserButton.vue')))
  }

  return components
})
