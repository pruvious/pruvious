import { addBuildFilter } from 'pruvious/kit'

addBuildFilter('permissions', (permissions) => {
  if (!permissions.includes('hub:deploy:execute')) {
    permissions.push('hub:deploy:execute')
  }
  return permissions
})
