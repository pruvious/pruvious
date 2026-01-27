import { addBuildFilter } from 'pruvious/kit'

addBuildFilter('standardRoutes', (routes) => [...routes, 'local-path'])
