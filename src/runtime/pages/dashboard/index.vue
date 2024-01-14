<script lang="ts" setup>
import { definePageMeta } from '#imports'
import '../../middleware/client/dashboard/access-guard'
import '../../middleware/client/dashboard/before-all'
import '../../middleware/client/dashboard/fresh-guard'
import '../../middleware/client/dashboard/guest-guard'
import '../../middleware/client/dashboard/installed-guard'
import '../../middleware/client/dashboard/root-guard'

definePageMeta({ middleware: ['pruvious-dashboard-before-all'] })
</script>
