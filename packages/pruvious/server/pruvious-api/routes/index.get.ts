import { resolveRouteEventHandler } from './[...].get'

export default defineEventHandler(async (event) => {
  return resolveRouteEventHandler(event, '')
})
