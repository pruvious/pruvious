<script lang="ts" setup>
import { navigateToPruviousDashboardPath } from '../../composables/dashboard/dashboard'
import { removeToken } from '../../composables/token'
import { pruviousFetch } from '../../utils/fetch'

await pruviousFetch('logout.post')
removeToken()
await navigateToPruviousDashboardPath('/')
</script>
