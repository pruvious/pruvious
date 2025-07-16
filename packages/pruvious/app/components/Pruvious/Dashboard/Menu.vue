<template>
  <div class="p-menu">
    <PruviousDashboardMenuGeneral key="general" />
    <PruviousDashboardMenuCollections key="collections" />
    <PruviousDashboardMenuManagement key="management" />
    <PruviousDashboardMenuUtilities key="utilities" />
  </div>
</template>

<style scoped>
.p-menu > * + * {
  margin-top: 1.5em;
}
</style>
