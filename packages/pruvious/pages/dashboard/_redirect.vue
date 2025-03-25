<template></template>

<script lang="ts" setup>
const route = useRoute()
onBeforeMount(() => navigateTo(String(route.query.to) || '/', { replace: true }))
</script>
