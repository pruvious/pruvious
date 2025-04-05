<template>
  <Showcase>
    <form @submit.prevent="onSubmit()" class="pui-fields" :style="{ '--pui-size': state.size }">
      <PUIField>
        <PUIFieldLabel>
          <label for="email">Email</label>
        </PUIFieldLabel>
        <PUIInput v-model="body.email" :disabled="disabled" :error="state.hasErrors" id="email" name="email" />
        <PUIFieldMessage v-if="state.hasErrors" error>
          <p>Error message</p>
        </PUIFieldMessage>
      </PUIField>

      <PUIField>
        <PUIFieldLabel>
          <label for="password">Password</label>
          <button tabindex="1" type="button">Forgot password?</button>
        </PUIFieldLabel>
        <PUIInput
          v-model="body.password"
          :disabled="disabled"
          :error="state.hasErrors"
          :type="isPasswordVisible ? 'text' : 'password'"
          id="password"
          name="password"
        >
          <template #suffix>
            <PUIButton
              v-pui-tooltip.watch="isPasswordVisible ? 'Hide password' : 'Show password'"
              :variant="isPasswordVisible ? 'accent' : 'ghost'"
              @click="isPasswordVisible = !isPasswordVisible"
              tabindex="-1"
            >
              <Icon v-if="isPasswordVisible" height="1.125em" mode="svg" name="tabler:eye" width="1.125em" />
              <Icon v-else height="1.125em" mode="svg" name="tabler:eye-off" width="1.125em" />
            </PUIButton>
          </template>
        </PUIInput>
        <PUIFieldMessage v-if="state.hasErrors" error>
          <p>Error message</p>
        </PUIFieldMessage>
      </PUIField>

      <PUIField>
        <PUICheckbox v-model="body.remember" :disabled="disabled" :error="state.hasErrors" name="remember">
          Remember me
        </PUICheckbox>
        <PUIFieldMessage v-if="state.hasErrors" error>
          <p>Error message</p>
        </PUIFieldMessage>
      </PUIField>

      <PUIField>
        <PUIButton :disabled="disabled" type="submit" class="button">Sign in</PUIButton>
      </PUIField>
    </form>

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />
        <ShowcaseHasErrors />
        <ShowcaseDisabled v-model="disabled" />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import { puiToast } from '../../pui/toast'

const state = useShowcase()
const disabled = ref(false)
const isPasswordVisible = ref(false)
const body = ref({ email: '', password: '', remember: false })

function onSubmit() {
  puiToast('Form data', {
    description: '```\n' + JSON.stringify(body.value, null, 2) + '\n```',
  })
}
</script>

<style scoped>
.pui-fields {
  width: 20rem;
  max-width: 100%;
}

.button {
  width: 100%;
}
</style>
