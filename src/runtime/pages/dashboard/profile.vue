<template>
  <PruviousBase>
    <div
      class="sticky top-0 z-[31] flex min-h-[6.25rem] items-center justify-between gap-8 bg-gray-50/75 p-8 backdrop-blur backdrop-filter"
    >
      <h1 class="truncate text-xl">
        {{ __('pruvious-dashboard', 'My profile') }}
      </h1>

      <div class="flex gap-2">
        <PruviousHistoryButtons :history="history" @redo="redo()" @undo="undo()" />

        <button
          v-pruvious-tooltip="__('pruvious-dashboard', 'Log out user from all active sessions')"
          @click="logoutOthers()"
          type="button"
          class="button button-white button-square"
        >
          <PruviousIconShieldLock />
        </button>

        <button @click="save()" type="button" class="button">
          <span v-if="history.isDirty.value" class="!absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-white"></span>
          <span>{{ __('pruvious-dashboard', 'Update') }}</span>
        </button>
      </div>
    </div>

    <div class="flex items-start gap-6 p-8 pb-0 pt-0">
      <PruviousFieldLayout
        v-if="collection.dashboard.fieldLayout.length"
        v-model:errors="errors"
        v-model:record="record"
        :canUpdate="true"
        :collectionRecord="record"
        :fieldLayout="[
          ['firstName', 'lastName'],
          'email',
          '<~runtime/components/misc/UserPasswordField.vue>',
          ['<~runtime/components/misc/DateFormatField.vue>', '<~runtime/components/misc/TimeFormatField.vue>'],
        ]"
        :fieldsDeclaration="fieldDeclaration"
        :history="history"
        :resolvedConditionalLogic="resolvedConditionalLogic"
        :stickyTopBorder="true"
        @update:record="onUpdate(!isEditingText())"
        class="mb-8"
      />

      <div
        v-if="!collection.dashboard.fieldLayout.length"
        class="mb-8 min-w-0 flex-1 rounded-md border bg-white p-4 text-sm text-gray-400"
      >
        <p>{{ __('pruvious-dashboard', 'No fields to display') }}</p>
      </div>
    </div>
  </PruviousBase>
</template>

<script lang="ts" setup>
import { ref, useHead } from '#imports'
import type { AuthUser } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { useEventListener } from '@vueuse/core'
import { debounce } from 'perfect-debounce'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { getHotkeyAction } from '../../composables/dashboard/hotkeys'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { watchUnsavedChanges } from '../../composables/dashboard/unsaved-changes'
import { setLanguage } from '../../composables/language'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { resolveConditionalLogic } from '../../utils/conditional-logic'
import { History } from '../../utils/dashboard/history'
import { blurActiveElement, isEditingText } from '../../utils/dom'
import { pruviousFetch } from '../../utils/fetch'
import { deepClone, deepMerge, isObject } from '../../utils/object'

await loadTranslatableStrings('pruvious-dashboard')

const dashboard = usePruviousDashboard()
const user = useUser()

dashboard.value.collection = 'users'

const collection = dashboard.value.collections.users
const errors = ref<Record<string, string>>({})
const resolvedConditionalLogic = ref<Record<string, boolean>>({})

const record = ref<Record<string, any>>(deepClone(user.value!))
const history = new History(record.value)
const fieldDeclaration: any = deepMerge(collection.fields, { email: { additional: { immutable: true } } })

const PruviousBase = dashboardMiscComponent.Base()
const PruviousFieldLayout = dashboardMiscComponent.FieldLayout()
const PruviousHistoryButtons = dashboardMiscComponent.HistoryButtons()

await resolve()
watchUnsavedChanges(history)

useHead({ title: __('pruvious-dashboard', 'My profile') })

useEventListener('keydown', async (event) => {
  const action = getHotkeyAction(event)

  if (action) {
    event.preventDefault()
    event.stopPropagation()

    if (action === 'save') {
      blurActiveElement()
      await save()
    } else if (action === 'undo') {
      undo()
    } else if (action === 'redo') {
      redo()
    }
  }
})

async function resolve() {
  resolvedConditionalLogic.value = await resolveConditionalLogic(record.value, fieldDeclaration)
}

const onUpdate = debounce((forceAddHistory: boolean = false) => {
  resolve()
  history.add(record.value, forceAddHistory)
}, 50)

function undo() {
  record.value = history.undo() ?? record.value
  errors.value = {}
  resolve()
}

function redo() {
  record.value = history.redo() ?? record.value
  errors.value = {}
  resolve()
}

async function save() {
  errors.value = {}

  const response = await pruviousFetch<AuthUser>('profile.patch', { method: 'patch', body: record.value })

  if (response.success) {
    record.value = response.data
    user.value = deepClone(response.data)
    setLanguage(user.value.dashboardLanguage!, { reloadTranslatableStrings: false })
    history.add(record.value)
    history.setInitialState(record.value)
    resolve()
    pruviousToasterShow({ message: __('pruvious-dashboard', 'Profile updated') })
  } else if (isObject(response.error)) {
    errors.value = response.error
    pruviousToasterShow({
      message: __('pruvious-dashboard', '$count $errors found', { count: Object.keys(response.error).length }),
      type: 'error',
    })
  }
}

async function logoutOthers() {
  const response = await pruviousFetch<number>('logout-others.post')

  if (response.success) {
    pruviousToasterShow({
      message: __('pruvious-dashboard', 'You have been logged out from all other sessions'),
    })
  }
}
</script>
