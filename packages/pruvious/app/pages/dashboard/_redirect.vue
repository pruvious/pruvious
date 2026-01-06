<template></template>

<script lang="ts" setup>
import { dashboardBasePath } from '#pruvious/app'

const route = useRoute()

onBeforeMount(() => navigateTo(route.query.to ? String(route.query.to) : dashboardBasePath, { replace: true }))
</script>
