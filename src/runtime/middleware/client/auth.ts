import { defineNuxtRouteMiddleware } from '#imports'
import { useAuth } from '../../composables/auth'
import { getToken } from '../../composables/token'

export default defineNuxtRouteMiddleware(() => {
  if (import.meta.client) {
    const auth = useAuth()

    auth.value.userId = getToken()?.userId ?? null
    auth.value.isLoggedIn = !!auth.value.userId
  }
})
