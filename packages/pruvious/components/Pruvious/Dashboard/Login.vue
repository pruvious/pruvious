<template>
  <form @submit.prevent="onSubmit()">
    <slot name="header" />

    <PUIField>
      <PUIFieldLabel>
        <label for="email">{{ __('pruvious-dashboard', 'Email') }}</label>
      </PUIFieldLabel>
      <PUIInput v-model="body.email" autocomplete="email" autofocus id="email" name="email" />
      <PUIFieldMessage v-if="errors.email" error>{{ errors.email }}</PUIFieldMessage>
    </PUIField>

    <PUIField>
      <PUIFieldLabel>
        <label for="password">{{ __('pruvious-dashboard', 'Password') }}</label>
        <button tabindex="1" type="button">{{ __('pruvious-dashboard', 'Forgot password?') }}</button>
      </PUIFieldLabel>
      <PUIInput
        v-model="body.password"
        :type="isPasswordVisible ? 'text' : 'password'"
        autocomplete="current-password"
        id="password"
        name="password"
      >
        <template #suffix>
          <PUIButton
            :title="
              isPasswordVisible ? __('pruvious-dashboard', 'Hide password') : __('pruvious-dashboard', 'Show password')
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
      <PUICheckbox v-model="body.remember">{{ __('pruvious-dashboard', 'Remember me') }}</PUICheckbox>
    </PUIField>

    <PUIField>
      <PUIButton type="submit" class="pui-w-full">{{ __('pruvious-dashboard', 'Sign in') }}</PUIButton>
    </PUIField>

    <slot name="footer" />
  </form>
</template>

<script lang="ts" setup>
import {
  __,
  pruviousDashboardPost,
  refreshPruviousDashboardState,
  storeAuthToken,
  usePruviousLoginPopup,
} from '#pruvious/client'
import { lockAndLoad } from '@pruvious/utils'

const props = defineProps({
  redirect: {
    type: String,
  },
})

const body = ref({ email: '', password: '', remember: false })
const errors = ref<Record<string, string>>({})
const isSubmitting = ref(false)
const isPasswordVisible = ref(false)
const loginPopup = usePruviousLoginPopup()

const onSubmit = lockAndLoad(isSubmitting, async () => {
  const { success, data } = await pruviousDashboardPost('auth/login', { body, inputErrors: errors })

  if (success) {
    loginPopup.value = false
    storeAuthToken(data.token)
    await refreshPruviousDashboardState(true)

    if (props.redirect) {
      await navigateTo(props.redirect)
    }
  }
})
</script>
