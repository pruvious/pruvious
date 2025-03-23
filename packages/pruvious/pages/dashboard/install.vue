<template>
  <NuxtLayout name="pruvious-dashboard-auth-layout">
    <template #header>
      <PruviousDashboardAuthLayoutLogo />
    </template>

    <PUICard>
      <form @submit.prevent="onSubmit()">
        <PUIField>
          <PUIProse>
            <p class="pui-muted">{{ __('pruvious-dashboard', 'installWelcomeMessage') }}</p>
          </PUIProse>
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="firstName">{{ __('pruvious-dashboard', 'First name') }}</label>
          </PUIFieldLabel>
          <PUIInput v-model="body.firstName" autocomplete="given-name" autofocus id="firstName" name="firstName" />
          <PUIFieldMessage v-if="errors.firstName" error>{{ errors.firstName }}</PUIFieldMessage>
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="lastName">{{ __('pruvious-dashboard', 'Last name') }}</label>
          </PUIFieldLabel>
          <PUIInput v-model="body.lastName" autocomplete="family-name" id="lastName" name="lastName" />
          <PUIFieldMessage v-if="errors.lastName" error>{{ errors.lastName }}</PUIFieldMessage>
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="email">{{ __('pruvious-dashboard', 'Email') }}</label>
          </PUIFieldLabel>
          <PUIInput v-model="body.email" autocomplete="email" id="email" name="email" />
          <PUIFieldMessage v-if="errors.email" error>{{ errors.email }}</PUIFieldMessage>
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="password">{{ __('pruvious-dashboard', 'Password') }}</label>
          </PUIFieldLabel>
          <PUIInput
            v-model="body.password"
            :type="isPasswordVisible ? 'text' : 'password'"
            autocomplete="new-password"
            id="password"
            name="password"
          >
            <template #suffix>
              <PUIButton
                :title="
                  isPasswordVisible
                    ? __('pruvious-dashboard', 'Hide password')
                    : __('pruvious-dashboard', 'Show password')
                "
                :variant="isPasswordVisible ? 'accent' : 'ghost'"
                @click="isPasswordVisible = !isPasswordVisible"
                tabindex="-1"
              >
                <Icon v-if="isPasswordVisible" height="1.125em" mode="svg" name="tabler:eye" width="1.125em" />
                <Icon v-else height="1.125em" mode="svg" name="tabler:eye-off" width="1.125em" />
              </PUIButton>
            </template>
          </PUIInput>
          <PUIFieldMessage v-if="errors.password" error>{{ errors.password }}</PUIFieldMessage>
        </PUIField>

        <PUIField>
          <PUIButton type="submit" class="pui-w-full">{{ __('pruvious-dashboard', 'Create account') }}</PUIButton>
        </PUIField>
      </form>
    </PUICard>
  </NuxtLayout>
</template>

<script lang="ts" setup>
import {
  __,
  dashboardBasePath,
  pruviousDashboardPost,
  refreshPruviousDashboardState,
  refreshPruviousState,
  storeAuthToken,
  usePruvious,
} from '#pruvious/client'
import { lockAndLoad } from '@pruvious/utils'

definePageMeta({
  path: dashboardBasePath + 'install',
  middleware: [
    'pruvious-dashboard',
    'pruvious-dashboard-guest-guard',
    () => {
      if (usePruvious().value?.installed) {
        return navigateTo(dashboardBasePath + 'login', { replace: true })
      }
    },
  ],
})

useHead({
  title: __('pruvious-dashboard', 'Installation'),
})

const body = ref({ firstName: '', lastName: '', email: '', password: '' })
const errors = ref<Record<string, string>>({})
const isSubmitting = ref(false)
const isPasswordVisible = ref(false)

const onSubmit = lockAndLoad(isSubmitting, async () => {
  const { success, data } = await pruviousDashboardPost('pruvious/install', { body, inputErrors: errors })

  if (success) {
    storeAuthToken(data.token)
    await refreshPruviousState(true)
    await refreshPruviousDashboardState(true)
    await navigateTo(dashboardBasePath + 'overview')
  }
})
</script>
