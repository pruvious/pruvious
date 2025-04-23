import { addFilter } from '#pruvious/server'

addFilter('blocks:groups', (groups) => [
  ...groups,
  { name: 'test', label: ({ __ }) => __('pruvious-dashboard', 'Group test') },
])

addFilter('blocks:tags', (tags) => [...tags, { name: 'test', label: ({ __ }) => __('pruvious-dashboard', 'Tag test') }])
