import { addRouteMiddleware } from '#imports'
import { navigateToPruviousDashboardPath } from '../../../composables/dashboard/dashboard'
import { useMediaDirectories } from '../../../composables/dashboard/media'
import { listMediaDirectory } from '../../../utils/dashboard/media-directory'
import { parseMediaDirectoryName } from '../../../utils/uploads'

export default addRouteMiddleware('pruvious-uploads-directory-guard', async (to) => {
  const directory = parseMediaDirectoryName(to.params.catchAll as string)
  const mediaDirectories = useMediaDirectories()

  if (!listMediaDirectory(directory, mediaDirectories.value)) {
    return navigateToPruviousDashboardPath('/404', { replace: true }, { ...to, query: { from: to.fullPath } })
  }
})
