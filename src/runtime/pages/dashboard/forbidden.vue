<template>
  <div class="scrollbar-thin flex h-screen overflow-y-auto p-8 ph:p-4">
    <div class="m-auto flex w-full max-w-sm flex-col items-center gap-4">
      <p class="text-sm text-gray-500">
        {{ __('pruvious-dashboard', "You don't have permission to access this page.") }}
      </p>

      <NuxtLink :to="`/${runtimeConfig.public.pruvious.dashboardPrefix}`" class="button button-white">
        {{ __('pruvious-dashboard', 'Go to dashboard') }}
      </NuxtLink>
    </div>
  </div>

  <PruviousGlobals />
</template>

<script lang="ts" setup>
import { useRuntimeConfig } from '#imports'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import '../../assets/style.css'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'

const runtimeConfig = useRuntimeConfig()

const PruviousGlobals = dashboardMiscComponent.Globals()

await loadTranslatableStrings()
</script>

<style>
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(../../assets/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
    U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Roboto';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url(../../assets/KFOkCnqEu92Fr1Mu51xIIzIXKMny.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
    U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url(../../assets/KFOlCnqEu92Fr1MmEU9fBBc4AMP6lQ.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
    U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Roboto';
  font-style: italic;
  font-weight: 500;
  font-display: swap;
  src: url(../../assets/KFOjCnqEu92Fr1Mu51S7ACc6CsTYl4BO.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
    U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
</style>
