import { addRouteMiddleware } from '#imports'
import { fetchDirectories } from '../../../composables/dashboard/media'
import { useUser } from '../../../composables/user'
import { getCapabilities } from '../../../utils/users'

export default addRouteMiddleware('pruvious-fetch-directories', async () => {
  const user = useUser()
  const userCapabilities = getCapabilities(user.value)

  if (user.value?.isAdmin || userCapabilities['collection-uploads-read-many']) {
    await fetchDirectories()
  }
})
