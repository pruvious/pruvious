<template>
  <PUIPopup
    v-if="loginPopup && route.path !== dashboardBasePath + 'login' && route.path !== dashboardBasePath + 'logout'"
    :size="-1"
    ref="popup"
    width="21rem"
  >
    <PruviousDashboardLogin>
      <template #header>
        <PUIField>
          <PUIAlert :title="__('pruvious-dashboard', 'Session expired')">
            <template #icon>
              <Icon mode="svg" name="tabler:info-circle" />
            </template>
            <p>
              {{
                __(
                  'pruvious-dashboard',
                  'Your session has timed out due to inactivity. Please log in again to continue.',
                )
              }}
            </p>
          </PUIAlert>
        </PUIField>
      </template>

      <template #footer>
        <PUIField class="pui-field-narrow">
          <PUIButton
            @click="
              () => {
                loginPopup = false
                navigateTo(dashboardBasePath + 'logout')
              }
            "
            variant="outline"
            class="pui-w-full"
          >
            {{ __('pruvious-dashboard', 'Leave') }}
          </PUIButton>
        </PUIField>
      </template>
    </PruviousDashboardLogin>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { dashboardBasePath, useLoginPopup } from '#pruvious/dashboard'

const loginPopup = useLoginPopup()
const route = useRoute()
</script>
