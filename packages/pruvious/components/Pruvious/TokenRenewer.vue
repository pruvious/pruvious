<template></template>

<script lang="ts" setup>
import {
  getAuthTokenExpiresIn,
  getAuthTokenPayload,
  pruviousPost,
  refreshAuthState,
  storeAuthToken,
  useAuth,
  usePruviousLoginPopup,
  type PruviousFetchResponse,
} from '#pruvious/client'
import { isNumber, isString } from '@pruvious/utils'
import { useEventListener, useTimeoutFn, type Stoppable } from '@vueuse/core'

const props = defineProps({
  /**
   * Controls when the token should be renewed.
   * Accepts either seconds (as number) or percentage (as string) of the token's total lifetime.
   *
   * Default behavior: Token renewes when remaining lifetime drops below 25% of total lifetime.
   *
   * @default '25%'
   *
   * @example
   * ```ts
   * 1800  // 30 minutes before the token expires
   * '50%' // 50% of the token's total lifetime
   * ```
   */
  trigger: {
    type: [Number, String],
    default: '25%',
    validator: (value) => (isNumber(value) && value > 0) || (isString(value) && !!value.match(/^(100|[1-9][0-9]?)%$/)),
  },

  /**
   * A custom fetcher function to use for renewing the token.
   *
   * @default pruviousPost
   */
  fetcher: {
    type: Function as PropType<(route: any, options: any) => Promise<PruviousFetchResponse<any>>>,
    default: pruviousPost,
  },
})

const auth = useAuth()
const loginPopup = usePruviousLoginPopup()

let timeout: Stoppable<[]> | undefined

onMounted(() => {
  checkTrigger()
  useEventListener(window, 'focus', checkTrigger)
})

watch(() => auth.value.isLoggedIn, checkTrigger)

function checkTrigger() {
  timeout?.stop()

  const payload = getAuthTokenPayload()

  if (payload) {
    const expiresIn = getAuthTokenExpiresIn()! / 1000

    if (isNumber(props.trigger)) {
      if (expiresIn < props.trigger) {
        renewToken()
      } else {
        timeout = useTimeoutFn(checkTrigger, (expiresIn - props.trigger) * 1000)
      }
    } else {
      const triggerPercentage = +props.trigger.slice(0, -1) / 100
      const tokenLifetime = payload.exp - payload.iat
      const trigger = tokenLifetime * triggerPercentage

      if (expiresIn < trigger) {
        renewToken()
      } else {
        timeout = useTimeoutFn(checkTrigger, (expiresIn - trigger) * 1000)
      }
    }
  }
}

async function renewToken() {
  if (document.hasFocus()) {
    const { success, data } = await props.fetcher('auth/renew-token', {})

    if (success) {
      storeAuthToken(data.token)
      loginPopup.value = false
    } else {
      await refreshAuthState(true)
    }

    checkTrigger()
  }
}

onUnmounted(() => {
  timeout?.stop()
})
</script>
