import { defineCollection } from '#pruvious'
import { standardUsersCollectionDefinition } from '#pruvious/standard'

export default defineCollection({
  ...standardUsersCollectionDefinition,
  cacheQueries: 0,
})
