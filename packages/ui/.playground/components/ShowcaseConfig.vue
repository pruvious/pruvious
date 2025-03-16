<template>
  <PUIField>
    <PUIFieldLabel>
      <label for="component">Component</label>
    </PUIFieldLabel>
    <PUISelect
      :choices="[
        { label: 'Alert', value: '/alert' },
        { label: 'Badge', value: '/badge' },
        { label: 'Bubble', value: '/bubble' },
        { label: 'Button', value: '/button' },
        { label: 'Button group', value: '/button-group' },
        { label: 'Card', value: '/card' },
        { label: 'Checkbox', value: '/checkbox' },
        { label: 'Code', value: '/code' },
        { label: 'Color mode', value: '/color-mode' },
        { label: 'Context menu', value: '/context-menu' },
        { label: 'Dialog', value: '/dialog' },
        { label: 'Dropdown', value: '/dropdown' },
        { label: 'Field', value: '/field' },
        { label: 'Field label', value: '/field-label' },
        { label: 'Field message', value: '/field-message' },
        { label: 'Icon group', value: '/icon-group' },
        { label: 'Input', value: '/input' },
        { label: 'Number', value: '/number' },
        { label: 'Pagination', value: '/pagination' },
        { label: 'Popup', value: '/popup' },
        { label: 'Prose', value: '/prose' },
        { label: 'Select', value: '/select' },
        { label: 'Structure', value: '/structure' },
        { label: 'Switch', value: '/switch' },
        { label: 'Table', value: '/table' },
        { label: 'Tabs', value: '/tabs' },
        { label: 'Tooltip', value: '/tooltip' },
        { label: 'Toast', value: '/toast' },
        { label: 'Tree', value: '/tree' },
        { label: 'Vertical menu', value: '/vertical-menu' },
      ]"
      :modelValue="$route.path"
      @update:modelValue="navigateTo($event?.toString())"
      id="component"
    />
  </PUIField>

  <PUIField>
    <PUIFieldLabel>
      <label for="color-mode">Color mode</label>
    </PUIFieldLabel>
    <PUIColorMode :size="-2" id="color-mode" />
  </PUIField>

  <slot />
</template>
