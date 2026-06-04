<template>
  <PUIPopup :size="-1" @close="$emit('close', $event)" ref="popup" width="32rem">
    <template #header>
      <div class="pui-row">
        <span class="pui-medium">{{ __('pruvious-dashboard', 'Scaffold new project') }}</span>
        <PUIButton
          :size="-2"
          :title="__('pruvious-dashboard', 'Close')"
          @click="$emit('close', popup!.close)"
          variant="ghost"
          class="pui-ml-auto"
        >
          <Icon mode="svg" name="tabler:x" />
        </PUIButton>
      </div>
    </template>

    <PUIField>
      <PUIFieldLabel :required="true">
        <label :for="nameId">{{ __('pruvious-dashboard', 'Project name') }}</label>
      </PUIFieldLabel>
      <PUIInput
        v-model="form.name"
        :error="!!fieldErrors.name"
        :id="nameId"
        :placeholder="'my-pruvious-app'"
        autocomplete="off"
        autofocus
      />
      <PruviousFieldMessage :error="fieldErrors.name" :options="nameOptions" name="name" />
    </PUIField>

    <PUIField>
      <PUIFieldLabel :required="true">
        <label>{{ __('pruvious-dashboard', 'Parent directory') }}</label>
      </PUIFieldLabel>
      <PruviousDashboardLocalPathSelector
        v-model="form.parentDir"
        :canCreateDirectory="true"
        :initialDirectory="'~'"
        :selectLabel="__('pruvious-dashboard', 'Select parent directory')"
        selectionType="directory"
      />
      <PruviousFieldMessage :error="fieldErrors.parentDir" :options="parentDirOptions" name="parentDir" />
    </PUIField>

    <PUIField>
      <PUIFieldLabel>
        <label :for="languageId">{{ __('pruvious-dashboard', 'Language code') }}</label>
      </PUIFieldLabel>
      <PUIInput
        v-model="form.languageCode"
        :error="!!fieldErrors.languageCode"
        :id="languageId"
        :placeholder="'en'"
        autocomplete="off"
      />
      <PruviousFieldMessage :error="fieldErrors.languageCode" :options="languageOptions" name="languageCode" />
    </PUIField>

    <PUIField>
      <PUIFieldLabel>
        <label :for="pmId">{{ __('pruvious-dashboard', 'Package manager') }}</label>
      </PUIFieldLabel>
      <PUISelect v-model="form.packageManager" :choices="packageManagerChoices" :id="pmId" />
    </PUIField>

    <PUIField>
      <PUIFieldLabel>
        <label :for="specId">{{ __('pruvious-dashboard', 'Pruvious version or dist-tag') }}</label>
      </PUIFieldLabel>
      <PUIInput
        v-model="form.pruviousSpec"
        :id="specId"
        :placeholder="'alpha'"
        :spellcheck="false"
        autocomplete="off"
      />
    </PUIField>

    <PUIField>
      <PUISwitch v-model="form.install">
        {{ __('pruvious-dashboard', 'Install dependencies after scaffolding') }}
      </PUISwitch>
    </PUIField>

    <PUIField>
      <PUISwitch v-model="form.force">
        {{ __('pruvious-dashboard', 'Overwrite if target exists') }}
      </PUISwitch>
    </PUIField>

    <template #footer>
      <div class="pui-row pui-justify-between">
        <PUIButton @click="$emit('close', popup!.close)" variant="outline">
          {{ __('pruvious-dashboard', 'Cancel') }}
        </PUIButton>
        <PUIButton :disabled="submitting" @click="submit()" variant="primary">
          <Icon mode="svg" name="tabler:wand" />
          <span>{{ submitting ? __('pruvious-dashboard', 'Queued') : __('pruvious-dashboard', 'Scaffold') }}</span>
        </PUIButton>
      </div>
    </template>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { $pfetchDashboard, dashboardBasePath } from '#pruvious/dashboard'

defineEmits<{ close: [close: () => Promise<void>] }>()

const popup = useTemplateRef('popup')
const nameId = useId()
const languageId = useId()
const pmId = useId()
const specId = useId()

const submitting = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const form = reactive({
  name: 'my-pruvious-app',
  parentDir: '',
  languageCode: 'en',
  packageManager: 'pnpm' as 'npm' | 'pnpm',
  pruviousSpec: 'alpha',
  install: true,
  force: false,
})

const packageManagerChoices = [
  { label: 'npm', value: 'npm' },
  { label: 'pnpm', value: 'pnpm' },
]

const nameOptions = {
  ui: {
    description: __(
      'pruvious-dashboard',
      "Used as the npm `name` in the new project's `package.json` and as the dashboard label.",
    ),
  },
} as any

const parentDirOptions = {
  ui: {
    description: __(
      'pruvious-dashboard',
      'Absolute path on this hub machine. The project is created in `<parent>/<slugified-name>`.',
    ),
  },
} as any

const languageOptions = {
  ui: {
    description: __('pruvious-dashboard', 'BCP-47, e.g. `en`, `de-AT`.'),
  },
} as any

async function submit() {
  if (submitting.value) {
    return
  }
  error.value = null
  fieldErrors.value = {}
  submitting.value = true
  try {
    const { scaffoldId } = (await $pfetchDashboard('/api/hub/scaffolds', {
      method: 'POST',
      body: { ...form },
    })) as { scaffoldId: number }
    await navigateTo(`${dashboardBasePath}collections/scaffolds/${scaffoldId}`)
  } catch (err: any) {
    error.value = err?.data?.statusMessage ?? err?.message ?? __('pruvious-dashboard', 'Failed to start scaffold')
    submitting.value = false
  }
}
</script>

<style scoped>
.p-scaffold-popup-error {
  margin: 0;
  padding: 0.625rem 0.75rem;
  border-width: 1px;
  border-color: hsl(var(--pui-destructive));
  border-radius: var(--pui-radius);
  background-color: hsl(var(--pui-destructive) / 0.1);
  color: hsl(var(--pui-destructive));
  font-size: 0.8125rem;
  white-space: pre-wrap;
}
</style>
