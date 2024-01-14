import { defineCollection } from '#pruvious'
import { pageLikeCollection } from '#pruvious/standard'

export default defineCollection(
  pageLikeCollection({
    name: 'posts',
    pathPrefix: 'posts',
  }),
)
