<template>
  <PruviousDashboardPage>
    <template #header>
      <div class="p-header pui-row pui-justify-between">
        <PruviousDashboardMediaBreadcrumbs v-model:state="state" @update:state="updateRouteFromState($event)" />
      </div>
    </template>

    <PruviousDashboardMediaLibrary
      v-model:state="state"
      :queryString="queryString"
      @update:state="updateRouteFromState($event)"
    />

    <template #footer>
      <PruviousDashboardMediaFooter
        v-model:state="state"
        :defaultParams="defaultParams"
        :isDirty="isDirty"
        @update:state="updateRouteFromState($event)"
      />
    </template>
  </PruviousDashboardPage>
</template>

<script lang="ts" setup>
import {
  __,
  dashboardBasePath,
  dashboardMiddleware,
  defineDashboardPage,
  getDefaultDashboardMediaLibraryState,
  useSelectQueryBuilderParams,
  type DashboardMediaLibraryState,
} from '#pruvious/client'
import { tryNormalizePath } from '@pruvious/storage'
import { puiHTMLInit } from '@pruvious/ui/pui/html'
import { puiTooltipInit } from '@pruvious/ui/pui/tooltip'
import { deepClone, isArray } from '@pruvious/utils'

defineDashboardPage({
  path: 'media',
  label: ({ __ }) => __('pruvious-dashboard', 'Media'),
  icon: 'library-photo',
  group: 'general',
  order: 3,
})

definePageMeta({
  path: dashboardBasePath + 'media/:catchAll(.*)?',
  middleware: [
    (to) => dashboardMiddleware(to, 'default'),
    (to) => dashboardMiddleware(to, 'auth-guard'),
    (to) =>
      dashboardMiddleware(to, ({ __, hasPermission, puiQueueToast }) => {
        if (!hasPermission('collection:uploads:read')) {
          puiQueueToast(__('pruvious-dashboard', 'Redirected'), {
            type: 'error',
            description: __('pruvious-dashboard', 'You do not have permission to access the page `$page`', {
              page: to.path,
            }),
            showAfterRouteChange: true,
          })
          return navigateTo(dashboardBasePath + 'overview')
        }
      }),
  ],
})

useHead({
  title: __('pruvious-dashboard', 'Media'),
})

await puiHTMLInit()
puiTooltipInit()

const route = useRoute()
const state = ref<DashboardMediaLibraryState>(getDefaultDashboardMediaLibraryState())
const defaultOrderBy = deepClone(state.value.orderBy)
const defaultParams: Pick<DashboardMediaLibraryState, 'where' | 'orderBy' | 'page' | 'perPage'> = {
  where: [],
  orderBy: defaultOrderBy,
  page: 1,
  perPage: 5, // @todo make dynamic based on screen size (update from resize watcher but init here also)
}
const queryString = ref('')
const { params, push, isDirty } = useSelectQueryBuilderParams({
  callback: async ({ queryString: _queryString, params }) => {
    state.value.where = (params.where as any) ?? []
    state.value.orderBy = (params.orderBy as any) ?? defaultOrderBy
    const { page, perPage } = getPagedFromParams(params)
    state.value.page = page
    state.value.perPage = perPage
    queryString.value = _queryString
  },
  defaultParams,
  checkDirty: ['where', 'orderBy'],
})

watch(
  () => route.params.catchAll,
  () => {
    state.value.currentDirectory = getDirectoryFromRoute()
  },
  { immediate: true },
)

function getDirectoryFromRoute() {
  const subpath = isArray(route.params.catchAll) ? route.params.catchAll.join('/') : route.params.catchAll || '/'
  return tryNormalizePath(subpath)
}

function getPagedFromParams(params: Record<string, any>) {
  const limit = (params as any).limit ?? defaultParams.perPage
  const offset = (params as any).offset ?? 0
  return { perPage: limit, page: Math.floor(offset / limit) + 1 }
}

async function updateRouteFromState(newState: DashboardMediaLibraryState) {
  const routeDirectory = getDirectoryFromRoute()
  if (routeDirectory !== newState.currentDirectory) {
    await navigateTo({
      path: dashboardBasePath + 'media' + (newState.currentDirectory === '/' ? '' : newState.currentDirectory),
      query: route.query,
    })
  } else {
    params.value.where = newState.where
    params.value.orderBy = newState.orderBy
    params.value.page = newState.page
    push()
  }
}
</script>

<style scoped>
:deep(.p-page-footer) {
  container-type: inline-size;
}
</style>
