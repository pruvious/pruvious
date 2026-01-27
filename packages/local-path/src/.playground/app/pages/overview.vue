<template>
  <PruviousDashboardPage>
    <input v-model="dir" placeholder="Enter directory to scan" type="text" />
    <pre>{{ data }}</pre>
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import { $pfetch, __, type PruviousFetchError } from '#pruvious/app'
import { dashboardBasePath, dashboardMiddleware } from '#pruvious/dashboard'
import { computedAsync } from '@vueuse/core'

definePageMeta({
  path: dashboardBasePath + 'overview',
  middleware: [(to) => dashboardMiddleware(to, 'default'), (to) => dashboardMiddleware(to, 'auth-guard')],
})

useHead({
  title: __('pruvious-dashboard', 'Overview'),
})

const dir = ref('')
const data = computedAsync(() =>
  $pfetch('/api/local-path', { query: { dir: dir.value } }).catch((error: PruviousFetchError) => error.message),
)
</script>

<style scoped>
input {
  width: 100%;
  padding: 0.5rem;
  background-color: hsl(var(--pui-card));
  border: 1px solid hsl(var(--pui-input));
  border-radius: var(--pui-radius);
  outline: none;
  color: hsl(var(--pui-foreground));
  font-size: calc(1rem + var(--pui-size) * 0.125rem);
}

input::placeholder {
  color: hsl(var(--pui-muted-foreground));
}

pre {
  margin-top: 0.75rem;
  overflow-x: auto;
}
</style>
