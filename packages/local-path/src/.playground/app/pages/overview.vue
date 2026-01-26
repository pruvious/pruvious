<template>
  <PruviousDashboardPage>
    <input v-model="dir" placeholder="Enter directory to scan" type="text" />
    <pre v-if="status === 'success'">{{ data }}</pre>
    <pre v-else-if="status === 'error'">{{ (error?.data as PruviousFetchError).message }}</pre>
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import { $pfetch, __, type PruviousFetchError } from '#pruvious/app'
import { dashboardBasePath, dashboardMiddleware } from '#pruvious/dashboard'

definePageMeta({
  path: dashboardBasePath + 'overview',
  middleware: [(to) => dashboardMiddleware(to, 'default'), (to) => dashboardMiddleware(to, 'auth-guard')],
})

useHead({
  title: __('pruvious-dashboard', 'Overview'),
})

const dir = ref('')
const { data, error, status } = await useAsyncData(
  'test',
  () => $pfetch('/api/local-path', { query: { dir: dir.value } }),
  { watch: [dir] },
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
