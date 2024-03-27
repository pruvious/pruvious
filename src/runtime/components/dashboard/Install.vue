<template>
  <div class="scrollbar-thin flex h-screen overflow-y-auto p-8 ph:p-4">
    <div class="m-auto w-full max-w-sm">
      <LoginLogo />

      <form @submit.prevent="createAccount()" class="flex flex-col items-start gap-4 border bg-white p-6">
        <p class="text-sm text-gray-400">
          {{ __('pruvious-dashboard', 'installWelcomeMessage') }}
        </p>

        <component
          v-model="firstName"
          :errors="errors"
          :is="TextField"
          :options="{
            label: __('pruvious-dashboard', 'First name'),
            name: 'first-name',
            autocomplete: 'given-name',
          }"
          fieldKey="first-name"
        />

        <component
          v-model="lastName"
          :errors="errors"
          :is="TextField"
          :options="{
            label: __('pruvious-dashboard', 'Last name'),
            name: 'last-name',
            autocomplete: 'family-name',
          }"
          fieldKey="last-name"
        />

        <component
          v-model="email"
          :errors="errors"
          :is="TextField"
          :options="{
            label: __('pruvious-dashboard', 'Email'),
            name: 'username',
            type: 'email',
            autocomplete: 'email',
            required: true,
          }"
          fieldKey="email"
        />

        <component
          v-model="password"
          :errors="errors"
          :is="TextField"
          :options="{
            label: __('pruvious-dashboard', 'Password'),
            name: 'new-password',
            type: 'password',
            autocomplete: 'new-password',
            required: true,
          }"
          fieldKey="password"
        />
        <!-- @todo password strength -->

        <button type="submit" class="button w-full">
          <span>{{ __('pruvious-dashboard', 'Create account') }}</span>
        </button>
      </form>

      <PruviousLegalLinks class="mt-4" />
    </div>
  </div>

  <PruviousGlobals />
</template>

<script lang="ts" setup>
import { ref } from '#imports'
import { dashboardLoginLogoComponent, dashboardMiscComponent, textFieldComponent } from '#pruvious/dashboard'
import '../../assets/style.css'
import { navigateToPruviousDashboardPath, usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { setToken } from '../../composables/token'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousFetch } from '../../utils/fetch'
import { isObject } from '../../utils/object'

const dashboard = usePruviousDashboard()

const firstName = ref<string>('')
const lastName = ref<string>('')
const email = ref<string>('')
const password = ref<string>('')
const errors = ref<Record<string, string>>({})

const LoginLogo = dashboardLoginLogoComponent()
const PruviousGlobals = dashboardMiscComponent.Globals()
const PruviousLegalLinks = dashboardMiscComponent.LegalLinks()
const TextField = textFieldComponent()

await loadTranslatableStrings('pruvious-dashboard')

async function createAccount() {
  const installResponse = await pruviousFetch('install.post', { body: { firstName, lastName, email, password } })

  if (installResponse.success) {
    setToken(installResponse.data)
    dashboard.value.installed = true
    dashboard.value.refresh = true
    navigateToPruviousDashboardPath('/')
  } else if (isObject(installResponse.error)) {
    errors.value = installResponse.error
  }
}
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
